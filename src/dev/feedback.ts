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

/**
 * 프로젝트 주소만 남긴다. 대시보드에서 'https://xxx.supabase.co/rest/v1/' 처럼
 * 뒤에 경로가 붙은 주소를 복사해 넣는 경우가 있어서 그 꼬리를 떼어 낸다.
 */
export function baseUrl(raw: string | undefined): string | undefined {
  return raw
    ?.trim()
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/, '');
}

const URL_ = baseUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** 연결 정보가 빌드에 들어 있는가 */
export const feedbackConnected = Boolean(URL_ && KEY);

function headers(): HeadersInit {
  const h: Record<string, string> = { apikey: KEY ?? '', 'Content-Type': 'application/json' };
  // 예전 anon 키(eyJ… 로 시작하는 JWT)는 Authorization 에도 넣는다.
  // 새 publishable 키(sb_publishable_…)는 apikey 하나만 보낸다.
  if (KEY?.startsWith('eyJ')) h.Authorization = `Bearer ${KEY}`;
  return h;
}

// 받은 피드백 읽기는 운영자만 한다 — sync/admin.ts 의 listFeedbackAdmin (운영자 로그인 필요).

/** 로그인 없이 표에 한 줄 넣기 (읽기는 못 한다). 피드백·별점 리뷰가 함께 쓴다. */
export async function insertPublic(table: 'feedback' | 'reviews', row: object): Promise<void> {
  const res = await fetch(`${URL_}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'return=minimal' },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`보내지 못했어요 (${res.status})`);
}

export function sendFeedback(body: string): Promise<void> {
  return insertPublic('feedback', { body });
}
