import { Bulbs } from './Bulbs';
import { Steam } from './Steam';

interface Props {
  lit: boolean;
  transform?: string;
}

/**
 * 간식 노점 — 비닐 천막, 나무 가판대, 찜기.
 * 납작한 기하학 도형만 쓴다. 다른 장면에서도 쓸 수 있게 <g> 만 돌려준다.
 * 자체 좌표계는 가로 216 · 세로 168 이다.
 */
export function Stall({ lit, transform }: Props) {
  return (
    <g transform={transform}>
      {/* 바닥 그림자 */}
      <ellipse cx="108" cy="158" rx="86" ry="7" fill="var(--ground-deep)" opacity=".45" />

      {/* 기둥 */}
      <rect x="20" y="44" width="5" height="112" fill="var(--post)" />
      <rect x="191" y="44" width="5" height="112" fill="var(--post)" />

      {/* 비닐 천막 — 줄무늬 */}
      <path d="M10 44 L18 16 L198 16 L206 44 Z" fill="var(--canopy)" />
      <g fill="var(--canopy-alt)">
        <path d="M40 16 L62 16 L58 44 L34 44 Z" />
        <path d="M84 16 L106 16 L106 44 L82 44 Z" />
        <path d="M128 16 L150 16 L154 44 L130 44 Z" />
        <path d="M172 16 L194 16 L200 44 L178 44 Z" />
      </g>
      {/* 천막 아랫단 */}
      <rect x="8" y="44" width="200" height="6" rx="3" fill="var(--canopy-edge)" />
      {/* 천막 윗마루 */}
      <rect x="16" y="13" width="184" height="5" rx="2.5" fill="var(--canopy-edge)" />

      {/* 찜기 — 가판대 위, 둥근 통 2단 */}
      <g>
        <rect x="62" y="86" width="44" height="12" rx="4" fill="var(--steamer-dark)" />
        <rect x="64" y="74" width="40" height="14" rx="4" fill="var(--steamer)" />
        <rect x="66" y="68" width="36" height="8" rx="4" fill="var(--steamer-dark)" />
        <rect x="80" y="63" width="8" height="5" rx="2.5" fill="var(--steamer-dark)" />
      </g>

      {/* 가판대 */}
      <rect x="26" y="98" width="164" height="7" rx="2" fill="var(--wood)" />
      <rect x="32" y="105" width="152" height="34" fill="var(--wood-dark)" />
      <g stroke="var(--wood)" strokeWidth="1.4" opacity=".55">
        <line x1="60" y1="107" x2="60" y2="137" />
        <line x1="92" y1="107" x2="92" y2="137" />
        <line x1="124" y1="107" x2="124" y2="137" />
        <line x1="156" y1="107" x2="156" y2="137" />
      </g>

      {/* 붕어빵 틀 — 가판대 오른쪽에 납작한 판 */}
      <rect x="128" y="88" width="48" height="10" rx="3" fill="var(--steamer-dark)" />
      <g fill="var(--steamer)">
        <circle cx="138" cy="93" r="2.6" />
        <circle cx="148" cy="93" r="2.6" />
        <circle cx="158" cy="93" r="2.6" />
        <circle cx="168" cy="93" r="2.6" />
      </g>

      <Bulbs lit={lit} count={3} width={150} wireTop={52} transform="translate(33 0)" />

      <Steam transform="translate(72 62)" strength={lit ? 'full' : 'soft'} />
    </g>
  );
}
