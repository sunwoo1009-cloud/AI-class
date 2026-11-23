import { foodShape } from './FoodIcon';

export type ArtKind =
  /** 김이 걷힌 팥붕어빵 (명세 8.1 [3]) */
  | 'taiyakiCool'
  /** 김이 나는 슈크림 붕어빵 (명세 8.6 [1]) */
  | 'creamSteam'
  /** 식힘망 위의 슈크림 붕어빵과 물음표 (명세 8.6 [2]) */
  | 'creamRack'
  /** 시계가 돌고 김이 걷히는 슈크림 붕어빵 (명세 8.6 [3]) */
  | 'creamClock';

/** 기법 화면에 붙는 그림. 글이 뜻을 다 담으므로 그림은 읽어주지 않는다. */
export function TechniqueArt({ kind }: { kind: ArtKind }) {
  switch (kind) {
    case 'taiyakiCool':
      return (
        <svg
          className="script-art"
          viewBox="0 0 64 48"
          aria-hidden="true"
          focusable="false"
        >
          {foodShape('taiyakiRed')}
        </svg>
      );

    case 'creamSteam':
      return (
        <svg
          className="script-art is-tall"
          viewBox="0 0 64 106"
          aria-hidden="true"
          focusable="false"
        >
          <g className="art-steam">
            <path d="M21 52 C15 41 25 35 19 23 C16 16 20 12 18 7" />
            <path d="M33 54 C27 42 37 36 31 24 C28 16 32 12 30 6" />
            <path d="M45 52 C39 41 49 35 43 24 C40 17 44 13 42 9" />
          </g>
          <g transform="translate(0,58)">{foodShape('taiyakiCream')}</g>
        </svg>
      );

    case 'creamRack':
      return (
        <svg
          className="script-art is-wide"
          viewBox="0 0 104 76"
          aria-hidden="true"
          focusable="false"
        >
          {/* 식힘망 — 살이 촘촘한 망 위에 붕어빵이 놓여 있다 */}
          <g className="art-rack">
            <rect x="10" y="44" width="84" height="9" rx="2" />
            <path d="M21 44 V53 M31 44 V53 M42 44 V53 M52 44 V53 M62 44 V53 M73 44 V53 M83 44 V53" />
            <path d="M16 53 V60 M88 53 V60" />
          </g>
          <g transform="translate(29,6) scale(0.74)">
            {foodShape('taiyakiCream')}
          </g>
          {/* 작은 물음표 — 번갈아 떠오른다 */}
          <g className="art-marks">
            <text x="4" y="30">?</text>
            <text x="92" y="20">?</text>
            <text x="90" y="48">?</text>
          </g>
        </svg>
      );

    case 'creamClock':
      return (
        <svg
          className="script-art is-wide"
          viewBox="0 0 128 76"
          aria-hidden="true"
          focusable="false"
        >
          {/* 시계 — 바늘이 두 바퀴 돌고 멈춘다 */}
          <g className="art-clock">
            <circle className="art-clock-face" cx="24" cy="38" r="19" />
            <path
              className="art-clock-ticks"
              d="M24 22 V25 M24 51 V54 M8 38 H11 M37 38 H40"
            />
            <path className="art-clock-hand is-hour" d="M24 38 V27" />
            <path className="art-clock-hand is-min" d="M24 38 V23" />
            <circle className="art-clock-pin" cx="24" cy="38" r="2" />
          </g>
          {/* 김이 서서히 걷힌다 */}
          <g className="art-steam is-fading" transform="translate(56,0)">
            <path d="M15 26 C9 17 19 12 13 2" />
            <path d="M27 28 C21 18 31 13 25 3" />
            <path d="M39 26 C33 17 43 12 37 3" />
          </g>
          <g transform="translate(56,28)">{foodShape('taiyakiCream')}</g>
        </svg>
      );
  }
}
