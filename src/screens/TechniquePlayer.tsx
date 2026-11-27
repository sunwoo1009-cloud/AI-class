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
import { BackButton } from '../components/ui';
import {
  buzz,
  hapticAvailable,
  keepScreenOn,
  loadGuidePrefs,
  saveGuidePrefs,
  speak,
  speechAvailable,
  stopSpeaking,
} from '../lib/guide';
import type { GuidePrefs } from '../lib/guide';

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
  /** 첫 단계에서 왼쪽 위 뒤로를 누르면 — 체크인 흐름의 앞 단계로 */
  onBack?: () => void;
}

export function TechniquePlayer({
  technique,
  displayName,
  reasonNote,
  onDone,
  onSafetyImmediate,
  initialStep = 0,
  onBack,
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

  /* ---------- 음성 안내 · 진동 박자 · 화면 꺼짐 막기 (2026-11-27) ---------- */
  const [guide, setGuide] = useState<GuidePrefs>(loadGuidePrefs);
  const stepText =
    step.kind === 'text' ? fillName(step.text, name) : step.kind === 'choice' ? step.text : null;

  // 기법 도중에는 화면이 꺼지지 않게, 나가면 읽던 것도 멈춘다
  useEffect(() => {
    const release = keepScreenOn();
    return () => {
      release();
      stopSpeaking();
    };
  }, []);

  // 단계가 바뀌면 그 글을 읽는다 (호흡 단계는 들이쉬고·내쉬고를 따로 읽는다)
  useEffect(() => {
    if (!guide.voice) return;
    // 호흡 단계는 BreathingCircle 이 먼저(자식 effect 가 먼저 돈다) "들이쉬고"를 읽으므로 끊지 않는다
    if (stepText) speak(stepText);
    else if (step.kind !== 'breathing') stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, guide.voice]);

  function toggleGuide(key: keyof GuidePrefs) {
    const next = { ...guide, [key]: !guide[key] };
    setGuide(next);
    saveGuidePrefs(next);
    // 아이폰은 누른 그 순간에 한 번 읽어야 소리가 열린다
    if (key === 'voice') {
      if (next.voice) speak(stepText ?? (step.kind === 'breathing' ? '숨에 맞춰 따라 해 보세요' : ''));
      else stopSpeaking();
    }
    if (key === 'haptic' && next.haptic) buzz(60);
  }

  function onBreathPhase(phase: 'in' | 'out') {
    if (guide.voice) speak(phase === 'in' ? '들이쉬고' : '내쉬고');
    if (guide.haptic) buzz(phase === 'in' ? 90 : [40, 60, 40]);
  }

  return (
    <div className="app app-paper">
      <div className="topbar">
        {/* 왼쪽 위 뒤로 — 대본 안에서 한 칸 뒤로, 첫 칸이면 흐름의 앞 단계로 */}
        {index > 0 || onBack ? (
          <BackButton
            onClick={() => (index > 0 ? setIndex((i) => i - 1) : onBack?.())}
          />
        ) : null}
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

      {/* 음성 안내 · 진동 박자 켜기 (2026-11-27). 진동은 지원하는 기기(주로 안드로이드)에서만 보인다 */}
      {speechAvailable || hapticAvailable ? (
        <div className="guide-toggles">
          {speechAvailable ? (
            <button
              type="button"
              className={`guide-chip${guide.voice ? ' is-on' : ''}`}
              aria-pressed={guide.voice}
              onClick={() => toggleGuide('voice')}
            >
              <span aria-hidden="true">{guide.voice ? '🔊' : '🔈'}</span> 소리로 듣기
            </button>
          ) : null}
          {hapticAvailable ? (
            <button
              type="button"
              className={`guide-chip${guide.haptic ? ' is-on' : ''}`}
              aria-pressed={guide.haptic}
              onClick={() => toggleGuide('haptic')}
            >
              <span aria-hidden="true">📳</span> 진동으로 박자
            </button>
          ) : null}
        </div>
      ) : null}

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
            onPhase={onBreathPhase}
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
  onPhase,
}: {
  cycles: number;
  inhaleSec: number;
  exhaleSec: number;
  /** 들숨·날숨이 바뀔 때마다 (음성·진동 박자, 2026-11-27) */
  onPhase?: (phase: 'in' | 'out') => void;
}) {
  const cycleSec = inhaleSec + exhaleSec;
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const onPhaseRef = useRef(onPhase);
  onPhaseRef.current = onPhase;

  useEffect(() => {
    const started = Date.now();
    let last: 'in' | 'out' | null = null;
    const tick = () => {
      const elapsed = (Date.now() - started) / 1000;
      // 정해진 횟수가 끝나면 더 알리지 않는다
      if (elapsed >= cycleSec * cycles) return;
      const within = elapsed % cycleSec;
      const now = within < inhaleSec ? 'in' : 'out';
      if (now !== last) {
        last = now;
        setPhase(now);
        onPhaseRef.current?.(now);
      }
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [cycleSec, inhaleSec, cycles]);

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
