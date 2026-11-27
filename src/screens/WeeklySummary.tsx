import { useMemo, useState } from 'react';
import { evaluateEscalation } from '../lib/escalation';
import { buildWeeklySummary } from '../lib/summary';
import { loadCheckIns, loadWeeklySessions, saveWeeklySession } from '../storage/store';
import { BackButton } from '../components/ui';
import { reactionInfo } from '../constants';
import { FoodIcon } from './menu/FoodIcon';

interface Props {
  onBack: () => void;
}

/** 명세 7.1 / 7.2 / 9절 화면 9 */
export function WeeklySummary({ onBack }: Props) {
  const checkIns = useMemo(() => loadCheckIns(), []);
  const [sessionsList, setSessionsList] = useState(() => loadWeeklySessions());
  const [draft, setDraft] = useState('');

  const summary = useMemo(
    () => buildWeeklySummary(checkIns, sessionsList),
    [checkIns, sessionsList],
  );
  const escalation = useMemo(() => evaluateEscalation(checkIns), [checkIns]);

  function saveSessions() {
    const n = Number(draft);
    if (!Number.isFinite(n) || n < 0) return;
    setSessionsList(
      saveWeeklySession({ weekStart: summary.weekStart, sessions: Math.round(n) }),
    );
    setDraft('');
  }

  return (
    <div className="app">
      <div className="topbar">
        <BackButton onClick={onBack} label="마이페이지로" />
        <span className="topbar-title">최근 7일</span>
      </div>

      {/* 명세 7.2 — 자원 제안 카드는 요약 화면 상단에 */}
      {escalation.triggered ? (
        <div className="card card-note">
          <p>
            이번 주는 회기 후 부담이 큰 날이 많았어요.
            {summary.sessions !== null
              ? ` (이번 주 회기 수: ${summary.sessions}회)`
              : ''}
          </p>
          <p>혼자 정리하기보다 나눌 수 있는 자리가 있으면 좋겠어요.</p>
          <p style={{ marginBottom: 0 }} className="muted">
            수퍼비전 · 동료 상담 · 기관 EAP
          </p>
        </div>
      ) : null}

      <h1>이번 주 기록</h1>

      {summary.checkInCount === 0 ? (
        <p className="muted">최근 7일 안에 체크인 기록이 없어요.</p>
      ) : (
        <>
          {/* 2026-11-27 — 줄 목록 대신 grid 타일 (사용자 요청) */}
          <div className="ws-grid">
            {(
              [
                ['체크인', `${summary.checkInCount}회`],
                ['하기 전 평균 점수', summary.avgSudsPre ?? '—'],
                ['재평가 평균', summary.avgSudsPost ?? '—'],
                ['이번 주 회기 수', summary.sessions !== null ? `${summary.sessions}회` : '—'],
              ] as const
            ).map(([label, value]) => (
              <div className="ws-tile" key={label}>
                <span className="ws-value">{value}</span>
                <span className="ws-label">{label}</span>
              </div>
            ))}
          </div>

          <h2>반응 유형</h2>
          <div className="ws-grid ws-grid-3">
            {summary.reactionCounts.map((r) => (
              <div className={`ws-tile${r.count ? '' : ' is-zero'}`} key={r.reaction}>
                <FoodIcon className="ws-icon" kind={reactionInfo(r.reaction).menuItem.icon} />
                <span className="ws-value">{r.count}회</span>
                <span className="ws-label">{r.label}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {summary.sessions === null ? (
        <div className="card">
          <p className="muted">
            이번 주 회기 수를 입력하면 요약에 함께 표시돼요.
          </p>
          <div className="btn-row">
            <input
              className="btn"
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="회기 수"
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary"
              style={{ width: 'auto', padding: '16px 20px' }}
              disabled={draft.trim() === ''}
              onClick={saveSessions}
            >
              저장
            </button>
          </div>
        </div>
      ) : null}

      <div className="spacer" />
    </div>
  );
}
