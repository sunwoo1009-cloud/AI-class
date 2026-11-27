/**
 * 종결 의례 코치 마크 (명세 8.7) — 2026-11-27
 * '일주일 간 보지 않기'를 누르면 일주일 동안 다시 띄우지 않는다 (2026-11-27 — 전에는 '알겠어요').
 * '알겠어요'·바깥 누르기·Esc 로 닫으면 다음에 또 뜬다.
 * 저장값은 '일주일 간 보지 않기'를 누른 시각(ISO). 옛 값 '1'(한 번 본 표시)은 시각이 아니라서 다시 띄운다.
 */
export const COACH_SNOOZE_DAYS = 7;

export function coachSnoozed(raw: string | null, now: Date = new Date()): boolean {
  if (!raw) return false;
  const t = new Date(raw).getTime();
  if (Number.isNaN(t) || raw === '1') return false;
  return now.getTime() - t < COACH_SNOOZE_DAYS * 24 * 60 * 60 * 1000;
}
