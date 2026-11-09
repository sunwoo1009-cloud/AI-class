import { useState } from 'react';
import { Walker } from './Walker';

interface Props {
  /** 숨쉬기 움직임. prefers-reduced-motion 에서는 CSS가 끈다 */
  breathing?: boolean;
}

/**
 * 가판대 뒤에 선 사장님.
 *
 * owner.png 가 있으면 그걸 쓰고, 없으면 인트로에 쓰는 실루엣을
 * 선 자세·가방 없이 돌려 쓴다. 가판대 쪽을 보도록 좌우를 뒤집는다.
 *
 * 위치·크기·잘리는 높이는 home-scene.css 의 --owner-* 변수로 조정한다.
 * 컨테이너가 가판대 선에서 잘라내므로 상체만 보인다.
 */
export function Owner({ breathing = true }: Props) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={`owner${breathing ? ' owner-breathing' : ''}`}
      aria-hidden="true"
    >
      <div className="owner-inner">
        {failed ? (
          // 머리부터 허리까지만 잘라 쓴다. 아래는 가판대에 가린다.
          <svg
            viewBox="14 0 38 62"
            preserveAspectRatio="xMidYMin slice"
            className="owner-figure"
          >
            <g transform="translate(64 0) scale(-1 1)">
              <Walker pose="stand" bag={false} walking={false} />
            </g>
          </svg>
        ) : (
          <img
            src="/images/owner.png"
            alt=""
            onError={() => setFailed(true)}
            draggable={false}
          />
        )}
      </div>
    </div>
  );
}
