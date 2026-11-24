/**
 * 별점·리뷰 (명세 7.8, 2026-11-25 추가) — 메뉴에서 앱에 별점(1~5)과 짧은 리뷰를 남긴다.
 * 남긴 것은 운영자만 본다(운영자 화면의 '출시 후 리뷰'). 이름·계정은 붙이지 않는다.
 */

export const REVIEW_MAX = 500;
/** 같은 브라우저에서 연달아 보내지 못하게 하는 간격 */
export const REVIEW_COOLDOWN_MS = 30_000;

export type ReviewCheck =
  | { ok: true; rating: number; body: string }
  | { ok: false; reason: string };

/** 보내기 전 검사 — 별점은 꼭, 리뷰 글은 선택(500자까지) */
export function checkReview(
  rating: number | null,
  raw: string,
  lastSentAt: number | null,
  now: number,
): ReviewCheck {
  if (rating === null || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, reason: '별점을 골라 주세요' };
  }
  const body = raw.trim();
  if (body.length > REVIEW_MAX) return { ok: false, reason: `${REVIEW_MAX}자까지 적을 수 있어요` };
  if (lastSentAt !== null && now - lastSentAt < REVIEW_COOLDOWN_MS) {
    return { ok: false, reason: '조금 뒤에 다시 보내 주세요' };
  }
  return { ok: true, rating, body };
}

/** 평균 별점 — 소수 첫째 자리까지. 리뷰가 없으면 null */
export function averageRating(ratings: number[]): number | null {
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((a, b) => a + b, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}
