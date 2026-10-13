/**
 * 명세 8.6 — 한국어 조사(는/은)는 이름의 받침 여부에 따라 처리한다.
 * 한글 음절은 (code - 0xAC00) % 28 === 0 이면 받침이 없다.
 * 한글로 끝나지 않는 이름(영문·숫자 등)은 받침이 없는 것으로 본다.
 */

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

export function hasFinalConsonant(word: string): boolean {
  const trimmed = word.trim();
  if (trimmed.length === 0) return false;
  const code = trimmed.charCodeAt(trimmed.length - 1);
  if (code < HANGUL_START || code > HANGUL_END) return false;
  return (code - HANGUL_START) % 28 !== 0;
}

export type JosaPair = '는/은' | '가/이' | '를/을' | '와/과';

const PAIRS: Record<JosaPair, [withoutFinal: string, withFinal: string]> = {
  '는/은': ['는', '은'],
  '가/이': ['가', '이'],
  '를/을': ['를', '을'],
  '와/과': ['와', '과'],
};

export function josa(word: string, pair: JosaPair): string {
  const [withoutFinal, withFinal] = PAIRS[pair];
  return hasFinalConsonant(word) ? withFinal : withoutFinal;
}

/** "{name}는" 형태의 템플릿을 채운다. {name은} 처럼 조사를 붙여 쓴다. */
export function fillName(template: string, name: string): string {
  return template
    .replace(/\{name(는|은)\}/g, () => name + josa(name, '는/은'))
    .replace(/\{name(가|이)\}/g, () => name + josa(name, '가/이'))
    .replace(/\{name\}/g, name);
}
