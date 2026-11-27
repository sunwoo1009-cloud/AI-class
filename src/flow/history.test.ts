import { describe, expect, it } from 'vitest';
import { canGoBack, historyReducer, initHistory } from './history';

type S = { n: number };
type E = { type: 'add'; by: number } | { type: 'same' };
const reduce = (s: S, e: E): S => (e.type === 'add' ? { n: s.n + e.by } : s);
const step = historyReducer(reduce);

describe('historyReducer', () => {
  it('앞으로 가면 지나온 상태가 쌓인다', () => {
    let h = initHistory<S>({ n: 0 });
    h = step(h, { type: 'FORWARD', event: { type: 'add', by: 1 } });
    h = step(h, { type: 'FORWARD', event: { type: 'add', by: 2 } });
    expect(h.cur.n).toBe(3);
    expect(h.past.map((s) => s.n)).toEqual([0, 1]);
  });

  it('뒤로는 한 단계씩 돌아간다', () => {
    let h = initHistory<S>({ n: 0 });
    h = step(h, { type: 'FORWARD', event: { type: 'add', by: 1 } });
    h = step(h, { type: 'FORWARD', event: { type: 'add', by: 2 } });
    h = step(h, { type: 'BACK' });
    expect(h.cur.n).toBe(1);
    h = step(h, { type: 'BACK' });
    expect(h.cur.n).toBe(0);
    expect(canGoBack(h)).toBe(false);
  });

  it('처음에서 뒤로는 아무 일도 없다', () => {
    const h = initHistory<S>({ n: 0 });
    expect(step(h, { type: 'BACK' })).toBe(h);
  });

  it('상태가 그대로인 사건은 쌓지 않는다', () => {
    const h = initHistory<S>({ n: 0 });
    expect(step(h, { type: 'FORWARD', event: { type: 'same' } })).toBe(h);
  });
});
