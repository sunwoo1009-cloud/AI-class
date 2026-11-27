import { useEffect, useMemo, useRef, useState } from 'react';
import { couponView, STAMPS_PER_CARD } from '../lib/coupon';
import { loadStampBalance } from '../storage/store';
import { TAIYAKI_BODY, TAIYAKI_TAIL } from './menu/FoodIcon';
import { BackButton, Tooltip } from '../components/ui';

interface Props {
  onBack: () => void;
  /** 발표용 — 예시 도장 수 (다 채운 쿠폰 책장 넘기기를 보여 주려고) */
  demoStamps?: number;
}

/**
 * 붕어빵 쿠폰 모음 (명세 8.7 — 2026-11-24 추가, 홈 메뉴에서 연다).
 *
 * 지금 채우는 쿠폰 한 장과, 다 채운 쿠폰들을 한눈에 보여준다.
 * 8.7 원칙대로 **목표·남은 칸·연속 기록은 보여주지 않는다** — 모은 것만 보여준다.
 */
export function CouponBook({ onBack, demoStamps }: Props) {
  // 옷장에서 쓴 도장은 빠진다 (명세 8.8)
  const view = useMemo(() => couponView(demoStamps ?? loadStampBalance()), [demoStamps]);

  return (
    <div className="app app-paper">
      <div className="topbar">
        <BackButton onClick={onBack} label="마이페이지로" />
        <span className="topbar-title">붕어빵 쿠폰</span>
      </div>

      {/* 2026-11-27 — 도장 안내를 제목 옆 ⓘ 툴팁으로 */}
      <h1 className="title-with-tip">
        모은 붕어빵 쿠폰
        <Tooltip
          label="도장 안내 보기"
          lines={[
            '마무리를 한 번 마칠 때마다 도장이 하나 찍혀요',
            '도장으로 옷장에서 직장인을 꾸밀 수 있어요',
          ]}
        />
      </h1>

      <p className="coupon-count" style={{ margin: '4px 0 16px' }}>
        쓸 수 있는 도장 {view.total}개 · 다 채운 쿠폰 {view.cards}장
      </p>

      <h2>지금 쿠폰</h2>
      <div className="coupon-book-current">
        <StampCard filled={view.filled} />
      </div>
      {view.total === 0 ? (
        <p className="muted" style={{ textAlign: 'center', marginTop: 10 }}>
          아직 찍은 도장이 없어요
        </p>
      ) : null}

      <h2 style={{ marginTop: 26 }}>다 채운 쿠폰</h2>
      {view.cards === 0 ? (
        <p className="muted">아직 다 채운 쿠폰이 없어요</p>
      ) : (
        <CouponFlipBook count={view.cards} />
      )}

      <div className="spacer" />
    </div>
  );
}

const FLIP_MS = 650;

/**
 * 다 채운 쿠폰을 책장처럼 넘겨 본다 (2026-11-27 사용자 요청).
 * 한 장씩 보이고, ‹ › 를 누르거나 옆으로 밀면 책장이 왼쪽 묶음을 축으로 넘어간다.
 * 다음 장: 지금 장이 왼쪽으로 넘어가며 아래 장이 드러난다 / 앞 장: 앞 장이 왼쪽에서 넘어와 덮는다.
 * 움직임 줄이기 설정이면 넘기는 움직임 없이 바로 바뀐다.
 */
function CouponFlipBook({ count }: { count: number }) {
  const [page, setPage] = useState(0);
  const [flip, setFlip] = useState<{ from: number; to: number; dir: 'next' | 'prev' } | null>(null);
  const timer = useRef<number | null>(null);
  const startX = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  function go(dir: 'next' | 'prev') {
    if (flip) return;
    const to = dir === 'next' ? page + 1 : page - 1;
    if (to < 0 || to >= count) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return setPage(to);
    setFlip({ from: page, to, dir });
    timer.current = window.setTimeout(() => {
      setPage(to);
      setFlip(null);
    }, FLIP_MS);
  }

  const sheet = (i: number, cls = '') => (
    <div className={`flip-page${cls}`} key={`${i}${cls}`}>
      <StampCard filled={STAMPS_PER_CARD} />
      <span className="coupon-book-label">{i + 1}번째 쿠폰</span>
    </div>
  );

  // 아래에 깔린 장 / 위에서 넘어가는 장
  const under = flip ? (flip.dir === 'next' ? flip.to : flip.from) : page;
  const over = flip ? (flip.dir === 'next' ? flip.from : flip.to) : null;

  return (
    <div className="flipbook">
      <div
        className="flipbook-stage"
        onPointerDown={(e) => {
          startX.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (startX.current === null) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (dx < -40) go('next');
          else if (dx > 40) go('prev');
        }}
        aria-live="polite"
      >
        {/* 뒤에 쌓인 장들 — 책 두께 */}
        {count > 1 ? <span className="flipbook-stack" aria-hidden="true" /> : null}
        {sheet(under)}
        {over !== null && flip ? sheet(over, flip.dir === 'next' ? ' is-turning-out' : ' is-turning-in') : null}
      </div>

      <div className="flipbook-nav">
        <button type="button" aria-label="앞 쿠폰" disabled={page === 0 || flip !== null} onClick={() => go('prev')}>
          ‹
        </button>
        <span>
          {(flip ? flip.to : page) + 1} / {count}
        </span>
        <button
          type="button"
          aria-label="다음 쿠폰"
          disabled={page === count - 1 || flip !== null}
          onClick={() => go('next')}
        >
          ›
        </button>
      </div>
    </div>
  );
}

/** 보기만 하는 쿠폰 한 장. 마무리 화면의 쿠폰과 같은 모양이다. */
export function StampCard({ filled, mini = false }: { filled: number; mini?: boolean }) {
  return (
    <div
      className={`coupon is-static${mini ? ' is-mini' : ''}`}
      aria-label={`붕어빵 쿠폰. 도장 ${filled}개`}
    >
      {mini ? null : <p className="coupon-title">붕어빵 쿠폰</p>}
      <div className="coupon-grid">
        {Array.from({ length: STAMPS_PER_CARD }, (_, n) => {
          const on = n < filled;
          return (
            <div key={n} className={`coupon-slot${on ? ' is-filled' : ''}`}>
              {on ? (
                <svg
                  className="slot-stamp is-kept"
                  viewBox="0 0 64 48"
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
    </div>
  );
}
