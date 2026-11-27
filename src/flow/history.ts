/**
 * 체크인 흐름의 '뒤로' (2026-11-27).
 *
 * 상태 기계(reduce)는 그대로 두고, 지나온 상태를 쌓아 두었다가 뒤로를 누르면 하나 꺼낸다.
 * 상태가 바뀌지 않은 사건은 쌓지 않는다 — 뒤로 한 번에 실제로 한 화면씩 돌아간다.
 */
export interface History<S> {
  cur: S;
  past: S[];
}

export type HistoryEvent<E> = { type: 'BACK' } | { type: 'FORWARD'; event: E };

export function initHistory<S>(cur: S): History<S> {
  return { cur, past: [] };
}

export function canGoBack<S>(h: History<S>): boolean {
  return h.past.length > 0;
}

export function historyReducer<S, E>(reduce: (s: S, e: E) => S) {
  return (h: History<S>, ev: HistoryEvent<E>): History<S> => {
    if (ev.type === 'BACK') {
      if (h.past.length === 0) return h;
      return { cur: h.past[h.past.length - 1], past: h.past.slice(0, -1) };
    }
    const next = reduce(h.cur, ev.event);
    if (next === h.cur) return h;
    return { cur: next, past: [...h.past, h.cur] };
  };
}
