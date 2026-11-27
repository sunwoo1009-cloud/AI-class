import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { evaluateEscalation } from '../../lib/escalation';
import { pulseDue } from '../../lib/pulse';
import { loadCheckIns, loadPulse } from '../../storage/store';

/** 탭 막대에서 갈 수 있는 화면 */
export type TabTarget =
  | 'home'
  | 'mypage'
  | 'journalList'
  | 'summary'
  | 'review'
  | 'calendar'
  | 'coupons'
  | 'calendarLink'
  | 'pulse'
  | 'findHelp'
  | 'caseMix'
  | 'boutique'
  | 'rate'
  | 'settings';

/** 마이페이지 안에 든 화면 — 이 화면들에서는 '마이페이지' 탭이 켜진다 */
const MY_PAGE: TabTarget[] = [
  'mypage',
  'journalList',
  'summary',
  'review',
  'calendar',
  'coupons',
  'calendarLink',
  'pulse',
  'findHelp',
  'caseMix',
];

/** '더보기' 안에 든 화면 */
const MORE: { id: TabTarget; label: string; sub: string }[] = [
  { id: 'rate', label: '별점·리뷰', sub: '이 앱 어땠나요' },
  // '배경 음악'은 2026-11-27 사용자 요청으로 기능째 뺐다
  { id: 'settings', label: '설정', sub: '백업·가입·데이터' },
];

interface Props {
  /** 지금 보고 있는 화면 */
  active: TabTarget;
  onNavigate: (to: TabTarget) => void;
}

/**
 * 아래에 고정된 탭 막대 (2026-11-27 — 왼쪽 위 메뉴 바를 대신한다).
 * 2026-11-27 다시 묶음: 홈 · 마이페이지 · 옷장 · 더보기(별점·리뷰·설정 — 배경 음악은 같은 날 뺐다).
 * 주간 요약·돌아보기·캘린더·쿠폰 모음은 마이페이지 안으로 들어갔다.
 *
 * 마이페이지 탭의 숫자 배지 = 살펴볼 것의 수. 명세 7.2 자원 제안 카드가 떠 있으면 1,
 * 2주 점검을 할 때가 됐으면 1. 요약·점검이 탭 뒤에 있어서 그 신호를 놓치지 않게 붙인다.
 * 백업 알림(7.6)은 홈에 띄우지 않는다는 원칙대로 배지로 만들지 않았다.
 */
export function TabBar({ active, onNavigate }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const badge = useMemo(
    () =>
      (evaluateEscalation(loadCheckIns()).triggered ? 1 : 0) + (pulseDue(loadPulse()) ? 1 : 0),
    [],
  );
  const moreActive = MORE.some((m) => m.id === active);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  function go(to: TabTarget) {
    setMoreOpen(false);
    if (to !== active) onNavigate(to);
  }

  const tabs: { id: TabTarget | 'more'; label: string; icon: ReactNode; badge?: number }[] = [
    { id: 'home', label: '홈', icon: <IconHome /> },
    { id: 'mypage', label: '마이페이지', icon: <IconPerson />, badge },
    { id: 'boutique', label: '옷장', icon: <IconShirt /> },
    { id: 'more', label: '더보기', icon: <IconMore /> },
  ];

  return (
    <>
      {moreOpen ? (
        <div
          className="tabbar-backdrop"
          onClick={() => setMoreOpen(false)}
          aria-hidden="true"
        />
      ) : null}
      {moreOpen ? (
        <div className="tabbar-more" role="menu" aria-label="더보기">
          {MORE.map((m) => (
            <button
              key={m.id}
              role="menuitem"
              className={`tabbar-more-item${m.id === active ? ' is-on' : ''}`}
              onClick={() => go(m.id)}
            >
              <span className="tabbar-more-label">{m.label}</span>
              <span className="tabbar-more-sub">{m.sub}</span>
            </button>
          ))}
        </div>
      ) : null}

      <nav className="tabbar" aria-label="메뉴" onClick={(e) => e.stopPropagation()}>
        {tabs.map((t) => {
          const on =
            t.id === 'more'
              ? moreActive || moreOpen
              : t.id === 'mypage'
                ? MY_PAGE.includes(active)
                : t.id === active;
          return (
            <button
              key={t.id}
              className={`tabbar-tab${on ? ' is-on' : ''}`}
              aria-current={on && t.id !== 'more' ? 'page' : undefined}
              aria-expanded={t.id === 'more' ? moreOpen : undefined}
              aria-label={
                t.badge ? `${t.label} — 살펴볼 것 ${t.badge}개` : t.label
              }
              onClick={() =>
                t.id === 'more' ? setMoreOpen((o) => !o) : go(t.id)
              }
            >
              <span className="tabbar-icon" aria-hidden="true">
                {t.icon}
                {t.badge ? <span className="tabbar-badge">{t.badge}</span> : null}
              </span>
              <span className="tabbar-label" aria-hidden="true">
                {t.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

/* --- 아이콘 (선 굵기·모서리는 CSS 에서) --- */

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" focusable="false">
      {children}
    </svg>
  );
}
function IconHome() {
  return (
    <Svg>
      <path d="M4 11 L12 4.5 L20 11" />
      <path d="M6.5 9.5 V19.5 H17.5 V9.5" />
      <path d="M10 19.5 V14.5 H14 V19.5" />
    </Svg>
  );
}
function IconPerson() {
  return (
    <Svg>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 19.5 C5.8 15.6 8.6 13.8 12 13.8 C15.4 13.8 18.2 15.6 19 19.5" />
    </Svg>
  );
}
function IconShirt() {
  return (
    <Svg>
      <path d="M9 4.5 L4.5 7 L6 11 L8 10.2 V19.5 H16 V10.2 L18 11 L19.5 7 L15 4.5 C14.4 6 13.3 6.8 12 6.8 C10.7 6.8 9.6 6 9 4.5 Z" />
    </Svg>
  );
}
function IconMore() {
  return (
    <Svg>
      <circle cx="6" cy="12" r="1.3" />
      <circle cx="12" cy="12" r="1.3" />
      <circle cx="18" cy="12" r="1.3" />
    </Svg>
  );
}
