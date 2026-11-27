// 반응 선택 AI 판단 (명세 6.1, 2026-11-27) — Supabase Edge Function
//
// 앱이 보낸 짧은 글(지금 남은 반응·감정)이 여섯 반응 중 무엇에 가까운지 Claude 에게 묻는다.
// OpenRouter(openrouter.ai)를 거쳐 Claude 를 부른다 — 사용자가 가진 키가 OpenRouter 키라서.
// - API 키는 Supabase 비밀값(OPENROUTER_API_KEY)에만 둔다. 앱(브라우저)에는 절대 넣지 않는다.
// - 받은 글은 판단에만 쓰고 저장하거나 로그에 남기지 않는다.
// - 남용을 막으려고 글 길이(200자)와 같은 주소에서의 호출 수를 제한한다.
//
// 배포: Supabase 대시보드 → Edge Functions → classify-reaction → 코드(index.ts) 바꾸고 Deploy.
// 비밀값: Edge Functions → Secrets 에 OPENROUTER_API_KEY 추가 (값은 sk-or- 로 시작).

/** 모델 — 바꾸려면 이 한 줄만. claude-opus-5.5: 1회 약 $0.006 / claude-haiku-5.5: 약 $0.00015 */
const MODEL = "anthropic/claude-opus-5.5";

const REACTIONS = [
  "hyperarousal",
  "anger",
  "intrusion",
  "numbness",
  "heaviness",
  "rumination",
] as const;

const ALLOWED_ORIGINS = new Set([
  "https://sunwoo1009-cloud.github.io",
  "http://localhost:5173",
]);

const MAX_CHARS = 200;
/** 같은 주소에서 10분에 이만큼까지 (함수 인스턴스마다 따로 센다 — 대략적인 안전장치) */
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();

const SYSTEM = `You classify how a counselor feels right after a counseling session.
The user message is a short Korean note describing their remaining reaction or emotion.
Map it to the closest of these six reaction types:

- hyperarousal: tension, racing heart, trembling, anxiety, shortness of breath, being on edge (과각성: 긴장, 두근거림, 떨림, 불안)
- anger: anger, irritation, resentment, feeling wronged (분노·짜증)
- intrusion: vivid scenes or images from the client's story replaying, intrusive pictures or voices (침습적 장면)
- numbness: blankness, feeling nothing, emptiness, unreality, spacing out (멍함)
- heaviness: helplessness, powerlessness, sadness, heaviness, guilt, "nothing I can do" (무력감)
- rumination: going over the session again and again, regret, "I should have said", worrying about what to do next (반추)

Return the best match first. Add a second type only if the note clearly expresses it too.
Return an empty list if the note does not describe an emotional or bodily reaction at all.
Reply only with JSON like {"reactions":["anger"]}. Never repeat or quote the note.`;

const SCHEMA = {
  type: "object",
  properties: {
    reactions: {
      type: "array",
      items: { type: "string", enum: [...REACTIONS] },
    },
  },
  required: ["reactions"],
  additionalProperties: false,
};

function cors(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://sunwoo1009-cloud.github.io";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json" },
  });
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT;
}

/** 모델 답에서 JSON 을 꺼낸다 — 코드 블록이나 앞뒤 글이 붙어 와도 */
function parseReactions(content: unknown): string[] {
  if (typeof content !== "string") return [];
  const tryParse = (s: string) => {
    try {
      const v = JSON.parse(s);
      return Array.isArray(v?.reactions) ? (v.reactions as unknown[]) : null;
    } catch {
      return null;
    }
  };
  const direct = tryParse(content.trim());
  const found = direct ?? tryParse(content.match(/\{[\s\S]*\}/)?.[0] ?? "") ?? [];
  return found.filter((r): r is string => typeof r === "string");
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method" }, 405, origin);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ error: "origin" }, 403, origin);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) return json({ error: "rate" }, 429, origin);

  let text = "";
  try {
    const body = await req.json();
    text = typeof body?.text === "string" ? body.text.trim() : "";
  } catch {
    return json({ error: "body" }, 400, origin);
  }
  if (!text) return json({ error: "empty" }, 400, origin);
  if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS);

  // 붙여 넣을 때 섞인 공백·따옴표는 떼어 낸다
  const key = (Deno.env.get("OPENROUTER_API_KEY") ?? "").trim().replace(/^["']|["']$/g, "");
  if (!key) return json({ error: "no-key" }, 500, origin);

  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://sunwoo1009-cloud.github.io/AI-class/",
        "X-Title": "bungeoppang",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        // 짧은 분류라 생각을 적게 — 비용과 기다림을 줄인다
        reasoning: { effort: "low" },
        response_format: {
          type: "json_schema",
          json_schema: { name: "reaction", strict: true, schema: SCHEMA },
        },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: text },
        ],
      }),
    });

    if (!r.ok) {
      // OpenRouter 가 알려 준 이유만 돌려준다 (키 값은 들어 있지 않다)
      let reason = "";
      try {
        reason = String((await r.json())?.error?.message ?? "").slice(0, 200);
      } catch {
        // 이유를 못 읽어도 상태 번호는 돌려준다
      }
      const code = r.status === 401 ? "key-rejected" : r.status === 402 ? "credits" : r.status === 429 ? "busy" : `api-${r.status}`;
      return json({ error: code, reason, keyStart: key.slice(0, 6) }, 502, origin);
    }

    const data = await r.json();
    const reactions = parseReactions(data?.choices?.[0]?.message?.content);
    const clean = [...new Set(reactions)]
      .filter((x): x is (typeof REACTIONS)[number] => (REACTIONS as readonly string[]).includes(x))
      .slice(0, 2);

    // 글 내용은 남기지 않고, 토큰 수만 남긴다 (비용 확인용)
    console.log(
      JSON.stringify({ in: data?.usage?.prompt_tokens, out: data?.usage?.completion_tokens, n: clean.length }),
    );
    return json({ reactions: clean }, 200, origin);
  } catch {
    return json({ error: "unknown" }, 500, origin);
  }
});
