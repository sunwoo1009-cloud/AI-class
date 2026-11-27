import { describe, expect, it } from 'vitest';
import { HELP_PLACES, kakaoSearchUrl } from './FindHelp';

describe('도움받을 곳 찾기 — 카카오맵 검색 링크', () => {
  it('카카오맵 공식 검색 링크 모양이고 한글은 인코딩된다', () => {
    expect(kakaoSearchUrl('심리상담센터')).toBe(
      `https://map.kakao.com/link/search/${encodeURIComponent('심리상담센터')}`,
    );
  });

  it('세 곳: 정신건강의학과 · 심리상담센터 · 정신건강복지센터', () => {
    expect(HELP_PLACES.map((p) => p.query)).toEqual(['정신건강의학과', '심리상담센터', '정신건강복지센터']);
  });
});
