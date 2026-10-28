import type { CheckIn, JournalEntry } from '../types';
import { toDateKey } from './date';

export interface DayCell {
  /** 빈 칸이면 null */
  dateKey: string | null;
  day: number | null;
  checkInCount: number;
  /** 그날 가장 높은 개입 전 점수. 없으면 null */
  maxSudsPre: number | null;
  hasJournal: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

function emptyCell(): DayCell {
  return {
    dateKey: null,
    day: null,
    checkInCount: 0,
    maxSudsPre: null,
    hasJournal: false,
    isToday: false,
    isFuture: false,
  };
}

/** 일요일(0) 기준인 getDay를 월요일(0) 기준으로 바꾼다 */
function mondayIndex(date: Date): number {
  const d = date.getDay();
  return d === 0 ? 6 : d - 1;
}

/**
 * 명세 7.5 — 월 그리드. 월요일 시작, 주 단위 배열로 돌려준다.
 * 연속 기록이나 빈 날 강조를 위한 값은 두지 않는다.
 */
export function buildMonthGrid(
  year: number,
  month: number, // 1~12
  checkIns: CheckIn[],
  journal: JournalEntry[],
  now: Date = new Date(),
): DayCell[][] {
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayKey = toDateKey(now);

  // 날짜별로 미리 묶는다
  const byDate = new Map<string, CheckIn[]>();
  for (const c of checkIns) {
    const t = new Date(c.timestamp);
    if (Number.isNaN(t.getTime())) continue;
    const key = toDateKey(t);
    const list = byDate.get(key) ?? [];
    list.push(c);
    byDate.set(key, list);
  }
  const journalDates = new Set(journal.map((j) => j.date));

  const cells: DayCell[] = [];
  for (let i = 0; i < mondayIndex(first); i++) cells.push(emptyCell());

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dateKey = toDateKey(date);
    const dayCheckIns = byDate.get(dateKey) ?? [];
    cells.push({
      dateKey,
      day,
      checkInCount: dayCheckIns.length,
      maxSudsPre:
        dayCheckIns.length === 0
          ? null
          : Math.max(...dayCheckIns.map((c) => c.sudsPre)),
      hasJournal: journalDates.has(dateKey),
      isToday: dateKey === todayKey,
      isFuture: dateKey > todayKey,
    });
  }

  while (cells.length % 7 !== 0) cells.push(emptyCell());

  const weeks: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** 그날 체크인을 시간순으로 */
export function checkInsForDate(
  checkIns: CheckIn[],
  dateKey: string,
): CheckIn[] {
  return checkIns
    .filter((c) => {
      const t = new Date(c.timestamp);
      return !Number.isNaN(t.getTime()) && toDateKey(t) === dateKey;
    })
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
}

export function monthLabel(year: number, month: number): string {
  return `${year}년 ${month}월`;
}

/** 다음 달로 갈 수 있는지 — 이번 달 이후로는 가지 않는다 */
export function canGoNext(
  year: number,
  month: number,
  now: Date = new Date(),
): boolean {
  return year * 12 + month < now.getFullYear() * 12 + (now.getMonth() + 1);
}
