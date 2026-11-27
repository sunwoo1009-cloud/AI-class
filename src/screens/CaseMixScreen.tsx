import { useState } from 'react';
import { BackButton, Snackbar } from '../components/ui';
import {
  bumpCase,
  CASE_KINDS,
  caseMix,
  countOn,
  shouldShowTraumaSnack,
  TRAUMA_LOAD,
  TRAUMA_SNACK_TEXT,
} from '../lib/caseMix';
import type { CaseEntry, CaseKind } from '../lib/caseMix';
import { toDateKey } from '../lib/date';
import { loadCaseLog, loadTraumaSnoozeAt, saveCaseLog, saveTraumaSnoozeAt } from '../storage/store';

interface Props {
  onBack: () => void;
  /** 발표용 — 예시 기록으로 보여주고 저장하지 않는다 */
  demo?: boolean;
}

/** 종류마다 막대 색 — 외상만 진하게, 나머지는 팔레트 안의 연한 색 */
const KIND_COLOR: Record<CaseKind, string> = {
  trauma: '#b2452f',
  crisis: '#d98b5f',
  mood: '#3a6279',
  relation: '#7fa6bd',
  study: '#c9a45c',
  other: '#b9ab95',
};

export function demoCaseLog(): CaseEntry[] {
  const out: CaseEntry[] = [];
  const d = new Date();
  const plan: [number, CaseKind, number][] = [
    [0, 'trauma', 2],
    [0, 'mood', 1],
    [1, 'trauma', 3],
    [2, 'trauma', 2],
    [2, 'relation', 1],
    [5, 'trauma', 2],
    [6, 'crisis', 1],
    [8, 'study', 2],
    [12, 'trauma', 1],
  ];
  for (const [ago, kind, count] of plan) {
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ago);
    out.push({ date: toDateKey(day), kind, count });
  }
  return out;
}

/**
 * 나의 사례 비율 (명세 7.11) — 2026-11-27 마이페이지 안의 칸에서 따로 화면으로 옮기고 이름을 바꿨다
 * (전에는 '사례 종류 비율', 사용자 요청). 마이페이지 목록에서 들어온다.
 */
export function CaseMixScreen({ onBack, demo = false }: Props) {
  const [log, setLog] = useState<CaseEntry[]>(() => (demo ? demoCaseLog() : loadCaseLog()));
  const today = toDateKey(new Date());
  const mix = caseMix(log);
  const [snack, setSnack] = useState(() =>
    shouldShowTraumaSnack(caseMix(demo ? demoCaseLog() : loadCaseLog()), demo ? null : loadTraumaSnoozeAt()),
  );
  function bump(kind: CaseKind, delta: 1 | -1) {
    const nextLog = bumpCase(log, today, kind, delta);
    setLog(nextLog);
    if (!demo) saveCaseLog(nextLog);
    // 기록하다 기준을 넘으면 그때 알린다 (이미 '확인'을 눌렀으면 7일 동안은 다시 띄우지 않는다)
    if (shouldShowTraumaSnack(caseMix(nextLog), demo ? null : loadTraumaSnoozeAt())) setSnack(true);
  }
  const pct = (n: number) => (mix.total ? Math.round((n / mix.total) * 100) : 0);

  return (
    <div className={`app mypage${snack ? ' has-snack' : ''}`}>
      <div className="topbar">
        <BackButton onClick={onBack} label="마이페이지로" />
        <span className="topbar-title">나의 사례 비율</span>
      </div>

      <h1>나의 사례 비율</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        오늘 본 회기를 종류마다 한 번씩 눌러 세요.
        <br />
        날짜와 종류만 남아요.
      </p>

      <section className="card my-cases">
        <div className="case-grid">
          {CASE_KINDS.map((k) => {
            const n = countOn(log, today, k.id);
            return (
              <div key={k.id} className={`case-chip${n ? ' is-on' : ''}`}>
                <button
                  type="button"
                  className="case-add"
                  onClick={() => bump(k.id, 1)}
                  aria-label={`${k.label} 회기 하나 더하기, 오늘 ${n}회`}
                >
                  <span className="case-swatch" style={{ background: KIND_COLOR[k.id] }} aria-hidden="true" />
                  <span className="case-name">
                    {k.label}
                    {k.sub ? <small>{k.sub}</small> : null}
                  </span>
                  <span className="case-n">{n}</span>
                </button>
                <button
                  type="button"
                  className="case-minus"
                  disabled={n === 0}
                  onClick={() => bump(k.id, -1)}
                  aria-label={`${k.label} 하나 빼기`}
                >
                  −
                </button>
              </div>
            );
          })}
        </div>

        <h3 className="case-h3">지난 30일</h3>
        {mix.total === 0 ? (
          <p className="muted">기록이 쌓이면 여기에 비율이 보여요.</p>
        ) : (
          <>
            <div
              className="case-bar"
              role="img"
              aria-label={CASE_KINDS.map((k) => `${k.label} ${pct(mix.byKind[k.id])}%`).join(', ')}
            >
              {CASE_KINDS.filter((k) => mix.byKind[k.id] > 0).map((k) => (
                <span key={k.id} style={{ flexGrow: mix.byKind[k.id], background: KIND_COLOR[k.id] }} />
              ))}
            </div>
            <ul className="case-legend">
              {CASE_KINDS.filter((k) => mix.byKind[k.id] > 0).map((k) => (
                <li key={k.id}>
                  <span className="case-swatch" style={{ background: KIND_COLOR[k.id] }} aria-hidden="true" />
                  {k.label} <b>{pct(mix.byKind[k.id])}%</b>
                </li>
              ))}
            </ul>
            <div
              className={`case-trauma${
                mix.traumaRatio !== null &&
                mix.total >= TRAUMA_LOAD.minSessions &&
                mix.traumaRatio >= TRAUMA_LOAD.highRatio
                  ? ' is-high'
                  : ''
              }`}
            >
              <span>전체 중 외상 사례</span>
              <b>{pct(mix.byKind.trauma)}%</b>
              <small>
                {mix.total}회기 중 {mix.byKind.trauma}회기
                {mix.total < TRAUMA_LOAD.minSessions
                  ? ` · ${TRAUMA_LOAD.minSessions}회기 이상 기록하면 비중을 살펴 드려요`
                  : ''}
              </small>
            </div>
          </>
        )}
      </section>

      <div className="spacer" />

      <Snackbar
        open={snack}
        message={TRAUMA_SNACK_TEXT}
        onAction={() => {
          setSnack(false);
          if (!demo) saveTraumaSnoozeAt(new Date().toISOString());
        }}
      />
    </div>
  );
}
