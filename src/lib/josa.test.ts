import { describe, expect, it } from 'vitest';
import { fillName, hasFinalConsonant, josa } from './josa';

describe('hasFinalConsonant', () => {
  it('받침이 있는 이름을 구분한다', () => {
    expect(hasFinalConsonant('한선우')).toBe(false); // 우
    expect(hasFinalConsonant('김민')).toBe(true); // 민
    expect(hasFinalConsonant('박철수')).toBe(false); // 수
    expect(hasFinalConsonant('이정환')).toBe(true); // 환
  });

  it('한글이 아닌 끝 글자는 받침 없음으로 본다', () => {
    expect(hasFinalConsonant('Jay')).toBe(false);
    expect(hasFinalConsonant('상담자1')).toBe(false);
  });

  it('빈 문자열을 안전하게 처리한다', () => {
    expect(hasFinalConsonant('')).toBe(false);
    expect(hasFinalConsonant('   ')).toBe(false);
  });
});

describe('josa', () => {
  it('는/은을 고른다', () => {
    expect(josa('선우', '는/은')).toBe('는');
    expect(josa('민', '는/은')).toBe('은');
  });
});

describe('fillName — 명세 8.6 스크립트', () => {
  it('받침 없는 이름', () => {
    expect(fillName('{name는} 지금 화가 나 있다.', '선우')).toBe(
      '선우는 지금 화가 나 있다.',
    );
  });

  it('받침 있는 이름', () => {
    expect(fillName('{name는} 지금 화가 나 있다.', '민')).toBe(
      '민은 지금 화가 나 있다.',
    );
  });

  it('왜 화가 났을까 문장', () => {
    expect(fillName('{name는} 왜 화가 났을까?', '정환')).toBe(
      '정환은 왜 화가 났을까?',
    );
  });

  it('조사 없는 자리도 채운다', () => {
    expect(fillName('{name}, 잠시만요', '선우')).toBe('선우, 잠시만요');
  });
});
