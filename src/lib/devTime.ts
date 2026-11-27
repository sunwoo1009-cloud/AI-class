import { isEveningWindow } from './date';
import { cachedSunset, duskBySunset } from './weather';

/**
 * 개발·확인용 강제 파라미터.
 *
 *   ?time=18    오후 6시인 것처럼 장면을 보여준다 (?hour= 도 같이 받는다)
 *   ?intro=1    인트로를 무조건 보여준다
 *   ?intro=0    인트로를 무조건 건너뛴다
 *   ?parts=1    장면 부품 확인 페이지
 *
 * **장면 표시에만 쓴다.** 일기 날짜 키처럼 저장되는 값은 절대 이걸 거치면
 * 안 된다. 엉뚱한 날짜에 기록이 남는다.
 */
export function parseTimeOverride(search: string): number | null {
  const q = new URLSearchParams(search);
  const raw = q.get('time') ?? q.get('hour');
  if (raw === null || raw.trim() === '') return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 23) return null;
  return n;
}

/** ?intro=1 → true, ?intro=0 → false, 없으면 null */
export function parseIntroOverride(search: string): boolean | null {
  const raw = new URLSearchParams(search).get('intro');
  if (raw === null || raw.trim() === '') return null;
  if (raw === '1' || raw === 'true') return true;
  if (raw === '0' || raw === 'false') return false;
  return null;
}

function currentSearch(): string {
  return typeof window === 'undefined' ? '' : window.location.search;
}

/** 장면 표시용 시각. 강제 파라미터가 있으면 그 시각으로 친다. */
export function sceneNow(
  search: string = currentSearch(),
  now: Date = new Date(),
): Date {
  const hour = parseTimeOverride(search);
  if (hour === null) return now;
  const forced = new Date(now);
  forced.setHours(hour, 0, 0, 0);
  return forced;
}

/**
 * 노점 장면을 노을로 그릴지.
 * 2026-11-27 — 받아 둔 그날 실제 일몰 시각이 있으면 "일몰 40분 전부터"(lib/weather.ts duskBySunset).
 * 없으면 예전처럼 17시. ?time= 강제 파라미터가 있으면 늘 17시 기준(확인용).
 */
export function isEveningScene(search?: string, now?: Date, sunset: string | undefined = cachedSunset()): boolean {
  const s = search ?? currentSearch();
  if (parseTimeOverride(s) !== null) return isEveningWindow(sceneNow(s, now));
  const t = now ?? new Date();
  return duskBySunset(sunset, t) ?? isEveningWindow(t);
}

export function introOverride(search: string = currentSearch()): boolean | null {
  return parseIntroOverride(search);
}
