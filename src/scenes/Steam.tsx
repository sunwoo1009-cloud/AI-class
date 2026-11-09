interface Props {
  /** 부모 SVG 안에서의 위치 */
  transform?: string;
  /** 'soft' 는 짧고 옅게, 'full' 은 길게 */
  strength?: 'soft' | 'full';
}

/**
 * 찜기에서 올라오는 김. 다른 장면에서도 쓸 수 있게 <g> 만 돌려준다.
 * 색과 불투명도는 scene.css 의 --steam-opacity 가 정한다.
 */
export function Steam({ transform, strength = 'full' }: Props) {
  const tall = strength === 'full';
  return (
    <g className="scene-steam" transform={transform}>
      <path
        d={
          tall
            ? 'M0 0 C-4 -10, 4 -16, 0 -27 C-3 -35, 2 -40, 0 -47'
            : 'M0 0 C-3 -7, 3 -11, 0 -18'
        }
        fill="none"
        stroke="#ffffff"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d={
          tall
            ? 'M11 2 C7 -9, 15 -16, 11 -29 C8 -38, 14 -44, 11 -52'
            : 'M11 2 C8 -6, 14 -10, 11 -19'
        }
        fill="none"
        stroke="#ffffff"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d={
          tall
            ? 'M22 0 C19 -8, 25 -14, 22 -24 C20 -31, 24 -36, 22 -42'
            : 'M22 0 C20 -6, 24 -9, 22 -16'
        }
        fill="none"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </g>
  );
}
