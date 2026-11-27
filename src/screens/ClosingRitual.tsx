import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, RefObject } from 'react';
import { DOUBLE_TAP_MS, isDoubleTap } from '../lib/doubleTap';
import type { Tap } from '../lib/doubleTap';
import { TECHNIQUE_LABELS } from '../constants';
import { couponView, STAMPS_PER_CARD } from '../lib/coupon';
import type { CouponView } from '../lib/coupon';
import { addStamp, loadStampBalance } from '../storage/store';
import { TAIYAKI_BODY, TAIYAKI_TAIL } from './menu/FoodIcon';
import type { TechniqueId } from '../types';
import { BackButton, Banner } from '../components/ui';
import { coachSnoozed } from '../lib/coach';

/** 두 번 누른 뒤 도장이 찍히는 움직임 길이 (2026-11-27 — 전에는 3초 길게 누르기) */
const STAMP_MS = 450;

const COACH_KEY = 'cbd:coachStamp';
/** 2026-11-27 — '알겠어요'를 누른 뒤 일주일 동안은 띄우지 않는다 (lib/coach.ts) */
function coachSeen(): boolean {
  try {
    return coachSnoozed(localStorage.getItem(COACH_KEY));
  } catch {
    return true;
  }
}
function markCoachSeen() {
  try {
    localStorage.setItem(COACH_KEY, new Date().toISOString());
  } catch {
    // 저장이 막혀도 이번에는 닫힌다
  }
}

/** bye — '괜찮아요'를 누른 뒤 인사 화면. 여기서 홈으로 가야 기록(ready)이 끝난다. */
export type ClosingPhase = 'breath' | 'hold' | 'closed' | 'ask' | 'bye';
type Phase = ClosingPhase;

interface Props {
  onReady: () => void;
  onMore: () => void;
  /** 개발용 모음에서 중간 단계를 바로 보려고 쓴다. 실제 흐름은 늘 breath 부터. */
  initialPhase?: Phase;
  /** 왼쪽 위 뒤로 — 체크인 흐름의 앞 단계로 */
  onBack?: () => void;
  /**
   * 이번 체크인에서 이미 도장을 찍었는가. 뒤로 갔다가 다시 들어오면 참이다.
   * 그러면 도장을 또 찍지 않고 마무리 질문부터 보여준다.
   */
  alreadyStamped?: boolean;
  /** 도장을 찍은 순간 */
  onStamped?: () => void;
  /**
   * '두 번 톡톡' 코치 마크 — auto: 이 기기에서 처음 한 번만, always: 매번(발표용), never: 띄우지 않음
   */
  coach?: 'auto' | 'always' | 'never';
}

