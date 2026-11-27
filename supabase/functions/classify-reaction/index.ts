// 반응 선택 AI 판단 (명세 6.1, 2026-11-27) — Supabase Edge Function
//
// 앱이 보낸 짧은 글(지금 남은 반응·감정)이 여섯 반응 중 무엇에 가까운지 Claude 에게 묻는다.
// - API 키는 Supabase 비밀값(ANTHROPIC_API_KEY)에만 둔다. 앱(브라우저)에는 절대 넣지 않는다.
// - 받은 글은 판단에만 쓰고 저장하거나 로그에 남기지 않는다.
// - 남용을 막으려고 글 길이(200자)와 같은 주소에서의 호출 수를 제한한다.
//
// 배포: Supabase 대시보드 → Edge Functions → Deploy a new function → Via Editor
//       이름 classify-reaction, 이 파일 내용을 붙여넣고 Deploy.
// 비밀값: Edge Functions → Secrets 에 ANTHROPIC_API_KEY 추가.

import Anthropic from "npm:@anthropic-ai/sdk";

/** 모델 — 바꾸려면 이 한 줄만. 비용은 README/명세 6.1 참고 */
const MODEL = "claude-opus-5-5";

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
Never repeat or quote the note.`;

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

const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

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

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 2048,
      // 거절되면 서버가 알맞은 모델로 다시 돌린다 (Anthropic 권장 기본값)
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // 짧은 분류라 생각을 적게 — 비용과 기다림을 줄인다
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: SCHEMA },
      },
      system: SYSTEM,
      messages: [{ role: "user", content: text }],
    });

    if (response.stop_reason === "refusal") return json({ reactions: [], refused: true }, 200, origin);

    let reactions: string[] = [];
    for (const block of response.content) {
      if (block.type === "text") {
        try {
          const parsed = JSON.parse(block.text);
          if (Array.isArray(parsed?.reactions)) reactions = parsed.reactions;
        } catch {
          // 모양이 틀리면 빈 결과 — 앱이 기기 안 판단으로 넘어간다
        }
      }
    }
    const clean = [...new Set(reactions)]
      .filter((r): r is (typeof REACTIONS)[number] => (REACTIONS as readonly string[]).includes(r))
      .slice(0, 2);

    // 글 내용은 남기지 않고, 토큰 수만 남긴다 (비용 확인용)
    console.log(
      JSON.stringify({ in: response.usage.input_tokens, out: response.usage.output_tokens, n: clean.length }),
    );
    return json({ reactions: clean }, 200, origin);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: "busy" }, 429, origin);
    if (error instanceof Anthropic.AuthenticationError) return json({ error: "key" }, 500, origin);
    if (error instanceof Anthropic.APIError) return json({ error: `api-${error.status}` }, 502, origin);
    return json({ error: "unknown" }, 500, origin);
  }
});
