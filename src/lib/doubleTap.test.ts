import { describe, expect, it } from 'vitest';
import { DOUBLE_TAP_MS, DOUBLE_TAP_PX, isDoubleTap } from './doubleTap';

describe('isDoubleTap', () => {
  const first = { t: 1000, x: 100, y: 100 };
  it('첫 누름은 두 번 누르기가 아니다', () => {
    expect(isDoubleTap(null, first)).toBe(false);
  });
  it('빨리, 가까이 두 번 누르면 두 번 누르기', () => {
    expect(isDoubleTap(first, { t: 1250, x: 108, y: 96 })).toBe(true);
  });
  it('너무 늦으면 아니다', () => {
    expect(isDoubleTap(first, { t: 1000 + DOUBLE_TAP_MS + 1, x: 100, y: 100 })).toBe(false);
  });
  it('너무 멀면 아니다', () => {
    expect(isDoubleTap(first, { t: 1200, x: 100 + DOUBLE_TAP_PX + 5, y: 100 })).toBe(false);
  });
  it('시간이 거꾸로면 아니다', () => {
    expect(isDoubleTap(first, { t: 900, x: 100, y: 100 })).toBe(false);
  });
});
