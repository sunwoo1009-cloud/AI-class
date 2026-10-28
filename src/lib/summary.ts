import { ESCALATION, REACTIONS } from '../constants';
import type { CheckIn, ReactionType, WeeklySessionCount } from '../types';
import { isWithinDays, weekStartKey } from './date';

export interface WeeklySummary {
  checkInCount: number;
  reactionCounts: { reaction: ReactionType; label: string; count: number }[];
  avgSudsPre: number | null;
  avgSudsPost: number | null;
  /** 이번 주(월요일 시작) 회기 수. 사용자가 입력한 경우에만 */
  sessions: number | null;
  weekStart: string;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

/**
 * 명세 7.1 — 최근 7일 기준 주간 요약.
 * 통계는 롤링 7일이고, 회기 수만 월요일 시작 주 단위다(4절 weekStart).
 */
export function buildWeeklySummary(
  checkIns: CheckIn[],
  weeklySessions: WeeklySessionCount[],
  now: Date = new Date(),
): WeeklySummary {
  const window = checkIns.filter((c) =>
    isWithinDays(c.timestamp, ESCALATION.windowDays, now),
  );

  const posts: number[] = [];
  for (const c of window) {
    for (const t of c.techniques) {
      if (t.sudsPost !== null) posts.push(t.sudsPost);
    }
  }

  const reactionCounts = REACTIONS.map(({ id, label }) => ({
    reaction: id,
    label,
    count: window.filter((c) => c.reactions.includes(id)).length,
  })).filter((r) => r.count > 0);
  reactionCounts.sort((a, b) => b.count - a.count);

  const weekStart = weekStartKey(now);
  const entry = weeklySessions.find((w) => w.weekStart === weekStart);

  return {
    checkInCount: window.length,
    reactionCounts,
    avgSudsPre: mean(window.map((c) => c.sudsPre)),
    avgSudsPost: mean(posts),
    sessions: entry?.sessions ?? null,
    weekStart,
  };
}
