import { describe, expect, it } from 'vitest';
import { shouldShowIntro } from './intro';
import type { IntroConditions } from './intro';

const base: IntroConditions = {
  onboarded: true,
  override: null,
};

const show = (patch: Partial<IntroConditions> = {}) =>
  shouldShowIntro({ ...base, ...patch });

describe('shouldShowIntro — 앱을 열 때마다', () => {
  it('온보딩을 마쳤으면 열 때마다 보여준다 (시각·이미 봤는지와 무관)', () => {
    expect(show()).toBe(true);
  });

  it('온보딩 중에는 보여주지 않는다', () => {
    expect(show({ onboarded: false })).toBe(false);
  });
});

describe('shouldShowIntro — 강제 파라미터', () => {
  it('?intro=1 이면 보여준다', () => {
    expect(show({ override: true })).toBe(true);
  });

  it('?intro=0 이면 건너뛴다', () => {
    expect(show({ override: false })).toBe(false);
  });

  it('강제 파라미터가 있어도 온보딩 중에는 안 보여준다', () => {
    expect(show({ onboarded: false, override: true })).toBe(false);
  });
});
