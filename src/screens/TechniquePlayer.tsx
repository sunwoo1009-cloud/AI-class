import { useEffect, useMemo, useRef, useState } from 'react';
import { Lines } from '../components/Lines';
import { TECHNIQUE_LABELS } from '../constants';
import { fillName, scriptName } from '../lib/josa';
import { foodShape } from './menu/FoodIcon';
import { TechniqueArt } from './menu/TechniqueArt';
import { TECHNIQUE_SCRIPTS } from '../scripts/techniques';
import type { ScriptOption, ScriptStep } from '../scripts/techniques';
import { expandSteps, resolveOptions, toggleChoice } from '../lib/choice';
import type { ChoiceAnswers } from '../lib/choice';
import type { TechniqueId } from '../types';

interface Props {
  technique: TechniqueId;
  displayName: string;
  /** 왜 이 기법이 먼저인지 한 줄 설명 (첫 화면에만) */
  reasonNote?: string;
  onDone: () => void;
  /** 명세 8.4 — '지금 바로 확인 필요' */
  onSafetyImmediate: () => void;
  /** 개발용 모음에서 중간 단계를 바로 보려고 쓴다. 실제 흐름은 늘 0부터. */
  initialStep?: number;
}

export function TechniquePlayer({
  technique,
  displayName,
  reasonNote,
  onDone,
  onSafetyImmediate,
  initialStep = 0,
}: Props) {
  const script = TECHNIQUE_SCRIPTS[technique];
  // 가입하지 않아 닉네임이 없으면 '○○'로 둔다 — 자기 이름을 넣어 말하게 한다 (명세 8.6)
  const name = scriptName(displayName);
  const [index, setIndex] = useState(() =>
    Math.min(Math.max(0, Math.floor(initialStep)), script.steps.length - 1),
  );
  const [answers, setAnswers] = useState<ChoiceAnswers>({});
  // 고른 선택지의 후속 화면을 끼워 넣은 실제 단계 목록 (명세 8.4)
  const steps = useMemo(() => expandSteps(script.steps, answers), [script, answers]);
  const step = steps[Math.min(index, steps.length - 1)];
  const isLast = index >= steps.length - 1;

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

  function pick(step: Extract<ScriptStep, { kind: 'choice' }>, option: ScriptOption) {
    // '지금 바로 확인 필요'는 여러 개 고르기에서도 누르는 즉시 안내로 간다 (명세 8.4)
    if (option.action === 'safety_immediate') {
      onSafetyImmediate();
      return;
    }
    if (step.multiple) {
      setAnswers((prev) => ({
        ...prev,
        [step.choiceId]: toggleChoice(
          prev[step.choiceId] ?? [],
          option,
          resolveOptions(step, prev),
        ),
      }));
      return;
    }
    setAnswers((prev) => ({ ...prev, [step.choiceId]: [option.id] }));
    advance();
  }

  // 여러 개 고르기 단계에서 하나 이상 골랐는가
  const picked = step.kind === 'choice' ? (answers[step.choiceId] ?? []) : [];

  return (
    <div className="app app-paper">
      <div className="topbar">
        <span className="topbar-title topbar-title-strong">
          {TECHNIQUE_LABELS[technique]}
        </span>
        <button className="btn-quiet" onClick={onDone}>
          그만하기
        </button>
      </div>

      <div className="progress">
        {steps.map((s, i) => (
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
              <p className="art-bubble">{fillName(step.text, name)}</p>
            ) : null}

            {step.art ? <TechniqueArt kind={step.art} /> : null}

            {step.speech ? null : (
              <ScriptText text={fillName(step.text, name)} />
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
            <ScriptText text={step.text} className="script-choice-text" />
            {step.multiple ? (
              <p className="choice-hint">여러 개 골라도 돼요</p>
            ) : null}
            {resolveOptions(step, answers).map((o) => {
              const on = step.multiple && picked.includes(o.id);
              return (
                <button
                  key={o.id}
                  className={`btn choice-btn${on ? ' is-picked' : ''}${
                    o.action === 'safety_immediate' ? ' is-urgent' : ''
                  }`}
                  aria-pressed={step.multiple && !o.action ? on : undefined}
                  onClick={() => pick(step, o)}
                >
                  {on ? <span className="choice-check" aria-hidden="true">✓</span> : null}
                  {o.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* 이전은 대본 안에서 한 칸 뒤로. 첫 칸에서는 돌아갈 곳이 없다.
          하나만 고르는 선택 화면은 고르는 것이 '다음'이라 이전만 둔다.
          여러 개 고르기는 하나 이상 고르면 '다음'이 눌린다. */}
      <div className="btn-row step-nav">
        <button
          className="btn step-prev"
          onClick={() => setIndex((i) => i - 1)}
          disabled={index === 0}
        >
          이전
        </button>
        {step.kind !== 'choice' || step.multiple ? (
          <button
            className="btn btn-primary step-next"
            onClick={advance}
            disabled={step.kind === 'choice' && picked.length === 0}
          >
            다음
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * 대본 문구. 줄을 나눈 문구는 Lines 가 한 줄씩 들어가도록 크기를 맞춘다.
 * 한 줄짜리는 평범한 문단으로 둔다.
 */
function ScriptText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const cls = `script-text${className ? ` ${className}` : ''}`;
  if (!text.includes('\n')) return <p className={cls}>{text}</p>;
  return <Lines text={text} className={cls} base="1.1875rem" />;
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
