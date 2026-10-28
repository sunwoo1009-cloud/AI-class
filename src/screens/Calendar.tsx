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
import { deleteJournal, loadCheckIns, loadJournal } from '../storage/store';
import type { CheckIn, JournalEntry } from '../types';

const PROMPT_LABELS: Record<JournalEntry['answers'][number]['promptId'], string> =
  {
    drain: '가장 지치게 한 것',
    response: '몸과 마음의 반응',
    let_go: '내려놓고 갈 것',
  };

interface Props {
  onBack: () => void;
}

/** 명세 7.5 / 9절 화면 11 */
export function Calendar({ onBack }: Props) {
  const checkIns = useMemo(() => loadCheckIns(), []);
  const [journal, setJournal] = useState(() => loadJournal());

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selected, setSelected] = useState<string | null>(null);

  const weeks = useMemo(
    () => buildMonthGrid(year, month, checkIns, journal, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [year, month, checkIns, journal],
  );

  const dayCheckIns = selected ? checkInsForDate(checkIns, selected) : [];

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

  return (
    <div className="app">
      <div className="topbar">
        <button className="btn-quiet" onClick={onBack}>
          홈으로
        </button>
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
              disabled={cell.checkInCount === 0 && !cell.hasJournal}
              onClick={() => setSelected(isSelected ? null : cell.dateKey)}
            >
              <span className="cal-day">{cell.day}</span>
              <span className="cal-marks">
                {Array.from({ length: Math.min(cell.checkInCount, 3) }).map(
                  (_, k) => (
                    <i key={k} className="cal-dot" />
                  ),
                )}
                {cell.hasJournal ? <i className="cal-journal" /> : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="cal-legend muted">
        <span>
          <i className="cal-dot" /> 체크인
        </span>
        <span>
          <i className="cal-journal" /> 일기
        </span>
      </div>

      {selected ? (
        <DayDetail
          dateKey={selected}
          checkIns={dayCheckIns}
          entry={journal.find((j) => j.date === selected) ?? null}
          onDeleteJournal={(id) => setJournal(deleteJournal(id))}
        />
      ) : (
        <p className="muted" style={{ marginTop: 18 }}>
          기록이 있는 날을 누르면 그날 내용이 보여요.
        </p>
      )}

      <div className="spacer" />
    </div>
  );
}

function DayDetail({
  dateKey,
  checkIns,
  entry,
  onDeleteJournal,
}: {
  dateKey: string;
  checkIns: CheckIn[];
  entry: JournalEntry | null;
  onDeleteJournal: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div style={{ marginTop: 18 }}>
      <h2>{formatDateLabel(dateKey)}</h2>

      {checkIns.length === 0 ? (
        <p className="muted">이날은 체크인 기록이 없어요.</p>
      ) : (
        checkIns.map((c) => (
          <div className="card" key={c.id}>
            <div className="stat-row">
              <span className="stat-label">{formatTimeLabel(c.timestamp)}</span>
              <span className="stat-value">
                {c.reactions.map((r) => reactionInfo(r).label).join(' · ')}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">SUDS</span>
              <span className="stat-value">
                {c.sudsPre}
                {c.techniques.length > 0 &&
                c.techniques[c.techniques.length - 1].sudsPost !== null
                  ? ` → ${c.techniques[c.techniques.length - 1].sudsPost}`
                  : ''}
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
        ))
      )}

      {entry && entry.answers.length > 0 ? (
        <>
          <h2 style={{ marginTop: 20 }}>그날 일기</h2>
          <div className="card">
            {entry.answers.map((a) => (
              <div key={a.promptId} style={{ marginBottom: 14 }}>
                <div className="stat-label">{PROMPT_LABELS[a.promptId]}</div>
                <p className="journal-body">{a.text}</p>
              </div>
            ))}
            {confirming ? (
              <div className="btn-row">
                <button
                  className="btn"
                  style={{ textAlign: 'center' }}
                  onClick={() => setConfirming(false)}
                >
                  그만두기
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    onDeleteJournal(entry.id);
                    setConfirming(false);
                  }}
                >
                  지우기
                </button>
              </div>
            ) : (
              <button className="btn-quiet" onClick={() => setConfirming(true)}>
                이 일기 지우기
              </button>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
