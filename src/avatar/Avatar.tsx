import type { ReactNode } from 'react';
import type { Slot } from '../lib/boutique';

/**
 * 꾸밀 수 있는 직장인 — 앞모습 (명세 8.8).
 *
 * 처음에는 인트로와 같은 **실루엣 한 색**이다. 아이템을 입힌 칸만 색과 테두리가 생긴다.
 * 피부를 입혀야 얼굴(눈·입)이 보인다.
 *
 * 좌표계는 가로 120 · 세로 200. 머리가 큰 2.5등신.
 *   머리 타원 중심 (60, 56) · 목 84~96 · 몸통 96~142 · 다리 140~180 · 신발 183
 *
 * 그리는 순서(뒤 → 앞): 그림자 · 가방 몸체 · 뒷머리 · 다리(하의) · 신발 · 팔(소매) · 손
 *   · 목 · 몸통(상의) · 목 장식 · 가방 끈 · 귀 · 머리 · 얼굴 · 앞머리 · 안경 · 모자
 */

export type Equipped = Partial<Record<Slot, string>>;

interface Props {
  equipped: Equipped;
  /** 아무것도 안 입힌 부분의 색 — 인트로 실루엣 색 */
  silhouette?: string;
  /**
   * 미리보기 카드용. 피부를 안 입혔으면 실루엣 대신 연한 마네킹 색으로 칠해
   * 안경·모자 같은 작은 아이템이 보이게 한다. 얼굴은 그리지 않는다.
   */
  mannequin?: boolean;
  /** 인트로에서 제자리 걷기 — 다리를 번갈아 든다 */
  walking?: boolean;
}

const OUTLINE = '#3d2c22';
const HAIR = '#6b4430';
const SILHOUETTE = '#574b45';
const MANNEQUIN = '#ddd3c8';

const SKIN: Record<string, string> = {
  'skin-1': '#fde3cf',
  'skin-2': '#f3c9a3',
  'skin-3': '#d79f6e',
  'skin-4': '#8f5b3b',
};

/** 기본 몸통 — 상의를 안 입었을 때도 이 모양이다 */
const TORSO = 'M38 96 Q60 90 82 96 L86 142 Q60 148 34 142 Z';
const ARM_L = 'M40 100 Q32 116 31 136';
const ARM_R = 'M80 100 Q88 116 89 136';

