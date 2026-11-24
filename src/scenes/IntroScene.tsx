import { useRef, useState } from 'react';
import { Cityscape } from './Cityscape';
import { Steam } from './Steam';
import { StreetLamp } from './StreetLamp';
import { AvatarSvg } from '../avatar/Avatar';
import { loadCloset } from '../storage/store';

interface Props {
  /** 전환이 끝나면 호출된다 */
  onDone: () => void;
}

const FADE_MS = 420;

/**
 * 인트로 — 퇴근길.
 * 사람은 제자리에서 걷고 배경이 옆으로 흐른다. 오른쪽 끝의 김이 노점을 암시한다.
 * 1초 뒤 문구가 떠오른다.
 *
 * 자동 전환은 두지 않는다. 아래에 "탭하면 넘어가요"가 떠 있고,
 * 머무는 시간은 보는 사람이 정하는 쪽이 이 앱에 맞는다.
 */
export function IntroScene({ onDone }: Props) {
  const [leaving, setLeaving] = useState(false);
  const [equipped] = useState(() => loadCloset().equipped);
  const doneRef = useRef(false);

  function leave() {
    if (doneRef.current) return;
    doneRef.current = true;
    setLeaving(true);
    window.setTimeout(onDone, FADE_MS);
  }

  return (
    <div
      className={`scene-home intro${leaving ? ' intro-leaving' : ''}`}
      data-lit="true"
      onClick={leave}
      role="button"
      tabIndex={0}
      aria-label="탭하면 넘어갑니다"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') leave();
      }}
    >
      <div className="scene-sky" aria-hidden="true" />
      <div className="scene-ground" aria-hidden="true" />

      {/* 흐르는 배경 — 같은 타일 두 장을 이어 붙여 끊김 없이 돈다 */}
      <div className="intro-parallax" aria-hidden="true">
        <svg viewBox="0 0 780 240" preserveAspectRatio="xMidYMax meet">
          <g className="intro-scroll">
            {[0, 390].map((offset) => (
              <g key={offset} transform={`translate(${offset} 0)`}>
                <Cityscape lit width={390} transform="translate(0 196)" />
                <StreetLamp lit height={116} transform="translate(72 212)" />
                <StreetLamp lit height={116} transform="translate(286 212)" />
              </g>
            ))}
          </g>
        </svg>
      </div>

      {/* 걸어가는 사람 — 부티크에서 꾸민 모습 그대로 (명세 8.8).
          아무것도 안 꾸몄으면 실루엣이다. 제자리에서 다리를 번갈아 든다. */}
      <div className="intro-walker intro-avatar" aria-hidden="true">
        <AvatarSvg equipped={equipped} silhouette="var(--figure)" walking />
      </div>

      {/* 오른쪽 끝 — 노점이 가깝다는 암시 */}
      <div className="intro-hint-steam" aria-hidden="true">
        <svg viewBox="0 0 40 80">
          <Steam transform="translate(8 74)" strength="full" />
        </svg>
      </div>

      <div className="intro-copy">
        <p>어! 붕어빵 냄새다.</p>
        <p>집 가는 길에 하나 사갈까?</p>
      </div>

      <div className="intro-skip muted">탭하면 넘어가요</div>
    </div>
  );
}
