import type { CSSProperties } from 'react';

const WIDE = /[가-힣ㄱ-ㆎ一-鿿]/;
const NARROW = /[A-Za-z0-9]/;

/**
 * 한 줄의 가로 폭을 em 으로 어림한다.
 * 한글·한자는 글자 하나가 대략 1em, 영숫자는 그 절반, 공백은 그보다 더 좁다.
 */
function widthEm(line: string): number {
  let w = 0;
  for (const ch of line) {
    if (ch === ' ') w += 0.26;
    else if (WIDE.test(ch)) w += 1;
    else if (NARROW.test(ch)) w += 0.55;
    else w += 0.42;
  }
  return w;
}

/**
 * 줄을 직접 나눠 적은 문단.
 *
 * 줄바꿈(`\n`)을 그대로 보여주고, **가장 긴 줄이 한 줄에 들어가도록**
 * 글자 크기를 줄인다. 기준은 화면 폭이 아니라 **글이 들어가는 칸**이다
 * (`cqw`). 개발용 모음처럼 틀 안에 넣어 보여줄 때 화면 폭으로 재면 넘친다.
 *
 * 쓰려면 부모 어딘가에 `container-type: inline-size` 가 있어야 한다.
 * `.script`, `.card`, `.lines-box` 가 그 역할을 한다.
 */
export function Lines({
  text,
  className,
  base,
  as: Tag = 'p',
}: {
  text: string;
  /** 색·굵기 등 나머지 모양을 정하는 클래스 */
  className?: string;
  /** 줄이기 전의 크기. 칸이 넉넉하면 이 값을 그대로 쓴다. */
  base: string;
  /** 제목으로 쓸 때는 'h2' 처럼 넘긴다 */
  as?: 'p' | 'h1' | 'h2';
}) {
  // 어림이라 딱 맞게 잡으면 반올림 한 끗에 줄이 넘어간다. 한 글자쯤 여유를 둔다.
  const em = Math.max(8, ...text.split('\n').map(widthEm)) + 1.2;
  return (
    <Tag
      className={`lines${className ? ` ${className}` : ''}`}
      style={
        {
          fontSize: `min(${base}, calc(100cqw / ${em.toFixed(2)}))`,
        } as CSSProperties
      }
    >
      {text}
    </Tag>
  );
}
