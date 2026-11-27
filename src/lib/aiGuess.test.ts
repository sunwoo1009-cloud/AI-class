import { describe, expect, it } from 'vitest';
import { aiCaseInfo, cleanAiReactions } from './aiGuess';

describe('aiCaseInfo — 사례 정보가 섞였다는 서버 표시', () => {
  it('true 일 때만 true', () => {
    expect(aiCaseInfo({ reactions: [], caseInfo: true })).toBe(true);
    expect(aiCaseInfo({ reactions: [], caseInfo: false })).toBe(false);
  });
  it('옛 함수(표시 없음)·이상한 값은 false', () => {
    expect(aiCaseInfo({ reactions: ['anger'] })).toBe(false);
    expect(aiCaseInfo({ caseInfo: 'yes' })).toBe(false);
    expect(aiCaseInfo(null)).toBe(false);
  });
});

describe('cleanAiReactions — 서버 답을 믿을 수 있는 모양으로', () => {
  it('아는 반응만, 겹치지 않게, 두 개까지', () => {
    expect(
      cleanAiReactions({ reactions: ['anger', 'nope', 'anger', 'numbness', 'heaviness'] }),
    ).toEqual(['anger', 'numbness']);
  });
  it('빈 목록은 빈 목록 (알아보지 못함)', () => {
    expect(cleanAiReactions({ reactions: [] })).toEqual([]);
  });
  it('모양이 틀리면 null (기기 안 판단으로 넘어간다)', () => {
    expect(cleanAiReactions(null)).toBeNull();
    expect(cleanAiReactions({ error: 'rate' })).toBeNull();
    expect(cleanAiReactions({ reactions: 'anger' })).toBeNull();
  });
});
