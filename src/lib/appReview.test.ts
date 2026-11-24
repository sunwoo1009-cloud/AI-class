import { describe, expect, it } from 'vitest';
import { REVIEW_COOLDOWN_MS, REVIEW_MAX, averageRating, checkReview } from './appReview';

describe('checkReview — 별점·리뷰 보내기 전 검사', () => {
  const now = 1_000_000;

  it('별점이 없으면 막는다', () => {
    expect(checkReview(null, '좋아요', null, now).ok).toBe(false);
    expect(checkReview(0, '', null, now).ok).toBe(false);
    expect(checkReview(6, '', null, now).ok).toBe(false);
  });

  it('리뷰 글은 비워도 된다', () => {
    expect(checkReview(4, '   ', null, now)).toEqual({ ok: true, rating: 4, body: '' });
  });

  it('리뷰 글이 너무 길면 막는다', () => {
    expect(checkReview(5, '가'.repeat(REVIEW_MAX), null, now).ok).toBe(true);
    expect(checkReview(5, '가'.repeat(REVIEW_MAX + 1), null, now).ok).toBe(false);
  });

  it('방금 보냈으면 잠시 막는다', () => {
    expect(checkReview(5, '', now - 1000, now).ok).toBe(false);
    expect(checkReview(5, '', now - REVIEW_COOLDOWN_MS, now).ok).toBe(true);
  });
});

describe('averageRating — 평균 별점', () => {
  it('소수 첫째 자리까지', () => {
    expect(averageRating([5, 4, 4])).toBe(4.3);
  });

  it('없으면 null', () => {
    expect(averageRating([])).toBeNull();
  });
});
