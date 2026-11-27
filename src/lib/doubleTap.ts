/**
 * 두 번 톡톡 누르기 판단 (2026-11-27 — 종결 의례 도장).
 * 두 번째 누름이 첫 번째에서 DOUBLE_TAP_MS 안에, 가까운 자리(DOUBLE_TAP_PX)에 오면 두 번 누르기다.
 */
export const DOUBLE_TAP_MS = 400;
export const DOUBLE_TAP_PX = 40;

export interface Tap {
  t: number;
  x: number;
  y: number;
}

export function isDoubleTap(prev: Tap | null, cur: Tap): boolean {
  if (!prev) return false;
  const dt = cur.t - prev.t;
  if (dt <= 0 || dt > DOUBLE_TAP_MS) return false;
  return Math.hypot(cur.x - prev.x, cur.y - prev.y) <= DOUBLE_TAP_PX;
}
