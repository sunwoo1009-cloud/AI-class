import { useMemo } from 'react';
import { couponView, STAMPS_PER_CARD } from '../lib/coupon';
import { loadStampBalance } from '../storage/store';
import { TAIYAKI_BODY, TAIYAKI_TAIL } from './menu/FoodIcon';
import { BackButton, Tooltip } from '../components/ui';

interface Props {
  onBack: () => void;
}

/**
 * 붕어빵 쿠폰 모음 (명세 8.7 — 2026-11-24 추가, 홈 메뉴에서 연다).
 *
 * 지금 채우는 쿠폰 한 장과, 다 채운 쿠폰들을 한눈에 보여준다.
 * 8.7 원칙대로 **목표·남은 칸·연속 기록은 보여주지 않는다** — 모은 것만 보여준다.
 */
export function CouponBook({ onBack }: Props) {
  // 부티크에서 쓴 도장은 빠진다 (명세 8.8)
  const view = useMemo(() => couponView(loadStampBalance()), []);

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
        <div className="coupon-book-grid">
          {Array.from({ length: view.cards }, (_, i) => (
            <div key={i} className="coupon-book-item">
              <StampCard filled={STAMPS_PER_CARD} mini />
              <span className="coupon-book-label">{i + 1}번째 쿠폰</span>
            </div>
          ))}
        </div>
      )}

      <div className="spacer" />
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
