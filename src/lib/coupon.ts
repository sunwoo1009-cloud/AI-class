/** 쿠폰 한 장에 찍는 도장 수 */
export const STAMPS_PER_CARD = 10;

export interface CouponView {
  /** 지금까지 찍은 도장 수 */
  total: number;
  /** 다 채운 쿠폰 장수 */
  cards: number;
  /** 지금 장에 찍힌 도장 수 (0~10) */
  filled: number;
  /** 다음 도장이 들어갈 자리. 이미 찍은 뒤면 null */
  targetIndex: number | null;
  /** 이번에 한 장을 다 채웠는가 */
  cardComplete: boolean;
}

/**
 * 모아 온 도장 수로 지금 보여줄 쿠폰 한 장의 모습을 계산한다.
 *
 * `justStamped` 는 이번 마무리에서 방금 한 개를 찍었다는 뜻이다.
 * 막 열 개째를 찍었을 때는 빈 장이 아니라 **꽉 찬 장**을 보여줘야 하므로
 * 저장된 수가 아니라 '찍기 전 수 + 1' 로 센다.
 */
export function couponView(total: number, justStamped = false): CouponView {
  const base =
    Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
  const filledBefore = base % STAMPS_PER_CARD;
  const filled = justStamped ? filledBefore + 1 : filledBefore;
  const totalAfter = justStamped ? base + 1 : base;
  return {
    total: totalAfter,
    cards: Math.floor(totalAfter / STAMPS_PER_CARD),
    filled,
    targetIndex: justStamped ? null : filledBefore,
    cardComplete: filled === STAMPS_PER_CARD,
  };
}
