/** 로컬 시간대 기준 YYYY-MM-DD */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 명세 4절 WeeklySessionCount.weekStart — 해당 주 월요일 */
export function weekStartKey(d: Date = new Date()): string {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = copy.getDay(); // 0=일 … 6=토
  const diff = dow === 0 ? -6 : 1 - dow;
  copy.setDate(copy.getDate() + diff);
  return toDateKey(copy);
}

/** 명세 7.1 / 7.2 — 최근 N일 (롤링 창) */
export function isWithinDays(
  timestamp: string,
  days: number,
  now: Date = new Date(),
): boolean {
  const t = new Date(timestamp).getTime();
  if (Number.isNaN(t)) return false;
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return t >= cutoff && t <= now.getTime();
}

/** 명세 7.3 — 홈 화면에서 오후 5시 이후에는 '하루 정리하기'를 강조한다 */
export function isEveningWindow(now: Date = new Date()): boolean {
  return now.getHours() >= 17;
}

export function formatDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dows = ['일', '월', '화', '수', '목', '금', '토'];
  return `${m}월 ${d}일 (${dows[date.getDay()]})`;
}

export function formatTimeLabel(timestamp: string): string {
  const d = new Date(timestamp);
  const h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, '0');
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${h12}:${min}`;
}
