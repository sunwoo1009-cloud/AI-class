interface Props {
  lit: boolean;
  /** 한 타일의 가로 길이. 이 폭으로 이어 붙여 반복한다 */
  width?: number;
  transform?: string;
}

/**
 * 건물 실루엣 한 타일. 창에 불이 들어온다.
 * 좌우 끝 높이를 같게 맞춰서 이어 붙여도 티가 나지 않는다.
 * 자체 좌표계는 바닥이 y=0, 위로 자란다.
 */
export function Cityscape({ lit, width = 390, transform }: Props) {
  // [x, 폭, 높이] — 타일 폭 390 기준
  const blocks: [number, number, number][] = [
    [0, 54, 96],
    [54, 38, 132],
    [92, 46, 74],
    [138, 58, 116],
    [196, 34, 88],
    [230, 50, 148],
    [280, 42, 70],
    [322, 68, 110],
  ];
  const scale = width / 390;

  return (
    <g transform={transform}>
      <g transform={`scale(${scale} 1)`}>
        {blocks.map(([x, w, h], i) => (
          <g key={i}>
            <rect x={x} y={-h} width={w} height={h} fill="var(--building)" />
            {/* 창 */}
            {lit
              ? Array.from({ length: Math.floor((h - 20) / 22) }, (_, row) =>
                  Array.from({ length: Math.max(1, Math.floor(w / 20)) }, (_, col) => {
                    // 몇 칸은 꺼둬야 실제처럼 보인다
                    if ((row * 7 + col * 3 + i * 5) % 4 === 0) return null;
                    return (
                      <rect
                        key={`${row}-${col}`}
                        x={x + 7 + col * 20}
                        y={-h + 14 + row * 22}
                        width="7"
                        height="9"
                        rx="1"
                        fill="var(--window)"
                        opacity=".85"
                      />
                    );
                  }),
                )
              : null}
          </g>
        ))}
      </g>
    </g>
  );
}
