import { useEffect, useMemo, useState } from 'react';
import { isEveningScene } from '../lib/devTime';
import { evaluateEscalation } from '../lib/escalation';
import { StallPhotoScene } from '../scenes/StallPhotoScene';
import { loadCheckIns } from '../storage/store';
import { MenuDrawer } from './home/MenuDrawer';
import { SpeechBubble } from './home/SpeechBubble';

interface Props {
  onStartCheckIn: () => void;
  onOpenJournal: () => void;
  onOpenSummary: () => void;
  onOpenReview: () => void;
  onOpenCalendar: () => void;
  onOpenCoupons: () => void;
  onOpenBoutique: () => void;
  onOpenRate: () => void;
  onOpenSettings: () => void;
}

/** 말풍선이 저절로 뜨기까지 기다리는 시간 */
const BUBBLE_DELAY_MS = 1000;

/**
 * 명세 9절 화면 2 — 노점 홈.
 * 장면이 화면을 채우고, 주된 두 가지 행동은 말풍선 안에 있다.
 * 나머지 메뉴는 왼쪽 위 메뉴 바 뒤에 있다.
 */
export function Home({
  onStartCheckIn,
  onOpenJournal,
  onOpenSummary,
  onOpenReview,
  onOpenCalendar,
  onOpenCoupons,
  onOpenBoutique,
  onOpenRate,
  onOpenSettings,
}: Props) {
  const evening = isEveningScene();
  const [bubbleShown, setBubbleShown] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // 명세 7.2 — 자원 제안 카드가 뜰 주인지. 메뉴 바에 작은 표시를 붙인다
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
        <button
          className="menu-bar"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(true);
          }}
          aria-label={`메뉴 열기${escalated ? ' — 살펴볼 것이 있어요' : ''}`}
          aria-expanded={menuOpen}
        >
          <span className="menu-bar-lines" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          {escalated ? <span className="menu-bar-dot" /> : null}
        </button>

        {bubbleShown ? (
          <SpeechBubble
            onCheckIn={onStartCheckIn}
            onJournal={onOpenJournal}
          />
        ) : null}

        <MenuDrawer
          open={menuOpen}
          escalated={escalated}
          onClose={() => setMenuOpen(false)}
          onOpenSummary={onOpenSummary}
          onOpenReview={onOpenReview}
          onOpenCalendar={onOpenCalendar}
          onOpenCoupons={onOpenCoupons}
          onOpenBoutique={onOpenBoutique}
          onOpenRate={onOpenRate}
          onOpenSettings={onOpenSettings}
        />
      </div>
    </StallPhotoScene>
  );
}
