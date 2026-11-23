import { useEffect, useMemo, useState } from 'react';
import { isEveningScene } from '../lib/devTime';
import { evaluateEscalation } from '../lib/escalation';
import { StallPhotoScene } from '../scenes/StallPhotoScene';
import { loadCheckIns } from '../storage/store';
import { MenuSheet } from './home/MenuSheet';
import { SpeechBubble } from './home/SpeechBubble';

interface Props {
  onStartCheckIn: () => void;
  onOpenJournal: () => void;
  onOpenSummary: () => void;
  onOpenReview: () => void;
  onOpenCalendar: () => void;
  onOpenSettings: () => void;
}

/** 말풍선이 저절로 뜨기까지 기다리는 시간 */
const BUBBLE_DELAY_MS = 1000;

/**
 * 명세 9절 화면 2 — 노점 홈.
 * 장면이 화면을 채우고, 주된 두 가지 행동은 말풍선 안에 있다.
 * 나머지 메뉴는 메뉴판 시트로 내려간다.
 */
export function Home({
  onStartCheckIn,
  onOpenJournal,
  onOpenSummary,
  onOpenReview,
  onOpenCalendar,
  onOpenSettings,
}: Props) {
  const evening = isEveningScene();
  const [bubbleShown, setBubbleShown] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // 명세 7.2 — 자원 제안 카드가 뜰 주인지. 메뉴판에 작은 표시를 붙인다
  const escalated = useMemo(
    () => evaluateEscalation(loadCheckIns()).triggered,
    [],
  );

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
          <SpeechBubble
            evening={evening}
            onCheckIn={onStartCheckIn}
            onJournal={onOpenJournal}
          />
        ) : (
          <p className="stall-photo-hint">화면을 누르면 사장님이 말을 걸어요</p>
        )}

        <button
          className="menu-tag"
          onClick={(e) => {
            e.stopPropagation();
            setSheetOpen(true);
          }}
          aria-label={`메뉴판${escalated ? ' — 살펴볼 것이 있어요' : ''}`}
        >
          메뉴판
          {escalated ? <span className="menu-dot" /> : null}
        </button>

        <MenuSheet
          open={sheetOpen}
          escalated={escalated}
          onClose={() => setSheetOpen(false)}
          onOpenSummary={onOpenSummary}
          onOpenReview={onOpenReview}
          onOpenCalendar={onOpenCalendar}
          onOpenSettings={onOpenSettings}
        />
      </div>
    </StallPhotoScene>
  );
}
