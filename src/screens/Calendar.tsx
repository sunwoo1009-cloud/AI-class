import { useMemo, useState } from 'react';
import { TECHNIQUE_LABELS, reactionInfo } from '../constants';
import {
  WEEKDAY_LABELS,
  buildMonthGrid,
  canGoNext,
  checkInsForDate,
  monthLabel,
} from '../lib/calendar';
import { formatDateLabel, formatTimeLabel } from '../lib/date';
import { loadCheckIns } from '../storage/store';
import type { CheckIn } from '../types';
import { BackButton, BottomSheet } from '../components/ui';

interface Props {
  onBack: () => void;
}

/**
 * 명세 7.5 / 9절 화면 11.
 * 2026-11-27 — 체크인 기록만 보인다(일기는 마이페이지 → 하루 끝 일기에서 본다).
 * 날짜를 누르면 그날 체크인이 아래 시트(bottom sheet)로 올라온다.
 */
export function Calendar({ onBack }: Props) {
  const checkIns = useMemo(() => loadCheckIns(), []);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selected, setSelected] = useState<string | null>(null);
  /** 시트가 내려가는 동안에도 내용이 남아 있게 */
  const [shownDate, setShownDate] = useState<string | null>(null);

  const weeks = useMemo(
    () => buildMonthGrid(year, month, checkIns, [], now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [year, month, checkIns],
  );

  function shift(delta: number) {
    const m = month + delta;
    if (m < 1) {
      setYear(year - 1);
      setMonth(12);
    } else if (m > 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(m);
    }
    setSelected(null);
  }

  const monthCount = weeks.flat().reduce((n, c) => n + (c.dateKey ? c.checkInCount : 0), 0);

  return (
    <div className="app">
      <div className="topbar">
        <BackButton onClick={onBack} label="마이페이지로" />
        <span className="topbar-title">캘린더</span>
      </div>

      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={() => shift(-1)} aria-label="이전 달">
          ‹
        </button>
        <span className="cal-nav-label">{monthLabel(year, month)}</span>
        <button
          className="cal-nav-btn"
          onClick={() => shift(1)}
          disabled={!canGoNext(year, month, now)}
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      <div className="cal-weekdays">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div className="cal-grid">
        {weeks.flat().map((cell, i) => {
          if (cell.dateKey === null) {
            return <span key={`e${i}`} className="cal-cell cal-cell-empty" />;
          }
          const isSelected = selected === cell.dateKey;
          return (
            <button
              key={cell.dateKey}
              className={[
                'cal-cell',
                cell.isToday ? 'is-today' : '',
                isSelected ? 'is-selected' : '',
                cell.isFuture ? 'is-future' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={cell.checkInCount === 0}
              aria-label={`${cell.day}일 체크인 ${cell.checkInCount}회`}
              onClick={() => {
                setSelected(cell.dateKey);
                setShownDate(cell.dateKey);
              }}
            >
              <span className="cal-day">{cell.day}</span>
              <span className="cal-marks">
                {Array.from({ length: Math.min(cell.checkInCount, 3) }).map((_, k) => (
                  <i key={k} className="cal-dot" />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="cal-legend muted">
        <span>
          <i className="cal-dot" /> 체크인 (이번 달 {monthCount}회)
        </span>
      </div>

      <p className="muted" style={{ marginTop: 18 }}>
        점이 있는 날을 누르면 그날 체크인 기록이 아래에서 올라와요.
      </p>

      <div className="spacer" />

      <BottomSheet
        open={selected !== null}
        title={shownDate ? formatDateLabel(shownDate) : ''}
        onClose={() => setSelected(null)}
      >
        {shownDate ? <DayCheckIns checkIns={checkInsForDate(checkIns, shownDate)} /> : null}
      </BottomSheet>
    </div>
  );
}

function DayCheckIns({ checkIns }: { checkIns: CheckIn[] }) {
  if (checkIns.length === 0) return <p className="muted">이날은 체크인 기록이 없어요.</p>;
  return (
    <>
      <p className="muted" style={{ marginTop: 0 }}>
        체크인 {checkIns.length}회
      </p>
      {checkIns.map((c) => {
        const last = c.techniques.length ? c.techniques[c.techniques.length - 1].sudsPost : null;
        return (
          <div className="card cal-sheet-card" key={c.id}>
            <div className="stat-row">
              <span className="stat-label">{formatTimeLabel(c.timestamp)}</span>
              <span className="stat-value">
                {c.reactions.map((r) => reactionInfo(r).label).join(' · ')}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">하기 전 → 재평가</span>
              <span className="stat-value">
                {c.sudsPre}
                {last !== null ? ` → ${last}` : ''}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">기법</span>
              <span className="stat-value">
                {c.techniques.length === 0
                  ? '없음'
                  : c.techniques.map((t) => TECHNIQUE_LABELS[t.id]).join(' → ')}
              </span>
            </div>
            {c.externalResourceOffered ? (
              <p className="muted" style={{ margin: '8px 0 0' }}>
                앱 밖 자원을 안내받은 회기예요.
              </p>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
