import { useEffect, useRef, useState } from 'react';
import { TECHNIQUE_LABELS } from '../constants';
import { fillName } from '../lib/josa';
import { foodShape } from './menu/FoodIcon';
import { TechniqueArt } from './menu/TechniqueArt';
import { TECHNIQUE_SCRIPTS } from '../scripts/techniques';
import type { ScriptOption, ScriptStep } from '../scripts/techniques';
import type { TechniqueId } from '../types';

interface Props {
  technique: TechniqueId;
  displayName: string;
  /** 왜 이 기법이 먼저인지 한 줄 설명 (첫 화면에만) */
  reasonNote?: string;
  onDone: () => void;
  /** 명세 8.4 — '지금 바로 확인 필요' */
  onSafetyImmediate: () => void;
}

/** 앞선 선택에 따라 선택지를 교체한다 (명세 8.4) */
function resolveOptions(
  step: Extract<ScriptStep, { kind: 'choice' }>,
  answers: Record<string, string>,
): ScriptOption[] {
  for (const v of step.variants ?? []) {
    if (answers[v.whenChoiceId] === v.whenValue) return v.options;
  }
  return step.options;
}

export function TechniquePlayer({
  technique,
  displayName,
  reasonNote,
  onDone,
  onSafetyImmediate,
}: Props) {
  const script = TECHNIQUE_SCRIPTS[technique];
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const step = script.steps[index];
  const isLast = index === script.steps.length - 1;

  function advance() {
    if (isLast) onDone();
    else setIndex((i) => i + 1);
  }

  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  // 선택 화면은 응답을 기다린다. 나머지는 시간이 지나면 자동으로 넘어간다.
  useEffect(() => {
    if (step.kind === 'choice') return;
    const timer = setTimeout(() => advanceRef.current(), step.seconds * 1000);
    return () => clearTimeout(timer);
  }, [index, step]);

  function pick(choiceId: string, option: ScriptOption) {
    if (option.action === 'safety_immediate') {
      onSafetyImmediate();
      return;
    }
    setAnswers((prev) => ({ ...prev, [choiceId]: option.id }));
    advance();
  }

  return (
    <div className="app">
      <div className="topbar">
        <span className="topbar-title">{TECHNIQUE_LABELS[technique]}</span>
        <button className="btn-quiet" onClick={onDone}>
          그만하기
        </button>
      </div>

      <div className="progress">
        {script.steps.map((s, i) => (
          <div key={i} className={`progress-dot${i < index ? ' done' : ''}`}>
            {i === index && s.kind !== 'choice' ? (
              <div
                className="progress-fill"
                style={{
                  animation: `grow ${s.seconds}s linear forwards`,
                }}
              />
            ) : null}
          </div>
        ))}
      </div>

      <div className="script">
        {index === 0 && reasonNote ? (
          <p className="script-reason">{reasonNote}</p>
        ) : null}

        {step.kind === 'text' ? (
          <>
            {/* 말풍선이면 글이 그림 위에, 아니면 그림 아래에 온다 */}
            {step.speech ? (
              <p className="art-bubble">{fillName(step.text, displayName)}</p>
            ) : null}

            {step.art ? <TechniqueArt kind={step.art} /> : null}

            {step.speech ? null : (
              <p className="script-text">{fillName(step.text, displayName)}</p>
            )}
          </>
        ) : null}

        {step.kind === 'breathing' ? (
          <BreathingCircle
            cycles={step.cycles}
            inhaleSec={step.inhaleSec}
            exhaleSec={step.exhaleSec}
          />
        ) : null}

        {step.kind === 'choice' ? (
          <div>
            <p className="script-text" style={{ marginBottom: 22 }}>
              {step.text}
            </p>
            {resolveOptions(step, answers).map((o) => (
              <button
                key={o.id}
                className="btn"
                style={{ textAlign: 'center' }}
                onClick={() => pick(step.choiceId, o)}
              >
                {o.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {step.kind !== 'choice' ? (
        <button className="btn" style={{ textAlign: 'center' }} onClick={advance}>
          다음
        </button>
      ) : null}
    </div>
  );
}

/** 명세 8.1 [2] — 들숨 4초, 날숨 6초로 8번.
 *
 * 김이 나는 팥붕어빵이 숨에 맞춰 커졌다 작아진다.
 * 김은 붕어빵과 한 그림이라 같이 커지고, 올라가는 움직임은 따로 돈다.
 */
function BreathingCircle({
  cycles,
  inhaleSec,
  exhaleSec,
}: {
  cycles: number;
  inhaleSec: number;
  exhaleSec: number;
}) {
  const cycleSec = inhaleSec + exhaleSec;
  const [phase, setPhase] = useState<'in' | 'out'>('in');

  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => {
      const elapsed = (Date.now() - started) / 1000;
      const within = elapsed % cycleSec;
      setPhase(within < inhaleSec ? 'in' : 'out');
    }, 200);
    return () => clearInterval(id);
  }, [cycleSec, inhaleSec]);

  return (
    <div className="breath">
      <svg
        className="breath-fish run"
        viewBox="0 0 64 106"
        style={{
          animationDuration: `${cycleSec}s`,
          animationIterationCount: cycles,
        }}
        aria-hidden="true"
        focusable="false"
      >
        <g className="breath-steam">
          <path d="M21 52 C15 41 25 35 19 23 C16 16 20 12 18 7" />
          <path d="M33 54 C27 42 37 36 31 24 C28 16 32 12 30 6" />
          <path d="M45 52 C39 41 49 35 43 24 C40 17 44 13 42 9" />
        </g>
        <g transform="translate(0,58)">{foodShape('taiyakiRed')}</g>
      </svg>
      <div className="breath-phase">{phase === 'in' ? '들이쉬고' : '내쉬고'}</div>
    </div>
  );
}
