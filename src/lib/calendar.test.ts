import { describe, expect, it } from 'vitest';
import { buildMonthGrid, checkInsForDate, monthLabel } from './calendar';
import type { CheckIn, JournalEntry, ReactionType } from '../types';

const NOW = new Date('2026-10-28T12:00:00');

function ci(dateTime: string, sudsPre = 5, reactions: ReactionType[] = ['anger']): CheckIn {
  return {
    id: dateTime,
    timestamp: new Date(dateTime).toISOString(),
    reactions,
    sudsPre,
    techniques: [{ id: 'self_distancing', sudsPost: 3 }],
    ruminationSafetyFlag: false,
    externalResourceOffered: false,
    readiness: 'ready',
  };
}

function journal(date: string): JournalEntry {
  return {
    id: date,
    date,
    answers: [{ promptId: 'drain', text: '많았어요' }],
    createdAt: `${date}T18:00:00.000Z`,
    updatedAt: `${date}T18:00:00.000Z`,
  };
}

describe('buildMonthGrid — 월요일 시작 그리드', () => {
  // 2026년 10월 1일은 목요일
  const grid = buildMonthGrid(2026, 10, [], [], NOW);

  it('주 단위 배열이고 각 주는 7칸이다', () => {
    expect(grid.every((week) => week.length === 7)).toBe(true);
  });

  it('첫 주는 월·화·수가 빈 칸이고 목요일이 1일이다', () => {
    expect(grid[0][0].dateKey).toBeNull();
    expect(grid[0][1].dateKey).toBeNull();
    expect(grid[0][2].dateKey).toBeNull();
    expect(grid[0][3].day).toBe(1);
    expect(grid[0][3].dateKey).toBe('2026-10-01');
  });

  it('31일까지 모두 들어간다', () => {
    const days = grid.flat().filter((c) => c.day !== null);
    expect(days).toHaveLength(31);
    expect(days[30].dateKey).toBe('2026-10-31');
  });

  it('마지막 주의 남는 칸은 빈 칸이다', () => {
    const last = grid[grid.length - 1];
    expect(last.some((c) => c.dateKey === null)).toBe(true);
  });

  it('2월 같은 짧은 달도 처리한다', () => {
    const feb = buildMonthGrid(2026, 2, [], [], NOW);
    const days = feb.flat().filter((c) => c.day !== null);
    expect(days).toHaveLength(28);
  });
});

describe('buildMonthGrid — 기록 표시', () => {
  const checkIns = [
    ci('2026-10-05T10:00:00', 8),
    ci('2026-10-05T16:00:00', 4),
    ci('2026-10-20T09:00:00', 6),
  ];
  const journals = [journal('2026-10-05')];
  const grid = buildMonthGrid(2026, 10, checkIns, journals, NOW).flat();
  const cell = (key: string) => grid.find((c) => c.dateKey === key)!;

  it('하루 체크인 횟수를 센다', () => {
    expect(cell('2026-10-05').checkInCount).toBe(2);
    expect(cell('2026-10-20').checkInCount).toBe(1);
    expect(cell('2026-10-06').checkInCount).toBe(0);
  });

  it('그날 가장 높은 개입 전 점수를 담는다', () => {
    expect(cell('2026-10-05').maxSudsPre).toBe(8);
    expect(cell('2026-10-06').maxSudsPre).toBeNull();
  });

  it('일기 유무를 표시한다', () => {
    expect(cell('2026-10-05').hasJournal).toBe(true);
    expect(cell('2026-10-20').hasJournal).toBe(false);
  });

  it('오늘과 미래를 구분한다', () => {
    expect(cell('2026-10-28').isToday).toBe(true);
    expect(cell('2026-10-27').isFuture).toBe(false);
    expect(cell('2026-10-29').isFuture).toBe(true);
  });
});

describe('checkInsForDate', () => {
  const checkIns = [
    ci('2026-10-05T16:00:00', 4),
    ci('2026-10-05T10:00:00', 8),
    ci('2026-10-06T11:00:00', 6),
  ];

  it('그날 기록만 시간순으로 돌려준다', () => {
    const list = checkInsForDate(checkIns, '2026-10-05');
    expect(list).toHaveLength(2);
    expect(list[0].sudsPre).toBe(8); // 오전이 먼저
    expect(list[1].sudsPre).toBe(4);
  });

  it('기록이 없는 날은 빈 배열이다', () => {
    expect(checkInsForDate(checkIns, '2026-10-07')).toHaveLength(0);
  });
});

describe('monthLabel', () => {
  it('연·월을 한국어로 쓴다', () => {
    expect(monthLabel(2026, 10)).toBe('2026년 10월');
  });
});
