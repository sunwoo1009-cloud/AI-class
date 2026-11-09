import { describe, expect, it } from 'vitest';
import { shouldShowIntro } from './intro';
import type { IntroConditions } from './intro';

const base: IntroConditions = {
  onboarded: true,
  evening: true,
  today: '2026-11-09',
  seenDate: null,
  override: null,
};

const show = (patch: Partial<IntroConditions> = {}) =>
  shouldShowIntro({ ...base, ...patch });

describe('shouldShowIntro — 기본 조건', () => {
  it('5시 이후에 처음 열면 보여준다', () => {
    expect(show()).toBe(true);
  });

  it('5시 이전에는 보여주지 않는다', () => {
    expect(show({ evening: false })).toBe(false);
  });

  it('오늘 이미 봤으면 생략한다', () => {
    expect(show({ seenDate: '2026-11-09' })).toBe(false);
  });

  it('어제 본 건 상관없다 — 날이 바뀌면 다시 보여준다', () => {
    expect(show({ seenDate: '2026-11-08' })).toBe(true);
  });

  it('온보딩 중에는 보여주지 않는다', () => {
    expect(show({ onboarded: false })).toBe(false);
  });
});

describe('shouldShowIntro — 강제 파라미터', () => {
  it('?intro=1 이면 낮에도 보여준다', () => {
    expect(show({ evening: false, override: true })).toBe(true);
  });

  it('?intro=1 이면 오늘 이미 봤어도 보여준다', () => {
    expect(show({ seenDate: '2026-11-09', override: true })).toBe(true);
  });

  it('?intro=0 이면 조건이 맞아도 건너뛴다', () => {
    expect(show({ override: false })).toBe(false);
  });

  it('강제 파라미터가 있어도 온보딩 중에는 안 보여준다', () => {
    expect(show({ onboarded: false, override: true })).toBe(false);
  });
});
