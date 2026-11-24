export interface IntroConditions {
  /** 온보딩을 마쳤는가. 첫 실행 중에는 인트로를 보여주지 않는다 */
  onboarded: boolean;
  /** ?intro=1 / ?intro=0 강제. 없으면 null */
  override: boolean | null;
}

/**
 * 인트로(퇴근길)를 보여줄지 판단한다.
 *
 * 2026-11-24 변경: 앱을 열 때마다 보여준다. 시각(오후 5시)과
 * "오늘 이미 봤는지"는 더 이상 보지 않는다.
 * 온보딩 전에는 강제 파라미터가 있어도 보여주지 않는다 — 돌아갈 홈이 없다.
 * 앱 안에서 홈으로 돌아올 때는 다시 나오지 않는다 (App 이 열 때 한 번만 판단).
 */
export function shouldShowIntro(c: IntroConditions): boolean {
  if (!c.onboarded) return false;
  if (c.override !== null) return c.override;
  return true;
}
