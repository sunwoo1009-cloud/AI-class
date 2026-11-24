import { describe, expect, it } from 'vitest';
import { friendlyError, loadSyncPrefs } from './account';

describe('friendlyError — 서버 오류를 사용자 문구로', () => {
  it('자주 나오는 오류를 우리말로 바꾼다', () => {
    expect(friendlyError('Invalid login credentials')).toBe('이메일 또는 비밀번호가 맞지 않아요');
    expect(friendlyError('User already registered')).toContain('이미 가입된');
    expect(friendlyError('Email not confirmed')).toContain('확인 링크');
    expect(friendlyError('Password should be at least 6 characters')).toContain('6자');
    expect(friendlyError('email rate limit exceeded')).toContain('잠시');
  });

  it('모르는 오류는 원문을 덧붙인다', () => {
    expect(friendlyError('something odd')).toContain('something odd');
  });
});

describe('loadSyncPrefs — 일기 백업은 기본 꺼짐', () => {
  it('저장된 게 없으면 일기 백업은 꺼져 있다', () => {
    expect(loadSyncPrefs().journalBackup).toBe(false);
  });
});
