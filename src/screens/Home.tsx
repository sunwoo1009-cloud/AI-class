import { useEffect, useState } from 'react';
import { isEveningScene } from '../lib/devTime';
import { StallPhotoScene } from '../scenes/StallPhotoScene';
import { SpeechBubble } from './home/SpeechBubble';

interface Props {
  onStartCheckIn: () => void;
  onOpenJournal: () => void;
}

/** 말풍선이 저절로 뜨기까지 기다리는 시간 */
const BUBBLE_DELAY_MS = 1000;

/**
 * 명세 9절 화면 2 — 노점 홈.
 * 장면이 화면을 채우고, 주된 두 가지 행동은 말풍선 안에 있다.
 * 나머지 메뉴는 아래 고정 탭 막대에 있다 (2026-11-27 — 왼쪽 위 메뉴 바에서 옮김).
 * 탭 막대는 App 이 홈과 메뉴 화면에 함께 붙인다 (TabBar).
 */
export function Home({ onStartCheckIn, onOpenJournal }: Props) {
  const evening = isEveningScene();
  const [bubbleShown, setBubbleShown] = useState(false);

  // 처음 1초는 장면만 보여준다
  useEffect(() => {
    const t = window.setTimeout(() => setBubbleShown(true), BUBBLE_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <StallPhotoScene lit={evening}>
      {/* 화면 아무 데나 누르면 기다리지 않고 바로 말풍선이 뜬다 */}
      <div
        className="stall-photo-content"
        onClick={() => setBubbleShown(true)}
        role="presentation"
      >
        {bubbleShown ? (
          <SpeechBubble onCheckIn={onStartCheckIn} onJournal={onOpenJournal} />
        ) : null}
      </div>
    </StallPhotoScene>
  );
}
