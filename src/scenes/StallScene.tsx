import { Stall } from './Stall';

interface Props {
  /** 오후 5시 이후인가 — 전구가 켜지고 하늘이 노을로 바뀐다 */
  lit: boolean;
  children: React.ReactNode;
}

/**
 * 홈 화면의 배경 장면. 하늘·땅은 CSS 그라데이션이고,
 * 노점만 SVG 로 그려 원경에 작게 놓는다.
 * 색은 src/styles/scene.css 의 .scene-home 변수에서 온다.
 */
export function StallScene({ lit, children }: Props) {
  return (
    <div className="scene-home" data-lit={lit}>
      <div className="scene-sky" aria-hidden="true" />
      <div className="scene-ground" aria-hidden="true" />
      <div className="scene-stall" aria-hidden="true">
        <svg viewBox="0 0 216 168">
          <Stall lit={lit} />
        </svg>
      </div>
      <div className="scene-content">{children}</div>
    </div>
  );
}
