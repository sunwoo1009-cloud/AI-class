interface Props {
  transform?: string;
  /** 걷는 동작. prefers-reduced-motion 에서는 꺼진다 */
  walking?: boolean;
  /** 'walk' 는 2프레임 걷기, 'stand' 는 두 다리로 선 자세 */
  pose?: 'walk' | 'stand';
  /** 가방을 멘 모습인지. 사장님으로 쓸 때는 끈다 */
  bag?: boolean;
}

/**
 * 가방을 멘 사람의 옆모습 실루엣. 오른쪽을 보고 걷는다.
 * 얼굴 디테일 없이 단순한 도형만 쓴다.
 *
 * 걷기는 **2프레임**이다. 다리를 각도로 흔들면 둥둥 떠 보여서,
 * 벌린 자세(contact)와 모은 자세(passing) 두 장을 딱딱 바꾼다.
 *
 * 자체 좌표계는 가로 64 · 세로 118. 다른 장면에서도 쓸 수 있게 <g> 만 돌려준다.
 */
export function Walker({
  transform,
  walking = true,
  pose = 'walk',
  bag = true,
}: Props) {
  const w = walking && pose === 'walk' ? ' walk' : '';

  const leg = (d: string, back = false) => (
    <path
      d={d}
      fill="none"
      stroke={back ? 'var(--figure-dark)' : 'var(--figure)'}
      strokeWidth="8"
      strokeLinecap="round"
    />
  );
  const arm = (d: string) => (
    <path
      d={d}
      fill="none"
      stroke="var(--figure)"
      strokeWidth="6.5"
      strokeLinecap="round"
    />
  );

  return (
    <g transform={transform} className="walker">
      <g className={`walker-bob${w}`}>
        {/* 가방 — 등쪽(왼쪽) */}
        {bag ? (
          <>
            <rect
              x="8"
              y="34"
              width="17"
              height="27"
              rx="6"
              fill="var(--figure-dark)"
            />
            <path
              d="M24 36 C30 34, 33 36, 34 40"
              fill="none"
              stroke="var(--figure-dark)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </>
        ) : null}

        {/* ===== 선 자세 — 두 다리를 나란히 ===== */}
        {pose === 'stand' ? (
          <>
            {leg('M29 62 L28 88 L27 106', true)}
            {leg('M36 62 L37 88 L38 106')}
          </>
        ) : null}

        {/* ===== 걷기 2프레임 — 뒷다리 ===== */}
        {pose === 'walk' ? (
          <>
            <g className={`walker-frame-a${w}`}>
              {leg('M29 62 L24 86 L19 104', true)}
            </g>
            <g className={`walker-frame-b${w}`}>
              {leg('M33 62 L37 84 L32 98', true)}
            </g>
          </>
        ) : null}

        {/* 몸통 */}
        <path
          d="M24 32 C20 32, 18 37, 19 44 L22 66 L40 66 L42 42 C43 35, 39 31, 34 31 Z"
          fill="var(--figure)"
        />

        {/* 앞다리와 팔도 프레임에 맞춰 바뀐다 */}
        {pose === 'walk' ? (
          <>
            <g className={`walker-frame-a${w}`}>
              {leg('M35 62 L41 86 L47 103')}
              {arm('M38 40 L45 54 L42 66')}
            </g>
            <g className={`walker-frame-b${w}`}>
              {leg('M31 62 L30 88 L29 106')}
              {arm('M38 40 L41 56 L37 68')}
            </g>
          </>
        ) : (
          arm('M38 40 L41 58 L39 70')
        )}

        {/* 목과 머리 */}
        <rect x="30" y="24" width="7" height="8" fill="var(--figure)" />
        <circle cx="35" cy="17" r="10" fill="var(--figure)" />
      </g>
    </g>
  );
}
