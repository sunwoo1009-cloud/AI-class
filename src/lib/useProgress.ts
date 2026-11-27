import { useEffect, useRef, useState } from 'react';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * 진행 막대 상태 (2026-11-27).
 *
 * - run(task): 막대를 띄우고 일을 한다. 일이 얼마나 남았는지 알 수 없으니
 *   90%까지는 천천히 다가가고, 일이 끝나면 100%를 채운다.
 *   너무 빨리 끝나 막대가 깜빡이고 사라지지 않게 최소 시간(minMs)을 둔다.
 * - fill(ms): 정해진 시간 동안 0 → 100% 를 고르게 채운다 (삭제처럼 순식간에 끝나는 일).
 * - showDone(): 100% 다음 완료 표시를 잠깐 띄운다.
 */
export function useProgress() {
  const [pct, setPct] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const alive = useRef(true);
  const doneTimer = useRef<number | null>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (doneTimer.current !== null) clearTimeout(doneTimer.current);
    };
  }, []);

  const set = (v: number | null) => {
    if (alive.current) setPct(v);
  };

  async function run<T>(task: () => Promise<T>, minMs = 900): Promise<T> {
    setDone(false);
    set(0);
    const id = window.setInterval(() => {
      if (alive.current) setPct((p) => (p === null ? null : p + (90 - p) * 0.12));
    }, 80);
    try {
      const [result] = await Promise.all([task(), sleep(minMs)]);
      window.clearInterval(id);
      set(100);
      await sleep(380);
      set(null);
      return result;
    } catch (e) {
      window.clearInterval(id);
      set(null);
      throw e;
    }
  }

  async function fill(ms = 1200): Promise<void> {
    setDone(false);
    const steps = 20;
    for (let i = 0; i <= steps; i += 1) {
      set((i / steps) * 100);
      await sleep(ms / steps);
    }
    await sleep(250);
  }

  function showDone(ms = 2600) {
    setDone(true);
    if (doneTimer.current !== null) clearTimeout(doneTimer.current);
    doneTimer.current = window.setTimeout(() => {
      if (alive.current) setDone(false);
    }, ms);
  }

  function clear() {
    set(null);
  }

  return { pct, done, run, fill, showDone, clear };
}
