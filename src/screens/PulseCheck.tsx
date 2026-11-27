import { useState } from 'react';
import { BackButton, SegmentedControl } from '../components/ui';
import {
  PULSE_ITEMS,
  PULSE_LEVELS,
  pulseSignals,
  pulseTrend,
} from '../lib/pulse';
import type { PulseCheck as Check, PulseItem, PulseLevel, Trend } from '../lib/pulse';
import { addPulse, loadPulse, newId } from '../storage/store';

interface Props {
  onBack: () => void;
  /** 발표용 — 저장하지 않고 결과 화면까지 보여준다 */
  demo?: boolean;
  /** 발표용 — 결과 화면부터 */
  startAtResult?: boolean;
}

const TREND_LABEL: Record<Trend, string> = {
  up: '지난번보다 늘었어요',
  same: '지난번과 비슷해요',
  down: '지난번보다 줄었어요',
  first: '첫 점검이에요',
};

function demoHistory(): Check[] {
  const day = 24 * 60 * 60 * 1000;
  const t = Date.now();
  const mk = (ago: number, r: PulseLevel, d: PulseLevel, i: PulseLevel): Check => ({
    id: `demo-${ago}`,
    at: new Date(t - ago * day).toISOString(),
    answers: { recovery: r, distance: d, interest: i },
  });
  return [mk(42, 0, 0, 0), mk(28, 1, 0, 1), mk(14, 1, 1, 1), mk(0, 2, 1, 1)];
}

/**
 * 2주 점검 (2026-11-27 추가, 마이페이지).
 * 회복 시간 · 정서적 거리감 · 사례 개념화 흥미 — 지난 2주를 돌아보며 세 가지를 고른다.
 * 점수를 매기거나 진단하지 않고, 지난번과 비교해 늘었는지만 보여준다.
 */
export function PulseCheck({ onBack, demo = false, startAtResult = false }: Props) {
  const [answers, setAnswers] = useState<Partial<Record<PulseItem, PulseLevel>>>(() =>
    startAtResult ? demoHistory()[3].answers : {},
  );
  const [history, setHistory] = useState<Check[] | null>(() =>
    startAtResult ? demoHistory() : null,
  );
  const complete = PULSE_ITEMS.every((x) => answers[x.id] !== undefined);

  function save() {
    if (!complete) return;
    const check: Check = {
      id: newId(),
      at: new Date().toISOString(),
      answers: answers as Record<PulseItem, PulseLevel>,
    };
    const list = demo ? [...demoHistory().slice(0, 3), check] : addPulse(check);
    setHistory(list);
  }

  /* ---------- 결과 ---------- */
  if (history) {
    const signals = pulseSignals(history);
    const recent = history.slice(-6);
    return (
      <div className="app pulse">
        <div className="topbar">
          <BackButton onClick={onBack} label="마이페이지로" />
          <span className="topbar-title">2주 점검</span>
        </div>
        <h1>점검했어요</h1>
        <p className="muted">다음 점검은 2주 뒤예요. 마이페이지에서 알려 드려요.</p>

        {PULSE_ITEMS.map((x) => {
          const trend = pulseTrend(history, x.id);
          const level = history[history.length - 1].answers[x.id];
          return (
            <div key={x.id} className={`card pulse-res${signals.includes(x.id) ? ' is-signal' : ''}`}>
              <div className="pulse-res-head">
                <b>{x.title}</b>
                <span className={`pulse-trend is-${trend}`}>{TREND_LABEL[trend]}</span>
              </div>
              <p className="muted" style={{ margin: '2px 0 8px' }}>
                이번: {PULSE_LEVELS[level].label}
              </p>
              {/* 최근 점검들 — 막대 높이 = 고른 정도. 점수가 아니라 모양만 본다 */}
              <div className="pulse-bars" aria-label={`${x.title} 최근 ${recent.length}번`}>
                {recent.map((p) => (
                  <span
                    key={p.id}
                    className="pulse-bar"
                    style={{ height: `${8 + p.answers[x.id] * 10}px` }}
                    title={`${new Date(p.at).toLocaleDateString('ko-KR')} · ${PULSE_LEVELS[p.answers[x.id]].label}`}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {signals.length ? (
          <div className="card card-note">
            <p style={{ marginTop: 0, fontWeight: 700 }}>조기 신호일 수 있어요</p>
            <p className="muted" style={{ marginBottom: 6 }}>
              업무 부담이 쌓이고 있다는 신호일 수 있어요.
              <br />
              혼자 견디기보다
              <br />
              수퍼비전이나 동료와 나눌 자리를 찾아보세요.
            </p>
            <p className="muted" style={{ marginBottom: 0 }}>
              이 점검은 진단이 아니에요.
              <br />
              우울이나 외상 후 반응이 의심되면
              <br />
              전문가의 평가와 상담을 받는 것이 안전해요.
            </p>
          </div>
        ) : (
          <p className="muted">이 점검은 진단이 아니에요. 변화를 알아차리는 데 써 주세요.</p>
        )}

        <div className="spacer" />
        <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={onBack}>
          마이페이지로
        </button>
      </div>
    );
  }

  /* ---------- 질문 ---------- */
  const past = loadPulse();
  return (
    <div className="app pulse">
      <div className="topbar">
        <BackButton onClick={onBack} label="마이페이지로" />
        <span className="topbar-title">2주 점검</span>
      </div>
      <h1>지난 2주를 떠올려 보세요</h1>
      <p className="muted">
        세 가지만 골라요. 점수를 매기지 않고, 지난번과 비교해 달라진 것만 보여 드려요.
        {past.length ? ` 지금까지 ${past.length}번 점검했어요.` : ''}
      </p>

      {PULSE_ITEMS.map((x, n) => (
        <fieldset key={x.id} className="pulse-q">
          <legend>
            <span className="pulse-q-num">{n + 1}</span>
            <span>
              <small>{x.title}</small>
              {x.question}
            </span>
          </legend>
          {/* 2026-11-27 — 아니에요·조금·꽤·많이를 segmented control 로 (사용자 요청) */}
          <SegmentedControl
            label={x.title}
            options={PULSE_LEVELS.map((l) => ({ value: l.value, label: l.label }))}
            value={answers[x.id]}
            onChange={(v) => setAnswers((a) => ({ ...a, [x.id]: v }))}
          />
        </fieldset>
      ))}

      <div className="spacer" />
      <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={!complete} onClick={save}>
        점검 마치기
      </button>
    </div>
  );
}
