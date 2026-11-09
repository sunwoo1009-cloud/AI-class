interface Props {
  /** 켜졌는지 — 꺼지면 빛 번짐이 사라진다 */
  lit: boolean;
  /** 전구 개수 */
  count?: number;
  /** 전구를 늘어놓을 가로 길이 */
  width?: number;
  /** 전선이 시작하는 높이 */
  wireTop?: number;
  transform?: string;
}

/**
 * 천막 아래 매달린 백열전구. 다른 장면에서도 쓸 수 있게 <g> 만 돌려준다.
 * 빛 번짐의 세기는 scene.css 의 --glow-opacity 가 정한다.
 */
export function Bulbs({
  lit,
  count = 3,
  width = 150,
  wireTop = 0,
  transform,
}: Props) {
  const gap = width / (count + 1);
  const bulbs = Array.from({ length: count }, (_, i) => {
    const x = gap * (i + 1);
    // 가운데 전구를 살짝 더 아래로 늘어뜨린다
    const sag = 5 - Math.abs(i - (count - 1) / 2) * 3;
    return { x, y: wireTop + 15 + sag };
  });

  return (
    <g transform={transform}>
      {/* 빛 번짐 — 전구 뒤에 깔린다 */}
      {bulbs.map((b, i) => (
        <circle
          key={`glow-${i}`}
          className={`bulb-glow${lit ? ' bulb-flicker' : ''}`}
          cx={b.x}
          cy={b.y}
          r="17"
          fill="var(--bulb-core)"
          opacity="0"
          style={{ filter: 'blur(7px)' }}
        />
      ))}

      {/* 전선 */}
      <path
        d={`M0 ${wireTop} Q ${width / 2} ${wireTop + 9} ${width} ${wireTop}`}
        fill="none"
        stroke="var(--canopy-edge)"
        strokeWidth="1.2"
      />

      {bulbs.map((b, i) => (
        <g key={i}>
          <line
            x1={b.x}
            y1={wireTop + 3}
            x2={b.x}
            y2={b.y - 4}
            stroke="var(--canopy-edge)"
            strokeWidth="1.2"
          />
          <circle cx={b.x} cy={b.y} r="4.2" fill="var(--bulb)" />
          <circle
            className="bulb-glow"
            cx={b.x}
            cy={b.y}
            r="2.2"
            fill="var(--bulb-core)"
            opacity="0"
          />
        </g>
      ))}
    </g>
  );
}
