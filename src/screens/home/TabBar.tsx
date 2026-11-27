import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { evaluateEscalation } from '../../lib/escalation';
import { loadCheckIns } from '../../storage/store';

/** 탭 막대에서 갈 수 있는 화면 */
export type TabTarget =
  | 'home'
  | 'summary'
  | 'review'
  | 'calendar'
  | 'coupons'
  | 'boutique'
  | 'rate'
  | 'settings'
  | 'bgm';

/** '더보기' 안에 든 화면 */
const MORE: { id: TabTarget; label: string; sub: string }[] = [
  { id: 'review', label: '돌아보기', sub: '나아지고 있나' },
  { id: 'boutique', label: '부티크', sub: '도장으로 직장인 꾸미기' },
  { id: 'rate', label: '별점·리뷰', sub: '이 앱 어땠나요' },
  { id: 'bgm', label: '배경 음악', sub: '켜기·끄기, 음량' },
  { id: 'settings', label: '설정', sub: '백업·가입·데이터' },
];

interface Props {
  /** 지금 보고 있는 화면 */
  active: TabTarget;
  onNavigate: (to: TabTarget) => void;
}

/**
 * 아래에 고정된 탭 막대 (2026-11-27 — 왼쪽 위 메뉴 바를 대신한다).
 * 홈 · 주간 요약 · 캘린더 · 쿠폰 · 더보기(돌아보기·부티크·별점·설정).
 *
 * 주간 요약 탭의 숫자 배지는 명세 7.2 자원 제안 카드가 떠 있다는 표시다.
 * 요약이 탭 뒤로 들어가 있어서 그 신호를 놓치지 않게 붙인다.
 * 백업 알림(7.6)은 홈에 띄우지 않는다는 원칙대로 배지로 만들지 않았다.
 */
export function TabBar({ active, onNavigate }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const escalated = useMemo(() => evaluateEscalation(loadCheckIns()).triggered, []);
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
    { id: 'summary', label: '주간 요약', icon: <IconChart />, badge: escalated ? 1 : 0 },
    { id: 'calendar', label: '캘린더', icon: <IconCalendar /> },
    { id: 'coupons', label: '쿠폰', icon: <IconTicket /> },
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
          const on = t.id === 'more' ? moreActive || moreOpen : t.id === active;
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
function IconChart() {
  return (
    <Svg>
      <path d="M4.5 19.5 H19.5" />
      <path d="M7.5 16.5 V12" />
      <path d="M12 16.5 V7.5" />
      <path d="M16.5 16.5 V10" />
    </Svg>
  );
}
function IconCalendar() {
  return (
    <Svg>
      <rect x="4.5" y="6" width="15" height="13.5" rx="2.5" />
      <path d="M4.5 10.5 H19.5 M9 4 V7.5 M15 4 V7.5" />
    </Svg>
  );
}
function IconTicket() {
  return (
    <Svg>
      <path d="M4 7.5 H20 V10.5 A1.8 1.8 0 0 0 20 13.5 V16.5 H4 V13.5 A1.8 1.8 0 0 0 4 10.5 Z" />
      <path d="M14.5 8 V9.2 M14.5 11.4 V12.6 M14.5 14.8 V16" />
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
