import { describe, expect, it } from 'vitest';
import { UPDATE_LOG, screenTimeline } from './updateLog';

describe('screenTimeline — 화면마다 가장 최근 변경 하나', () => {
  it('날짜가 가장 늦은 것이 latest', () => {
    const t = screenTimeline({
      screen: 'x',
      changes: [
        { kind: '수정', date: '11-24', text: 'a' },
        { kind: '추가', date: '11-27', text: 'b', history: [{ date: '11-25', text: 'b0' }] },
        { kind: '삭제', date: '11-25', text: 'c' },
      ],
    });
    expect(t.latest.text).toBe('b');
    expect(t.past.map((p) => p.text)).toEqual(['c', 'b0', 'a']);
  });

  it('같은 날이면 나중에 적힌 것이 latest', () => {
    const t = screenTimeline({
      screen: 'x',
      changes: [
        { kind: '수정', date: '11-24', text: 'a' },
        { kind: '수정', date: '11-24', text: 'b' },
      ],
    });
    expect(t.latest.text).toBe('b');
    expect(t.past.map((p) => p.text)).toEqual(['a']);
  });

  it("'처음'은 가장 오래된 것으로 맨 뒤에", () => {
    const t = screenTimeline({
      screen: 'x',
      changes: [{ kind: '수정', date: '11-24', text: 'a', history: [{ date: '처음', text: 'old' }] }],
    });
    expect(t.past).toEqual([{ date: '처음', text: 'old' }]);
  });

  it('실제 목록의 모든 화면에 변경이 하나 이상 있다', () => {
    for (const c of UPDATE_LOG) for (const s of c.screens) expect(s.changes.length).toBeGreaterThan(0);
  });
});
