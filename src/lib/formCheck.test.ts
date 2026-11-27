import { describe, expect, it } from 'vitest';
import { emailState, isEmail, passwordProblem } from './formCheck';

describe('isEmail', () => {
  it.each(['a@b.co', 'me.name@mail.example.com', ' user+tag@daum.net '])('맞는 형식: %s', (v) => {
    expect(isEmail(v)).toBe(true);
  });
  it.each(['', 'abc', 'a@b', 'a@b.c', 'a b@c.com', '@c.com', 'a@.com', 'a@b..com'])(
    '틀린 형식: %s',
    (v) => {
      expect(isEmail(v)).toBe(false);
    },
  );
});

describe('emailState', () => {
  it('비어 있으면 empty', () => expect(emailState('  ', true)).toBe('empty'));
  it('맞으면 칸을 떠나기 전에도 valid', () => expect(emailState('a@b.co', false)).toBe('valid'));
  it('치는 중에는 오류를 보이지 않는다', () => expect(emailState('a@b', false)).toBe('typing'));
  it('칸을 떠난 뒤 틀리면 invalid', () => expect(emailState('a@b', true)).toBe('invalid'));
});

describe('passwordProblem', () => {
  it('비면 입력 요청', () => expect(passwordProblem('')).toMatch('입력'));
  it('6자 미만이면 길이 안내', () => expect(passwordProblem('12345')).toMatch('6자'));
  it('6자 이상이면 문제 없음', () => expect(passwordProblem('123456')).toBeNull());
});