export function Avatar({
  equipped,
  silhouette = SILHOUETTE,
  mannequin = false,
  walking = false,
}: Props) {
  const S = silhouette;
  const skin = equipped.skin
    ? SKIN[equipped.skin]
    : mannequin
      ? MANNEQUIN
      : S;
  const hasSkin = Boolean(equipped.skin);
  // 색이 있는 부분에만 테두리를 그린다. 실루엣은 테두리 없이 한 덩어리.
  const line = (on: boolean) =>
    on ? { stroke: OUTLINE, strokeWidth: 2, strokeLinejoin: 'round' as const } : {};
  const skinLine = line(hasSkin || mannequin);

  const top = equipped.top;
  const bottom = equipped.bottom;
  const shoes = equipped.shoes;
  const w = walking ? ' walk' : '';

  return (
    <g className={`avatar${w}`}>
      {/* 그림자 */}
      <ellipse cx="60" cy="192" rx="34" ry="5" fill="rgba(40,30,20,0.14)" />

      {/* 가방 몸체 — 등 뒤라 양옆으로만 보인다 */}
      {equipped.bag === 'acc-backpack' ? (
        <rect x="28" y="98" width="64" height="44" rx="11" fill="#45444c" {...line(true)} />
      ) : null}

      {/* 뒷머리 */}
      <HairBack id={equipped.hair} />

      {/* 다리 + 하의 · 신발 — 걸을 때 번갈아 든다 */}
      <g className={`avatar-leg-l${w}`}>
        <Leg x={44} bottom={bottom} skin={skin} S={S} skinLine={skinLine} />
        <Shoe cx={50} id={shoes} S={S} />
      </g>
      <g className={`avatar-leg-r${w}`}>
        <Leg x={62} bottom={bottom} skin={skin} S={S} skinLine={skinLine} />
        <Shoe cx={70} id={shoes} S={S} />
      </g>
      {bottom === 'bottom-skirt' ? <Skirt /> : null}

      {/* 팔(소매) · 손 */}
      <Arms top={top} S={S} />
      <circle cx="31" cy="140" r="6" fill={skin} {...skinLine} />
      <circle cx="89" cy="140" r="6" fill={skin} {...skinLine} />

      {/* 목 */}
      <rect x="54" y="82" width="12" height="16" fill={skin} {...skinLine} />

      {/* 몸통 · 상의 */}
      <Top id={top} S={S} />

      {/* 목 장식 */}
      {equipped.neck === 'acc-tie' ? <Tie /> : null}
      {equipped.neck === 'acc-scarf' ? <Scarf /> : null}

      {/* 가방 끈 */}
      {equipped.bag === 'acc-backpack' ? (
        <g fill="none" stroke="#45444c" strokeWidth="5" strokeLinecap="round">
          <path d="M45 97 L43 134" />
          <path d="M75 97 L77 134" />
        </g>
      ) : null}

      {/* 귀 · 머리 */}
      <ellipse cx="27" cy="60" rx="6" ry="7" fill={skin} {...skinLine} />
      <ellipse cx="93" cy="60" rx="6" ry="7" fill={skin} {...skinLine} />
      <ellipse cx="60" cy="56" rx="33" ry="31" fill={skin} {...skinLine} />

      {/* 얼굴 — 피부를 입혀야 보인다 */}
      {hasSkin ? <Face blush={equipped.skin !== 'skin-4'} /> : null}

      {/* 앞머리 — 헤어를 안 샀으면 실루엣 색 기본 머리 */}
      <HairFront id={equipped.hair} S={S} />

      {equipped.glasses === 'acc-glasses' ? <Glasses /> : null}
      {equipped.hat === 'acc-cap' ? <Cap /> : null}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* 얼굴 */

function Face({ blush }: { blush: boolean }) {
  return (
    <g>
      {blush ? (
        <g fill="#f29a92" opacity="0.4">
          <ellipse cx="41" cy="69" rx="5.5" ry="3.2" />
          <ellipse cx="79" cy="69" rx="5.5" ry="3.2" />
        </g>
      ) : null}
      <ellipse cx="48" cy="60" rx="3.2" ry="4.2" fill="#2b1d16" />
      <ellipse cx="72" cy="60" rx="3.2" ry="4.2" fill="#2b1d16" />
      <circle cx="49" cy="58.5" r="1.1" fill="#fff" />
      <circle cx="73" cy="58.5" r="1.1" fill="#fff" />
      <path
        d="M55 71 Q60 75.5 65 71"
        fill="none"
        stroke="#2b1d16"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* 머리카락 */

const hairStyle = { fill: HAIR, stroke: OUTLINE, strokeWidth: 2, strokeLinejoin: 'round' as const };

function HairBack({ id }: { id?: string }) {
  if (id === 'hair-bob') {
    return (
      <path
        d="M22 58 C20 30 40 14 60 14 C80 14 100 30 98 58 L99 92 Q93 97 86 93 L34 93 Q27 97 21 92 Z"
        {...hairStyle}
      />
    );
  }
  if (id === 'hair-long') {
    return (
      <path
        d="M20 58 C18 28 40 14 60 14 C80 14 102 28 100 58 L104 132 Q60 139 16 132 Z"
        {...hairStyle}
      />
    );
  }
  if (id === 'hair-pony') {
    return (
      <g>
        <path
          d="M82 30 C104 32 110 62 101 90 C98 99 90 98 93 88 C98 68 96 48 80 40 Z"
          {...hairStyle}
        />
        <circle cx="88" cy="33" r="4.5" fill="#e07a8c" stroke={OUTLINE} strokeWidth="1.6" />
      </g>
    );
  }
  return null;
}

function HairFront({ id, S }: { id?: string; S: string }) {
  if (id === 'hair-bob') {
    return (
      <g>
        <path
          d="M26 62 C24 30 40 15 60 15 C80 15 96 30 94 62 L90 62 L88 47 Q60 39 32 47 L30 62 Z"
          {...hairStyle}
        />
        <rect x="21" y="50" width="10" height="42" rx="5" {...hairStyle} />
        <rect x="89" y="50" width="10" height="42" rx="5" {...hairStyle} />
      </g>
    );
  }
  if (id === 'hair-long') {
    return (
      <g>
        <path
          d="M26 66 C24 30 40 15 60 15 C80 15 96 30 94 66 L90 68 C88 50 76 39 60 35 C44 39 32 50 30 68 Z"
          {...hairStyle}
        />
        <rect x="20" y="52" width="10" height="62" rx="5" {...hairStyle} />
        <rect x="90" y="52" width="10" height="62" rx="5" {...hairStyle} />
      </g>
    );
  }
  if (id === 'hair-pony') {
    return (
      <path
        d="M27 60 C24 30 40 15 60 15 C80 15 96 30 93 60 C90 50 84 44 74 42 C62 46 46 48 33 52 C30 54 28 57 27 60 Z"
        {...hairStyle}
      />
    );
  }
  // 기본 웨이브 — 헤어를 안 샀으면 같은 모양을 실루엣 색으로
  const wave =
    'M27 60 C24 30 40 15 60 15 C80 15 96 30 93 60 C91 54 89 50 86 47 C82 53 76 53 72 46 C68 53 61 53 57 46 C53 53 46 53 43 46 C39 51 34 53 33 56 C31 56 29 58 27 60 Z';
  return id === 'hair-wave' ? (
    <path d={wave} {...hairStyle} />
  ) : (
    <path d={wave} fill={S} />
  );
}

/* ------------------------------------------------------------------ */
/* 상의 */

const TOP_COLOR: Record<string, string> = {
  'top-vest': '#fbfaf6', // 셔츠 소매(조끼 안)
  'top-shirt': '#cfe0f2',
  'top-cardigan': '#d9bf9a',
  'top-hoodie': '#f3cd4b',
  'top-coat': '#c79a63',
};

function Arms({ top, S }: { top?: string; S: string }) {
  const color = top ? TOP_COLOR[top] : S;
  const arm = (d: string) => (
    <g key={d}>
      {top ? (
        <path d={d} fill="none" stroke={OUTLINE} strokeWidth="13" strokeLinecap="round" />
      ) : null}
      <path d={d} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
    </g>
  );
  return (
    <g>
      {arm(ARM_L)}
      {arm(ARM_R)}
    </g>
  );
}

function Top({ id, S }: { id?: string; S: string }) {
  const o = { stroke: OUTLINE, strokeWidth: 2, strokeLinejoin: 'round' as const };
  if (!id || !TOP_COLOR[id]) return <path d={TORSO} fill={S} />;

  if (id === 'top-vest') {
    return (
      <g>
        <path d={TORSO} fill="#fbfaf6" {...o} />
        <path d="M54 93 L60 101 L52 104 Z M66 93 L60 101 L68 104 Z" fill="#fff" {...o} />
        <path
          d="M40 98 L52 98 L60 116 L68 98 L80 98 L84 140 Q60 146 36 140 Z"
          fill="#f3e3bf"
          {...o}
        />
        <path d="M37 134 Q60 140 83 134" fill="none" stroke="#d8c39a" strokeWidth="2" />
      </g>
    );
  }
  if (id === 'top-shirt') {
    return (
      <g>
        <path d={TORSO} fill="#cfe0f2" {...o} />
        <path d="M54 93 L60 102 L51 105 Z M66 93 L60 102 L69 105 Z" fill="#e8f1fa" {...o} />
        <line x1="60" y1="102" x2="60" y2="144" stroke={OUTLINE} strokeWidth="1.4" />
        {[110, 120, 130].map((y) => (
          <circle key={y} cx="63" cy={y} r="1.5" fill={OUTLINE} />
        ))}
      </g>
    );
  }
  if (id === 'top-cardigan') {
    return (
      <g>
        <path d={TORSO} fill="#d9bf9a" {...o} />
        <path d="M51 95 L60 121 L69 95 Z" fill="#fbfaf6" {...o} />
        <line x1="60" y1="121" x2="60" y2="145" stroke={OUTLINE} strokeWidth="1.6" />
        {[127, 137].map((y) => (
          <circle key={y} cx="64" cy={y} r="2" fill="#8a6a45" />
        ))}
      </g>
    );
  }
  if (id === 'top-hoodie') {
    return (
      <g>
        <path d={TORSO} fill="#f3cd4b" {...o} />
        <ellipse cx="60" cy="96" rx="17" ry="6" fill="#e3b93a" {...o} />
        <g stroke={OUTLINE} strokeWidth="1.6" strokeLinecap="round">
          <line x1="56" y1="100" x2="55" y2="114" />
          <line x1="64" y1="100" x2="65" y2="114" />
        </g>
        <path d="M45 124 L75 124 L79 139 L41 139 Z" fill="#e3b93a" {...o} />
      </g>
    );
  }
  // 코트 — 길어서 다리를 덮는다
  return (
    <g>
      <path d="M37 96 Q60 90 83 96 L90 160 Q60 166 30 160 Z" fill="#c79a63" {...o} />
      <path d="M52 95 L60 118 L68 95 Z" fill="#fbfaf6" {...o} />
      <path d="M53 94 L60 116 L46 106 Z M67 94 L60 116 L74 106 Z" fill="#b5864f" {...o} />
      {[126, 140].map((y) => (
        <circle key={y} cx="65" cy={y} r="2.2" fill="#6b4a2a" />
      ))}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* 하의 · 신발 */

const BOTTOM_COLOR: Record<string, string> = {
  'bottom-slacks': '#4a4a52',
  'bottom-jeans': '#4f77a8',
  'bottom-chino': '#d8c39a',
};

function Leg({
  x,
  bottom,
  skin,
  S,
  skinLine,
}: {
  x: number;
  bottom?: string;
  skin: string;
  S: string;
  skinLine: Record<string, unknown>;
}) {
  // 바지를 입었으면 바지 색, 치마면 다리(피부), 아무것도 안 입었으면 실루엣
  if (bottom && BOTTOM_COLOR[bottom]) {
    return (
      <rect
        x={x}
        y={138}
        width={14}
        height={44}
        rx={5}
        fill={BOTTOM_COLOR[bottom]}
        stroke={OUTLINE}
        strokeWidth={2}
      />
    );
  }
  if (bottom === 'bottom-skirt') {
    return <rect x={x + 2} y={150} width={10} height={32} rx={5} fill={skin} {...skinLine} />;
  }
  return <rect x={x} y={138} width={14} height={44} rx={5} fill={S} />;
}

function Skirt() {
  return (
    <g>
      <path
        d="M39 136 L81 136 L89 166 Q60 171 31 166 Z"
        fill="#34466e"
        stroke={OUTLINE}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <g stroke="#26355a" strokeWidth="1.5">
        <line x1="50" y1="140" x2="46" y2="167" />
        <line x1="60" y1="140" x2="60" y2="168" />
        <line x1="70" y1="140" x2="74" y2="167" />
      </g>
    </g>
  );
}

const SHOE_COLOR: Record<string, string> = {
  'shoes-sneakers': '#f5f2ec',
  'shoes-dress': '#2b2b2e',
  'shoes-loafer': '#7a4a2c',
};

function Shoe({ cx, id, S }: { cx: number; id?: string; S: string }) {
  if (!id || !SHOE_COLOR[id]) {
    return <ellipse cx={cx} cy={183} rx={11} ry={6} fill={S} />;
  }
  return (
    <g>
      <ellipse cx={cx} cy={183} rx={11} ry={6} fill={SHOE_COLOR[id]} stroke={OUTLINE} strokeWidth={2} />
      {id === 'shoes-sneakers' ? (
        <path d={`M${cx - 10} 185 L${cx + 10} 185`} stroke="#c9c2b6" strokeWidth={2} />
      ) : null}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* 액세서리 */

function Glasses() {
  return (
    <g fill="rgba(255,255,255,0.18)" stroke="#2b2b2e" strokeWidth="2">
      <circle cx="48" cy="60" r="7.5" />
      <circle cx="72" cy="60" r="7.5" />
      <path d="M55.5 59 Q60 56.5 64.5 59" fill="none" />
      <path d="M40.5 58 L32 56" fill="none" />
      <path d="M79.5 58 L88 56" fill="none" />
    </g>
  );
}

function Tie() {
  const o = { stroke: OUTLINE, strokeWidth: 1.6, strokeLinejoin: 'round' as const };
  return (
    <g fill="#2f3e6b">
      <path d="M56 97 L64 97 L62.5 103 L57.5 103 Z" {...o} />
      <path d="M57.5 103 L62.5 103 L65 126 L60 132 L55 126 Z" {...o} />
    </g>
  );
}

function Scarf() {
  const o = { stroke: OUTLINE, strokeWidth: 2, strokeLinejoin: 'round' as const };
  return (
    <g fill="#c8524a">
      <path d="M66 98 L75 98 L77 126 L66 124 Z" {...o} />
      <path d="M39 89 Q60 99 81 89 L83 100 Q60 111 37 100 Z" {...o} />
      <g stroke="#9c3a33" strokeWidth="1.5">
        <line x1="68" y1="124" x2="68" y2="129" />
        <line x1="72" y1="125" x2="72" y2="130" />
        <line x1="76" y1="126" x2="76" y2="130" />
      </g>
    </g>
  );
}

function Cap() {
  const o = { stroke: OUTLINE, strokeWidth: 2, strokeLinejoin: 'round' as const };
  return (
    <g>
      <path d="M25 42 C25 18 43 9 60 9 C77 9 95 18 95 42 Q60 34 25 42 Z" fill="#4f74c4" {...o} />
      <path d="M21 43 Q60 32 99 43 Q60 54 21 43 Z" fill="#3e5fa6" {...o} />
      <ellipse cx="60" cy="25" rx="7" ry="4" fill="#fff" />
      <path d="M66 25 L71 21.5 L71 28.5 Z" fill="#fff" />
    </g>
  );
}

/** 미리보기 카드에서 아이템 종류마다 보여줄 부분 */
export const PREVIEW_VIEWBOX: Record<Slot, string> = {
  skin: '14 2 92 98',
  hair: '10 2 100 112',
  glasses: '14 2 92 98',
  hat: '14 2 92 98',
  top: '16 84 88 86',
  neck: '24 78 72 60',
  bottom: '22 128 76 64',
  shoes: '30 168 60 26',
  bag: '14 80 92 70',
};

/** 아바타 하나를 svg 로 감싼 것 */
export function AvatarSvg({
  viewBox = '0 0 120 200',
  className,
  title,
  ...rest
}: Props & { viewBox?: string; className?: string; title?: string }): ReactNode {
  return (
    <svg
      className={className}
      viewBox={viewBox}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <Avatar {...rest} />
    </svg>
  );
}
