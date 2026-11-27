/**
 * 가입·로그인 칸 확인 (2026-11-27).
 * 화면에서 칸 상태(성공·오류)를 정하는 데 쓴다. 서버도 다시 확인한다.
 */

export const PASSWORD_MIN = 6;

/** 흔한 이메일 모양인가 — 아이디@도메인.끝(두 글자 이상), 빈칸 없음 */
export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/.test(value.trim());
}

export type EmailState = 'empty' | 'typing' | 'valid' | 'invalid';

/**
 * 이메일 칸 상태.
 * 형식이 맞으면 바로 valid. 틀린 경우는 칸을 떠난 뒤(touched)에만 invalid 로 알린다 —
 * 아직 치는 중인 사람에게 오류부터 보여주지 않는다.
 */
export function emailState(value: string, touched: boolean): EmailState {
  if (value.trim() === '') return 'empty';
  if (isEmail(value)) return 'valid';
  return touched ? 'invalid' : 'typing';
}

/** 비밀번호 문제 — 없으면 null */
export function passwordProblem(value: string): string | null {
  if (value.length === 0) return '비밀번호를 입력해 주세요';
  if (value.length < PASSWORD_MIN) return `${PASSWORD_MIN}자 이상 입력해 주세요`;
  return null;
}
