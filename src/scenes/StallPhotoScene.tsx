import { useState } from 'react';
import { Owner } from './Owner';
import { StallScene } from './StallScene';

interface Props {
  /** 오후 5시 이후인가 */
  lit: boolean;
  children: React.ReactNode;
}

/**
 * 노점 사진이 화면을 가득 채우는 홈 장면.
 * 배경 이미지를 못 불러오면 기존 SVG 노점(StallScene)으로 떨어진다.
 * 위치 조정은 전부 home-scene.css 의 CSS 변수로 한다.
 */
export function StallPhotoScene({ lit, children }: Props) {
  const [bgFailed, setBgFailed] = useState(false);

  if (bgFailed) {
    return <StallScene lit={lit}>{children}</StallScene>;
  }

  return (
    <div className="stall-photo scene-home" data-lit={lit}>
      <img
        className="stall-photo-bg"
        src="/images/stall-bg.png"
        alt=""
        aria-hidden="true"
        draggable={false}
        onError={() => setBgFailed(true)}
      />

      {/* 찜기에서 오르는 김 */}
      <div className="stall-photo-steam" aria-hidden="true">
        <svg viewBox="0 0 60 120" preserveAspectRatio="none">
          <g
            fill="none"
            stroke="#ffffff"
            strokeLinecap="round"
            strokeWidth="9"
          >
            <path d="M16 116 C8 92, 22 76, 14 50 C9 32, 20 18, 16 2" />
            <path d="M32 118 C24 90, 38 72, 30 44 C25 26, 36 12, 32 -4" />
            <path d="M46 116 C40 96, 50 82, 44 60 C40 44, 48 32, 46 18" />
          </g>
        </svg>
      </div>

      <Owner />

      <div className="stall-photo-content">{children}</div>
    </div>
  );
}
