import { describe, expect, it } from 'vitest';
import { FEEDBACK_COOLDOWN_MS, FEEDBACK_MAX, checkFeedback } from './feedback';

describe('checkFeedback — 피드백 보내기 전 검사', () => {
  const now = 1_000_000;

  it('앞뒤 공백을 지우고 받는다', () => {
    expect(checkFeedback('  좋아요  ', null, now)).toEqual({ ok: true, body: '좋아요' });
  });

  it('빈 글은 막는다', () => {
    expect(checkFeedback('   ', null, now).ok).toBe(false);
  });

  it('너무 긴 글은 막는다', () => {
    expect(checkFeedback('가'.repeat(FEEDBACK_MAX), null, now).ok).toBe(true);
    expect(checkFeedback('가'.repeat(FEEDBACK_MAX + 1), null, now).ok).toBe(false);
  });

  it('방금 보냈으면 잠시 막는다', () => {
    expect(checkFeedback('또', now - 1000, now).ok).toBe(false);
    expect(checkFeedback('또', now - FEEDBACK_COOLDOWN_MS, now).ok).toBe(true);
  });
});
