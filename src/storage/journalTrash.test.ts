import { beforeEach, describe, expect, it } from 'vitest';
import type { JournalEntry } from '../types';

// node 환경이라 localStorage 를 흉내 낸다
const mem = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
} as Storage;

const { deleteJournal, freshTrash, loadJournal, loadJournalTrash, purgeJournal, restoreJournal, upsertJournal } =
  await import('./store');

const entry = (id: string, date: string): JournalEntry => ({
  id,
  date,
  answers: [{ promptId: 'drain', text: '메모' }],
  createdAt: '2026-11-20T10:00:00.000Z',
  updatedAt: '2026-11-20T10:00:00.000Z',
});

beforeEach(() => mem.clear());

describe('최근 지운 일기', () => {
  it('지우면 목록에서 빠지고 휴지통에 들어간다', () => {
    upsertJournal(entry('a', '2026-11-20'));
    deleteJournal('a');
    expect(loadJournal()).toHaveLength(0);
    expect(loadJournalTrash().map((t) => t.entry.id)).toEqual(['a']);
  });

  it('되살리면 목록으로 돌아오고 휴지통에서 빠진다', () => {
    upsertJournal(entry('a', '2026-11-20'));
    deleteJournal('a');
    expect(restoreJournal('a')).toBe('ok');
    expect(loadJournal().map((j) => j.id)).toEqual(['a']);
    expect(loadJournalTrash()).toHaveLength(0);
  });

  it('그날 일기를 새로 썼으면 덮어쓰지 않는다', () => {
    upsertJournal(entry('a', '2026-11-20'));
    deleteJournal('a');
    upsertJournal(entry('b', '2026-11-20'));
    expect(restoreJournal('a')).toBe('taken');
    expect(loadJournal().map((j) => j.id)).toEqual(['b']);
    expect(loadJournalTrash()).toHaveLength(1);
  });

  it('완전히 지우면 휴지통에서도 사라진다', () => {
    upsertJournal(entry('a', '2026-11-20'));
    deleteJournal('a');
    purgeJournal('a');
    expect(loadJournalTrash()).toHaveLength(0);
    expect(restoreJournal('a')).toBe('missing');
  });

  it('30일이 지난 것은 버린다', () => {
    const now = new Date('2026-12-31T00:00:00.000Z');
    const list = [
      { entry: entry('old', '2026-11-01'), deletedAt: '2026-11-30T00:00:00.000Z' },
      { entry: entry('new', '2026-11-02'), deletedAt: '2026-12-02T00:00:00.000Z' },
      { entry: entry('bad', '2026-11-03'), deletedAt: 'x' },
    ];
    expect(freshTrash(list, now).map((t) => t.entry.id)).toEqual(['new']);
  });
});
