interface Props {
  lit: boolean;
  /** 기둥 높이 */
  height?: number;
  transform?: string;
}

/**
 * 가로등. 기둥 하나에 둥근 등 하나.
 * 자체 좌표계는 기둥 아래가 (0, 0), 위로 자란다.
 * 다른 장면에서도 쓸 수 있게 <g> 만 돌려준다.
 */
export function StreetLamp({ lit, height = 108, transform }: Props) {
  const top = -height;
  return (
    <g transform={transform}>
      {/* 기둥 */}
      <rect x="-2" y={top} width="4" height={height} rx="2" fill="var(--lamp-post)" />
      <rect x="-6" y="-4" width="12" height="5" rx="2" fill="var(--lamp-post)" />
      {/* 등을 받치는 팔 */}
      <path
        d={`M0 ${top + 4} C0 ${top - 6}, 10 ${top - 8}, 14 ${top - 2}`}
        fill="none"
        stroke="var(--lamp-post)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* 빛 번짐 */}
      <circle
        className={`bulb-glow${lit ? ' bulb-flicker' : ''}`}
        cx="14"
        cy={top + 4}
        r="22"
        fill="var(--bulb-core)"
        opacity="0"
        style={{ filter: 'blur(9px)' }}
      />
      {/* 등 */}
      <path
        d={`M8 ${top - 1} L20 ${top - 1} L18 ${top + 9} L10 ${top + 9} Z`}
        fill="var(--lamp-head)"
      />
      <circle className="bulb-glow" cx="14" cy={top + 7} r="4" fill="var(--bulb-core)" opacity="0" />
    </g>
  );
}
