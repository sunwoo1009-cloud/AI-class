/**
 * 발표용 화면의 '피드백' 시트 — 익명 피드백을 남기고 모두가 목록을 본다.
 *
 * 앱 기록(체크인·일기)과는 전혀 관계없다. 앱은 여전히 서버를 쓰지 않는다(설계 원칙 2).
 * 피드백만 Supabase 의 feedback 표에 저장한다. 이름·기기 정보는 보내지 않는다.
 *
 * 연결 정보는 빌드할 때 넣는다:
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY  (.env.local / GitHub Secrets)
 * anon 키는 원래 공개용이다. 쓰기·읽기 범위는 Supabase 의 RLS 규칙이 막는다
 * (넣기와 읽기만 허용, 고치기·지우기는 불가).
 */

export const FEEDBACK_MAX = 300;
/** 같은 브라우저에서 연달아 보내지 못하게 하는 간격 */
export const FEEDBACK_COOLDOWN_MS = 20_000;

export interface FeedbackItem {
  id: number;
  body: string;
  created_at: string;
}

export type CheckResult = { ok: true; body: string } | { ok: false; reason: string };

/** 보내기 전 검사 — 앞뒤 공백을 지우고 빈 글·너무 긴 글·너무 잦은 글을 막는다 */
export function checkFeedback(raw: string, lastSentAt: number | null, now: number): CheckResult {
  const body = raw.trim();
  if (body.length === 0) return { ok: false, reason: '내용을 적어 주세요' };
  if (body.length > FEEDBACK_MAX) {
    return { ok: false, reason: `${FEEDBACK_MAX}자까지 적을 수 있어요` };
  }
  if (lastSentAt !== null && now - lastSentAt < FEEDBACK_COOLDOWN_MS) {
    return { ok: false, reason: '조금 뒤에 다시 보내 주세요' };
  }
  return { ok: true, body };
}

const URL_ = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '');
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** 연결 정보가 빌드에 들어 있는가 */
export const feedbackConnected = Boolean(URL_ && KEY);

function headers(): HeadersInit {
  return { apikey: KEY ?? '', Authorization: `Bearer ${KEY ?? ''}`, 'Content-Type': 'application/json' };
}

export async function listFeedback(): Promise<FeedbackItem[]> {
  const res = await fetch(
    `${URL_}/rest/v1/feedback?select=id,body,created_at&order=created_at.desc&limit=200`,
    { headers: headers() },
  );
  if (!res.ok) throw new Error(`목록을 불러오지 못했어요 (${res.status})`);
  return (await res.json()) as FeedbackItem[];
}

export async function sendFeedback(body: string): Promise<void> {
  const res = await fetch(`${URL_}/rest/v1/feedback`, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'return=minimal' },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) throw new Error(`보내지 못했어요 (${res.status})`);
}
