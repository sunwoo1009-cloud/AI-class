import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { TECHNIQUE_LABELS } from '../constants';
import { TAIYAKI_BODY, TAIYAKI_TAIL } from './menu/FoodIcon';
import type { TechniqueId } from '../types';

const HOLD_MS = 3000;

type Phase = 'breath' | 'hold' | 'closed' | 'ask';

interface Props {
  onReady: () => void;
  onMore: () => void;
}

/** 명세 8.7 / 9절 화면 8 — 모든 경로가 마지막에 거친다 */
export function ClosingRitual({ onReady, onMore }: Props) {
  const [phase, setPhase] = useState<Phase>('breath');
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // [1, 10] 숨을 한 번 쉬고
  useEffect(() => {
    if (phase !== 'breath') return;
    const t = setTimeout(() => setPhase('hold'), 10000);
    return () => clearTimeout(t);
  }, [phase]);

  // 원이 닫힌 뒤 잠시 문구를 보여주고 질문으로 넘어간다
  useEffect(() => {
    if (phase !== 'closed') return;
    const t = setTimeout(() => setPhase('ask'), 2000);
    return () => clearTimeout(t);
  }, [phase]);

  function clearHold() {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    timerRef.current = null;
    rafRef.current = null;
  }

  function startHold() {
    if (phase !== 'hold') return;
    const started = Date.now();
    const tick = () => {
      const ratio = Math.min((Date.now() - started) / HOLD_MS, 1);
      setProgress(ratio);
      if (ratio < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    timerRef.current = window.setTimeout(() => {
      clearHold();
      setProgress(1);
      setPhase('closed');
    }, HOLD_MS);
  }

  function cancelHold() {
    clearHold();
    if (phase === 'hold') setProgress(0);
  }

  useEffect(() => clearHold, []);

  // 포인터뿐 아니라 키보드로도 누를 수 있어야 한다
  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    if (e.repeat) return;
    startHold();
  }

  return (
    <div className="app">
      <div className="topbar">
        <span className="topbar-title">마무리</span>
      </div>

      {phase === 'breath' ? (
        <div className="script">
          <p className="script-text">
            숨을 한 번 쉬고, 이 회기를 여기서 마무리할게요.
          </p>
        </div>
      ) : null}

      {phase === 'hold' || phase === 'closed' ? (
        <div className="script">
          <div className="hold-wrap">
            <div className={`coupon${phase === 'closed' ? ' is-stamped' : ''}`}>
              <p className="coupon-title">오늘의 붕어빵</p>

              <div
                className="coupon-slot"
                onPointerDown={startHold}
                onPointerUp={cancelHold}
                onPointerLeave={cancelHold}
                onPointerCancel={cancelHold}
                onKeyDown={onKeyDown}
                onKeyUp={cancelHold}
                onBlur={cancelHold}
                role="button"
                tabIndex={0}
                aria-label="3초 동안 길게 눌러 도장을 찍으세요"
              >
                {/* 도장은 누르는 동안 종이로 내려앉고, 진해진다 */}
                <svg
                  className="stamp"
                  viewBox="0 0 64 48"
                  style={{ '--p': progress } as CSSProperties}
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d={TAIYAKI_TAIL} />
                  <path d={TAIYAKI_BODY} />
                  <circle className="stamp-eye" cx="14" cy="19" r="2.8" />
                </svg>
              </div>

              <p className="coupon-note">
                {phase === 'closed' ? '찍었어요' : '3초 길게 누르기'}
              </p>
            </div>

            {phase === 'closed' ? (
              <p className="hold-done">이 회기는 여기까지</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {phase === 'ask' ? (
        <>
          <div className="script">
            <p className="script-text">다음 회기로 갈 준비가 됐나요?</p>
          </div>
          <button className="btn btn-primary" onClick={onReady}>
            준비됐어요
          </button>
          <button className="btn" style={{ textAlign: 'center' }} onClick={onMore}>
            조금 더 시간이 필요해요
          </button>
        </>
      ) : null}

      {phase === 'breath' ? (
        <button
          className="btn"
          style={{ textAlign: 'center' }}
          onClick={() => setPhase('hold')}
        >
          다음
        </button>
      ) : null}
    </div>
  );
}

/** 명세 6.5 — '조금 더 시간이 필요해요'를 고른 뒤 */
export function ClosingMore({
  candidate,
  onTechnique,
  onExit,
}: {
  candidate: TechniqueId | null;
  onTechnique: () => void;
  onExit: () => void;
}) {
  return (
    <div className="app">
      <div className="topbar">
        <span className="topbar-title">마무리</span>
      </div>

      <h1>무엇을 할까요?</h1>

      <div className="spacer" />

      {candidate ? (
        <button className="btn btn-primary" onClick={onTechnique}>
          {TECHNIQUE_LABELS[candidate]} 하기
        </button>
      ) : null}
      <button className="btn" style={{ textAlign: 'center' }} onClick={onExit}>
        앱 닫기
      </button>

      {!candidate ? (
        <p className="muted" style={{ marginTop: 14, marginBottom: 0 }}>
          이번 체크인에서 기법은 이미 두 개를 했어요. 더 필요하면 수퍼비전이나
          동료 상담을 찾아보세요.
        </p>
      ) : null}
    </div>
  );
}
