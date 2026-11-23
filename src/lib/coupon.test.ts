import { describe, expect, it } from 'vitest';
import { couponView, STAMPS_PER_CARD } from './coupon';

describe('couponView', () => {
  it('처음에는 빈 장이고 첫 자리가 비어 있다', () => {
    const v = couponView(0);
    expect(v.filled).toBe(0);
    expect(v.cards).toBe(0);
    expect(v.targetIndex).toBe(0);
    expect(v.cardComplete).toBe(false);
  });

  it('찍기 전에는 다음 자리를 가리킨다', () => {
    expect(couponView(3).targetIndex).toBe(3);
    expect(couponView(3).filled).toBe(3);
  });

  it('찍고 나면 자리가 하나 늘고 가리키는 자리는 없다', () => {
    const v = couponView(3, true);
    expect(v.filled).toBe(4);
    expect(v.total).toBe(4);
    expect(v.targetIndex).toBeNull();
  });

  it('열 개째를 찍으면 꽉 찬 장으로 보여준다', () => {
    const v = couponView(9, true);
    expect(v.filled).toBe(STAMPS_PER_CARD);
    expect(v.cards).toBe(1);
    expect(v.cardComplete).toBe(true);
  });

  it('다음에 다시 열면 새 장으로 시작한다', () => {
    const v = couponView(10);
    expect(v.filled).toBe(0);
    expect(v.cards).toBe(1);
    expect(v.targetIndex).toBe(0);
  });

  it('여러 장을 채운 뒤에도 장수가 맞다', () => {
    expect(couponView(27).cards).toBe(2);
    expect(couponView(27).filled).toBe(7);
    expect(couponView(29, true).cards).toBe(3);
  });

  it('이상한 값은 0으로 본다', () => {
    expect(couponView(-5).total).toBe(0);
    expect(couponView(Number.NaN).total).toBe(0);
    expect(couponView(2.7).filled).toBe(2);
  });
});
