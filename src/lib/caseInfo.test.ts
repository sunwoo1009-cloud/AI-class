import { describe, expect, it } from 'vitest';
import { findCaseInfo } from './caseInfo';

describe('반응 적기 — 기기 안 사례 정보 확인', () => {
  it('나이를 잡는다', () => {
    expect(findCaseInfo('17살 아이 얘기를 듣고 가슴이 답답해요')).toContain('나이');
    expect(findCaseInfo('열다섯 살이라는 게 마음에 걸려요')).toContain('나이');
  });

  it('학교·학년을 잡는다', () => {
    expect(findCaseInfo('행복중학교 얘기가 계속 떠올라요')).toContain('학교');
    expect(findCaseInfo('중2 학생이라 더 마음이 쓰여요')).toContain('학년');
    expect(findCaseInfo('3학년 2반이라고 했어요')).toContain('학년·반');
  });

  it('전화번호를 잡는다', () => {
    expect(findCaseInfo('010-1234-5678로 연락이 왔어요')).toContain('전화번호');
  });

  it('상담자 자신의 반응은 잡지 않는다', () => {
    expect(findCaseInfo('가슴이 계속 두근거려요')).toEqual([]);
    expect(findCaseInfo('자해 장면이 계속 떠올라서 무서워요')).toEqual([]);
    expect(findCaseInfo('내가 더 잘했어야 했나 계속 생각나요')).toEqual([]);
    expect(findCaseInfo('세상이 멍하게 느껴져요')).toEqual([]);
  });
});