/** 명세 8.7 / 9절 화면 8 — 모든 경로가 마지막에 거친다 */
export function ClosingRitual({
  onReady,
  onMore,
  initialPhase = 'breath',
  onBack,
  alreadyStamped = false,
  onStamped,
  coach = 'auto',
}: Props) {
  const [phase, setPhase] = useState<Phase>(alreadyStamped ? 'ask' : initialPhase);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // 화면에 들어올 때의 도장 수를 붙잡아 둔다. 화면이 바뀌어도 흔들리지 않는다.
  // 부티크에서 쓴 만큼 뺀 '쓸 수 있는 도장'을 보여준다 (명세 8.8).
  // 이미 찍고 돌아왔으면 그 도장은 빼고 센다 (아래에서 '찍힘'으로 다시 더한다).
  const [base] = useState(() => Math.max(0, loadStampBalance() - (alreadyStamped ? 1 : 0)));
  const savedRef = useRef(alreadyStamped);
  const stamped = phase === 'closed' || phase === 'ask' || phase === 'bye';
  const view = couponView(base, stamped);

  // 도장을 다 찍은 순간 한 번만 저장한다 (StrictMode 의 두 번 실행을 막는다)
  useEffect(() => {
    if (phase !== 'closed' || savedRef.current) return;
    savedRef.current = true;
    addStamp();
    onStamped?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

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

  /** 두 번 누르면 도장이 쿵 — 짧게 찍히는 움직임을 보여준 뒤 닫는다 */
  function stamp() {
    if (phase !== 'hold' || timerRef.current !== null) return;
    const started = Date.now();
    const tick = () => {
      const ratio = Math.min((Date.now() - started) / STAMP_MS, 1);
      setProgress(ratio);
      if (ratio < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    timerRef.current = window.setTimeout(() => {
      clearHold();
      setProgress(1);
      setPhase('closed');
    }, STAMP_MS);
  }

  function cancelHold() {
    clearHold();
    if (phase === 'hold') setProgress(0);
  }

  useEffect(() => clearHold, []);

  // 첫 번째 누름 — 쿠폰이 살짝 눌리고, 바로 한 번 더 누르면 찍힌다 (명세 8.7, 2026-11-27)
  const lastTapRef = useRef<Tap | null>(null);
  const [tapped, setTapped] = useState(false);
  function onTap(x: number, y: number) {
    if (phase !== 'hold') return;
    const cur = { t: Date.now(), x, y };
    if (isDoubleTap(lastTapRef.current, cur)) {
      lastTapRef.current = null;
      setTapped(false);
      stamp();
      return;
    }
    lastTapRef.current = cur;
    setTapped(true);
    window.setTimeout(() => setTapped(false), DOUBLE_TAP_MS);
  }

  // 키보드 — Enter·Space 를 두 번 (같은 자리로 본다)
  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    if (e.repeat) return;
    onTap(0, 0);
  }

  // 코치 마크 — 처음 도장 화면에서 '두 번 톡톡'을 알려준다
  const [coachOn, setCoachOn] = useState(false);
  useEffect(() => {
    if (phase !== 'hold') return;
    if (coach === 'always' || (coach === 'auto' && !coachSeen())) setCoachOn(true);
  }, [phase, coach]);
  /** ok — '알겠어요'로 닫았을 때만 일주일 동안 다시 띄우지 않는다 */
  function closeCoach(ok: boolean) {
    setCoachOn(false);
    if (ok) markCoachSeen();
  }

  const appRef = useRef<HTMLDivElement>(null);
  const couponRef = useRef<HTMLDivElement>(null);

  return (
    <div className="app app-paper" ref={appRef}>
      <div className="topbar">
        {/* 인사 화면에서는 마무리 질문으로, 그 앞은 체크인 흐름의 앞 단계로 */}
        {phase === 'bye' ? (
          <BackButton onClick={() => setPhase('ask')} />
        ) : onBack ? (
          <BackButton
            onClick={() => {
              cancelHold();
              onBack();
            }}
          />
        ) : null}
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
            <CouponCard
              view={view}
              progress={progress}
              stamped={stamped}
              tapped={tapped}
              cardRef={couponRef}
              press={{
                onPointerUp: (e: PointerEvent) => onTap(e.clientX, e.clientY),
                onKeyDown,
              }}
            />

            {phase === 'closed' ? (
              <p className="hold-done">이 회기는 여기까지</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {coachOn && phase === 'hold' ? (
        <CoachMark
          appRef={appRef}
          targetRef={couponRef}
          onClose={() => closeCoach(false)}
          onOk={() => closeCoach(true)}
        />
      ) : null}

      {phase === 'ask' ? (
        <>
          <div className="script">
            <div className="hold-wrap">
              {/* 방금 찍은 쿠폰을 그대로 둔다. 누를 수는 없다. */}
              <CouponCard view={view} progress={1} stamped />
              <p className="script-text" style={{ marginTop: 6 }}>
                감정이 정리가 안 됐다면 다른 기법을 사용해 볼 수 있어요
              </p>
            </div>
          </div>
          {/* 두 버튼은 같은 굵기로 맞춘다 (closing-choice) */}
          <button
            className="btn btn-primary closing-choice"
            onClick={() => setPhase('bye')}
          >
            괜찮아요
          </button>
          <button className="btn closing-choice" onClick={onMore}>
            다른 기법 사용해보기
          </button>
        </>
      ) : null}

      {/* 명세 8.7 [4] — 2026-11-24 사용자 결정으로 원칙 5의 예외 */}
      {phase === 'bye' ? (
        <>
          {/* 2026-11-27 — 위에서 내려오는 배너로 */}
          <Banner icon={<ByeIcon />}>오늘 하루도 수고했어요</Banner>
          <div className="spacer" />
          <button className="btn btn-primary" onClick={onReady}>
            홈으로
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

/**
 * 붕어빵 쿠폰 한 장. 다섯 칸씩 두 줄.
 *
 * press 가 있으면 두 번 톡톡 눌러 도장을 찍을 수 있고, 없으면 보기만 한다.
 * 마무리 질문 화면에서도 방금 찍은 쿠폰을 그대로 보여주려고 따로 뺐다.
 */
function CouponCard({
  view,
  progress,
  stamped,
  press,
  tapped = false,
  cardRef,
}: {
  view: CouponView;
  progress: number;
  stamped: boolean;
  press?: Record<string, unknown>;
  /** 첫 번째 누름을 받았는가 — 쿠폰이 살짝 눌린다 */
  tapped?: boolean;
  cardRef?: RefObject<HTMLDivElement>;
}) {
  return (
    <>
      <div
        ref={cardRef}
        className={`coupon${stamped ? ' is-stamped' : ''}${
          press ? '' : ' is-static'
        }${tapped ? ' is-tapped' : ''}`}
        {...press}
        role={press ? 'button' : undefined}
        tabIndex={press && !stamped ? 0 : undefined}
        aria-label={
          press
            ? `붕어빵 쿠폰. 도장 ${view.filled}개. 두 번 연달아 눌러 도장을 찍으세요`
            : `붕어빵 쿠폰. 도장 ${view.filled}개`
        }
      >
        <p className="coupon-title">붕어빵 쿠폰</p>

        <div className="coupon-grid">
          {Array.from({ length: STAMPS_PER_CARD }, (_, n) => {
            const filled = n < view.filled;
            const target = view.targetIndex === n;
            // 방금 찍힌 자리 — 여기에만 찍히는 움직임을 준다
            const fresh = stamped && press !== undefined && n === view.filled - 1;
            return (
              <div
                key={n}
                className={`coupon-slot${filled ? ' is-filled' : ''}${
                  target ? ' is-target' : ''
                }${fresh ? ' is-new' : ''}`}
              >
                {filled || target ? (
                  <svg
                    className="slot-stamp"
                    viewBox="0 0 64 48"
                    style={
                      target ? ({ '--p': progress } as CSSProperties) : undefined
                    }
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d={TAIYAKI_TAIL} />
                    <path d={TAIYAKI_BODY} />
                    <circle className="stamp-eye" cx="14" cy="19" r="3.4" />
                  </svg>
                ) : null}
              </div>
            );
          })}
        </div>

        <p className="coupon-note">
          {view.cardComplete
            ? '쿠폰 한 장을 다 채웠어요'
            : stamped
              ? '찍었어요'
              : tapped
                ? '한 번 더!'
                : '쿠폰을 두 번 톡톡 누르기'}
        </p>
      </div>

      <p className="coupon-count">
        도장 {view.total}개 · 모은 쿠폰 {view.cards}장
      </p>
    </>
  );
}

/**
 * 코치 마크 (2026-11-27) — 쿠폰만 밝게 남기고 나머지를 어둡게 덮은 뒤
 * "두 번 톡톡 누르면 도장이 찍혀요"를 알려준다. 아무 데나 누르거나 '알겠어요'로 닫는다.
 * 화면(.app) 안에 겹쳐 그려서 발표용 틀 안에서도 제자리에 뜬다.
 */
function CoachMark({
  appRef,
  targetRef,
  onClose,
  onOk,
}: {
  appRef: RefObject<HTMLDivElement>;
  targetRef: RefObject<HTMLDivElement>;
  onClose: () => void;
  /** '알겠어요' */
  onOk: () => void;
}) {
  const [box, setBox] = useState<{ top: number; left: number; width: number; height: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    const place = () => {
      const app = appRef.current;
      const target = targetRef.current;
      if (!app || !target) return;
      const a = app.getBoundingClientRect();
      const t = target.getBoundingClientRect();
      setBox({ top: t.top - a.top, left: t.left - a.left, width: t.width, height: t.height });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [appRef, targetRef]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // 키보드로 바로 닫을 수 있게 '알겠어요'에 초점 — 발표 화면이 튀지 않게 스크롤은 하지 않는다
  const okRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    okRef.current?.focus({ preventScroll: true });
  }, [box !== null]);

  if (!box) return null;
  const pad = 10;
  return (
    <div className="coach" role="dialog" aria-modal="true" aria-label="도장 찍는 법" onClick={onClose}>
      <div
        className="coach-spot"
        style={{
          top: box.top - pad,
          left: box.left - pad,
          width: box.width + pad * 2,
          height: box.height + pad * 2,
        }}
      />
      {/* 쿠폰 가운데에서 손가락이 두 번 톡톡 */}
      <div
        className="coach-hand"
        aria-hidden="true"
        style={{ top: box.top + box.height / 2 - 6, left: box.left + box.width / 2 - 14 }}
      >
        <span className="coach-ripple" />
        <svg viewBox="0 0 48 56" focusable="false">
          <path d="M18 30 V9 a4 4 0 0 1 8 0 V24 l1-1 a4 4 0 0 1 7 2 l1-1 a4 4 0 0 1 7 2 V38 c0 9-6 15-14 15 h-2 c-6 0-9-3-12-8 L8 36 a4 4 0 0 1 6-5 Z" />
        </svg>
      </div>
      <div className="coach-bubble" style={{ top: box.top + box.height + pad + 16 }}>
        <p className="coach-title">쿠폰을 두 번 톡톡!</p>
        <p className="coach-text">두 번 연달아 누르면 도장이 찍혀요</p>
        <button
          type="button"
          className="btn btn-primary coach-ok"
          onClick={(e) => {
            e.stopPropagation();
            onOk();
          }}
          ref={okRef}
        >
          알겠어요
        </button>
      </div>
    </div>
  );
}

/** 명세 6.5 — '다른 기법 사용해보기'를 고른 뒤 */
export function ClosingMore({
  candidate,
  onTechnique,
  onExit,
  onBack,
}: {
  candidate: TechniqueId | null;
  onTechnique: () => void;
  onExit: () => void;
  onBack?: () => void;
}) {
  return (
    <div className="app app-paper">
      <div className="topbar">
        {onBack ? <BackButton onClick={onBack} /> : null}
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

/** 배너 아이콘 — 김이 나는 붕어빵 */
function ByeIcon() {
  return (
    <svg viewBox="0 0 40 40" focusable="false">
      <path className="bye-steam" d="M14 12 c-2-3 2-5 0-8 M20 12 c-2-3 2-5 0-8 M26 12 c-2-3 2-5 0-8" />
      <path className="bye-fish" d="M5 26 c4-8 18-9 25-3 l6-4 v14 l-6-4 c-7 6-21 5-25-3 z" />
      <circle cx="12" cy="25" r="1.6" />
    </svg>
  );
}
