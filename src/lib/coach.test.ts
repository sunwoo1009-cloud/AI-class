import { describe, expect, it } from 'vitest';
import { coachSnoozed } from './coach';

describe('coachSnoozed', () => {
  const now = new Date('2026-11-27T12:00:00Z');
  it('누른 적 없으면 띄운다', () => expect(coachSnoozed(null, now)).toBe(false));
  it('옛 값 1 은 다시 띄운다', () => expect(coachSnoozed('1', now)).toBe(false));
  it('일주일 안이면 띄우지 않는다', () =>
    expect(coachSnoozed('2026-11-21T12:00:01Z', now)).toBe(true));
  it('일주일이 지나면 다시 띄운다', () =>
    expect(coachSnoozed('2026-11-20T12:00:00Z', now)).toBe(false));
});
