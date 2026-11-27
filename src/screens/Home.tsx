import { useEffect, useState } from 'react';
import { isEveningScene } from '../lib/devTime';
import { StallPhotoScene } from '../scenes/StallPhotoScene';
import { SpeechBubble } from './home/SpeechBubble';
import { NUDGE_TEXT } from '../lib/sessionCalendar';

interface Props {
  onStartCheckIn: () => void;
  onOpenJournal: () => void;
  /** 캘린더의 회기가 막 끝났을 때 위에 뜨는 알림 띠 (2026-11-27, 캘린더 앱 연동) */
  nudge?: { onStart: () => void; onDismiss: () => void };
}

/** 말풍선이 저절로 뜨기까지 기다리는 시간 */
const BUBBLE_DELAY_MS = 1000;

/**
 * 명세 9절 화면 2 — 노점 홈.
 * 장면이 화면을 채우고, 주된 두 가지 행동은 말풍선 안에 있다.
 * 나머지 메뉴는 아래 고정 탭 막대에 있다 (2026-11-27 — 왼쪽 위 메뉴 바에서 옮김).
 * 탭 막대는 App 이 홈과 메뉴 화면에 함께 붙인다 (TabBar).
 */
export function Home({ onStartCheckIn, onOpenJournal, nudge }: Props) {
  const evening = isEveningScene();
  const [bubbleShown, setBubbleShown] = useState(false);

  // 처음 1초는 장면만 보여준다
  useEffect(() => {
    const t = window.setTimeout(() => setBubbleShown(true), BUBBLE_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <StallPhotoScene lit={evening}>
      {nudge ? (
        <div className="home-nudge" role="status">
          <p>{NUDGE_TEXT}</p>
          <div className="home-nudge-btns">
            <button type="button" className="home-nudge-go" onClick={nudge.onStart}>
              정리하기
            </button>
            <button type="button" className="home-nudge-x" onClick={nudge.onDismiss} aria-label="알림 닫기">
              ✕
            </button>
          </div>
        </div>
      ) : null}
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
