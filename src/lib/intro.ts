import { loadIntroSeenDate, saveIntroSeenDate } from '../storage/store';
import { toDateKey } from './date';

export interface IntroConditions {
  /** 온보딩을 마쳤는가. 첫 실행 중에는 인트로를 보여주지 않는다 */
  onboarded: boolean;
  /** 오후 5시 이후인가 */
  evening: boolean;
  /** 오늘 날짜 YYYY-MM-DD */
  today: string;
  /** 인트로를 마지막으로 본 날짜. 본 적 없으면 null */
  seenDate: string | null;
  /** ?intro=1 / ?intro=0 강제. 없으면 null */
  override: boolean | null;
}

/**
 * 인트로(퇴근길)를 보여줄지 판단한다.
 *
 * 기본 조건: 오후 5시 이후 · 오늘 아직 안 봄 · 온보딩 완료.
 * 온보딩 전에는 강제 파라미터가 있어도 보여주지 않는다 — 돌아갈 홈이 없다.
 */
export function shouldShowIntro(c: IntroConditions): boolean {
  if (!c.onboarded) return false;
  if (c.override !== null) return c.override;
  if (!c.evening) return false;
  return c.seenDate !== c.today;
}

/** 저장소를 읽어 오늘 기준으로 판단한다 */
export function shouldShowIntroNow(
  onboarded: boolean,
  evening: boolean,
  override: boolean | null,
  now: Date = new Date(),
): boolean {
  return shouldShowIntro({
    onboarded,
    evening,
    today: toDateKey(now),
    seenDate: loadIntroSeenDate(),
    override,
  });
}

/** 오늘 봤다고 기록한다 */
export function markIntroSeen(now: Date = new Date()): void {
  saveIntroSeenDate(toDateKey(now));
}
