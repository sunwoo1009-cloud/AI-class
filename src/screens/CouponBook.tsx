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
        <CouponAlbum count={view.cards} />
      )}

      <div className="spacer" />
    </div>
  );
}

const FLIP_MS = 700;
/** 한 면에 꽂는 쿠폰 수 — 참고 사진처럼 위아래로 두 장 */
const PER_PAGE = 2;

/**
 * 다 채운 쿠폰 앨범 (2026-11-27 사용자 요청 + 참고 사진: 펼친 링 바인더 사진 앨범).
 *
 * 펼친 앨범 한 쌍 = 왼쪽 면 2장 + 오른쪽 면 2장. 가운데에 링 세 개, 바깥으로 표지 가장자리.
 * 쿠폰은 작게 꽂고 아래에 "N번째 쿠폰".
 * 다음: 오른쪽 면이 링을 축으로 왼쪽으로 넘어간다(넘어가는 면의 뒷면 = 다음 쌍의 왼쪽 면).
 * 앞: 왼쪽 면이 링을 축으로 오른쪽으로 넘어온다(뒷면 = 앞 쌍의 오른쪽 면).
 * ‹ › 나 옆으로 밀어 넘긴다. 움직임 줄이기 설정이면 바로 바뀐다.
 */
function CouponAlbum({ count }: { count: number }) {
  const spreads = Math.ceil(count / (PER_PAGE * 2));
  const [spread, setSpread] = useState(0);
  const [flip, setFlip] = useState<'next' | 'prev' | null>(null);
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
    const to = dir === 'next' ? spread + 1 : spread - 1;
    if (to < 0 || to >= spreads) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return setSpread(to);
    setFlip(dir);
    timer.current = window.setTimeout(() => {
      setSpread(to);
      setFlip(null);
    }, FLIP_MS);
  }

  /** 쌍 s 의 왼쪽(0)·오른쪽(1) 면 */
  const page = (s: number, side: 0 | 1) => {
    const first = s * PER_PAGE * 2 + side * PER_PAGE;
    return (
      <div className={`album-page album-page-${side === 0 ? 'left' : 'right'}`}>
        {Array.from({ length: PER_PAGE }, (_, k) => {
          const i = first + k;
          return i < count ? (
            <figure key={k} className="album-slot">
              <StampCard filled={STAMPS_PER_CARD} mini />
              <figcaption>{i + 1}번째 쿠폰</figcaption>
            </figure>
          ) : (
            <div key={k} className="album-slot is-empty" aria-hidden="true" />
          );
        })}
      </div>
    );
  };

  // 넘기는 동안: 깔린 두 면 + 넘어가는 한 장(앞면·뒷면)
  const left = flip === 'prev' ? page(spread - 1, 0) : page(spread, 0);
  const right = flip === 'next' ? page(spread + 1, 1) : page(spread, 1);

  return (
    <div className="album">
      <div
        className="album-cover"
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
      >
        <div className="album-spread" aria-live="polite">
          {left}
          {right}
          {flip === 'next' ? (
            <div className="album-leaf is-next" aria-hidden="true">
              <div className="album-face">{page(spread, 1)}</div>
              <div className="album-face is-back">{page(spread + 1, 0)}</div>
            </div>
          ) : null}
          {flip === 'prev' ? (
            <div className="album-leaf is-prev" aria-hidden="true">
              <div className="album-face">{page(spread, 0)}</div>
              <div className="album-face is-back">{page(spread - 1, 1)}</div>
            </div>
          ) : null}
          {/* 가운데 링 세 개 */}
          <div className="album-rings" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        </div>
      </div>

      {spreads > 1 ? (
        <div className="flipbook-nav">
          <button type="button" aria-label="앞 장" disabled={spread === 0 || flip !== null} onClick={() => go('prev')}>
            ‹
          </button>
          <span>
            {spread + 1 + (flip === 'next' ? 1 : flip === 'prev' ? -1 : 0)} / {spreads}
          </span>
          <button
            type="button"
            aria-label="다음 장"
            disabled={spread === spreads - 1 || flip !== null}
            onClick={() => go('next')}
          >
            ›
          </button>
        </div>
      ) : null}
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
