import { describe, expect, it } from 'vitest';
import { buildReview } from './review';
import { buildWeeklySummary } from './summary';
import type { CheckIn, ReactionType, TechniqueId } from '../types';

const NOW = new Date('2026-10-28T12:00:00');

function ci(
  daysAgo: number,
  sudsPre: number,
  techniques: { id: TechniqueId; sudsPost: number | null }[] = [],
  reactions: ReactionType[] = ['hyperarousal'],
  externalResourceOffered = false,
): CheckIn {
  const t = new Date(NOW);
  t.setDate(t.getDate() - daysAgo);
  return {
    id: `${daysAgo}-${sudsPre}-${Math.random()}`,
    timestamp: t.toISOString(),
    reactions,
    sudsPre,
    techniques,
    ruminationSafetyFlag: false,
    externalResourceOffered,
    readiness: 'ready',
  };
}

const br = (id: TechniqueId, sudsPost: number | null) => ({ id, sudsPost });

// ---------------------------------------------------------------------------
// 7.1 주간 요약
// ---------------------------------------------------------------------------

describe('7.1 주간 요약', () => {
  it('최근 7일만 집계한다', () => {
    const s = buildWeeklySummary(
      [ci(1, 8), ci(3, 6), ci(10, 10)],
      [],
      NOW,
    );
    expect(s.checkInCount).toBe(2);
    expect(s.avgSudsPre).toBe(7);
  });

  it('반응 유형별 빈도를 센다 (선택한 모든 반응)', () => {
    const s = buildWeeklySummary(
      [
        ci(1, 8, [], ['anger', 'intrusion']),
        ci(2, 5, [], ['anger']),
      ],
      [],
      NOW,
    );
    const anger = s.reactionCounts.find((r) => r.reaction === 'anger');
    const intrusion = s.reactionCounts.find((r) => r.reaction === 'intrusion');
    expect(anger?.count).toBe(2);
    expect(intrusion?.count).toBe(1);
  });

  it('재평정 평균은 null을 제외한다', () => {
    const s = buildWeeklySummary(
      [ci(1, 8, [br('slow_breathing', 4), br('containment', null)])],
      [],
      NOW,
    );
    expect(s.avgSudsPost).toBe(4);
  });

  it('재평정이 하나도 없으면 null이다', () => {
    const s = buildWeeklySummary([ci(1, 3)], [], NOW);
    expect(s.avgSudsPost).toBeNull();
  });

  it('기록이 없으면 평균이 null이다', () => {
    const s = buildWeeklySummary([], [], NOW);
    expect(s.checkInCount).toBe(0);
    expect(s.avgSudsPre).toBeNull();
  });

  it('이번 주 회기 수를 가져온다', () => {
    // 2026-10-28은 수요일 → 그 주 월요일은 2026-10-26
    const s = buildWeeklySummary(
      [ci(1, 5)],
      [{ weekStart: '2026-10-26', sessions: 18 }],
      NOW,
    );
    expect(s.sessions).toBe(18);
  });
});

// ---------------------------------------------------------------------------
// 7.4 돌아보기
// ---------------------------------------------------------------------------

describe('7.4 돌아보기 — 조절 효과', () => {
  it('하강폭은 최초 개입 전 점수 대비로 계산한다', () => {
    const r = buildReview([ci(1, 9, [br('slow_breathing', 6)])], [], NOW);
    expect(r.buckets[0].avgDrop).toBe(3);
  });

  it('구간을 4주 단위로 나눈다', () => {
    const r = buildReview(
      [ci(1, 9, [br('slow_breathing', 6)]), ci(30, 8, [br('grounding', 7)])],
      [],
      NOW,
    );
    expect(r.buckets[0].ratingCount).toBe(1);
    expect(r.buckets[1].ratingCount).toBe(1);
    expect(r.buckets[0].avgDrop).toBe(3);
    expect(r.buckets[1].avgDrop).toBe(1);
  });

  it('구간당 재평정이 3회 미만이면 비교하지 않는다', () => {
    const r = buildReview(
      [ci(1, 9, [br('slow_breathing', 6)]), ci(30, 8, [br('grounding', 7)])],
      [],
      NOW,
    );
    expect(r.comparable).toBe(false);
  });

  it('두 구간 모두 3회 이상이면 비교한다', () => {
    const recent = [1, 2, 3].map((d) => ci(d, 9, [br('slow_breathing', 6)]));
    const older = [29, 30, 31].map((d) => ci(d, 9, [br('grounding', 8)]));
    const r = buildReview([...recent, ...older], [], NOW);
    expect(r.comparable).toBe(true);
    expect(r.buckets[0].avgDrop).toBe(3);
    expect(r.buckets[1].avgDrop).toBe(1);
    expect(r.dropDecreased).toBe(false);
  });

  it('하강폭이 줄어든 것을 감지한다', () => {
    const recent = [1, 2, 3].map((d) => ci(d, 9, [br('slow_breathing', 8)]));
    const older = [29, 30, 31].map((d) => ci(d, 9, [br('grounding', 5)]));
    const r = buildReview([...recent, ...older], [], NOW);
    expect(r.dropDecreased).toBe(true);
  });

  it('재평정이 null인 기법은 계산에서 빠진다', () => {
    const r = buildReview(
      [ci(1, 9, [br('detachment', null)]), ci(2, 9, [br('slow_breathing', 5)])],
      [],
      NOW,
    );
    expect(r.buckets[0].ratingCount).toBe(1);
    expect(r.buckets[0].avgDrop).toBe(4);
  });
});

describe('7.4 돌아보기 — 기법 하나로 마무리된 비율', () => {
  it('기법 1개로 끝나고 앱 밖 자원이 없으면 성공으로 센다', () => {
    const r = buildReview(
      [
        ci(1, 5, [br('self_distancing', 2)]),
        ci(2, 9, [br('slow_breathing', 9), br('containment', 9)], ['intrusion'], true),
      ],
      [],
      NOW,
    );
    expect(r.singleTechniqueRate).toBe(0.5);
  });

  it('기법을 하나도 안 한 체크인은 분모에서 빠진다', () => {
    const r = buildReview(
      [ci(1, 2), ci(2, 5, [br('self_distancing', 2)])],
      [],
      NOW,
    );
    expect(r.singleTechniqueRate).toBe(1);
  });

  it('기법을 한 체크인이 없으면 null이다', () => {
    const r = buildReview([ci(1, 2)], [], NOW);
    expect(r.singleTechniqueRate).toBeNull();
  });
});

describe('7.4 돌아보기 — 기법별 하강폭과 누적', () => {
  it('기법별 평균 하강폭을 센다', () => {
    const r = buildReview(
      [
        ci(1, 9, [br('slow_breathing', 5)]),
        ci(2, 8, [br('slow_breathing', 6)]),
        ci(3, 7, [br('grounding', 6)]),
      ],
      [],
      NOW,
    );
    const breathing = r.byTechnique.find((t) => t.id === 'slow_breathing');
    expect(breathing?.count).toBe(2);
    expect(breathing?.avgDrop).toBe(3); // (4 + 2) / 2
    // 하강폭이 큰 기법이 먼저 온다
    expect(r.byTechnique[0].id).toBe('slow_breathing');
  });

  it('누적 체크인 수를 센다', () => {
    const r = buildReview([ci(1, 5), ci(40, 5), ci(100, 5)], [], NOW);
    expect(r.totalCheckIns).toBe(3);
  });

  it('기록이 없으면 빈 결과를 돌려준다', () => {
    const r = buildReview([], [], NOW);
    expect(r.totalCheckIns).toBe(0);
    expect(r.comparable).toBe(false);
    expect(r.byTechnique).toHaveLength(0);
  });
});

describe('7.4 돌아보기 — 회기 수 맥락', () => {
  it('구간별 주당 평균 회기 수를 계산한다', () => {
    const recent = [1, 2, 3].map((d) => ci(d, 9, [br('slow_breathing', 8)]));
    const older = [29, 30, 31].map((d) => ci(d, 9, [br('grounding', 5)]));
    // 최근 구간은 2026-09-30 ~ 10-28, 그 전 구간은 2026-09-02 ~ 09-30
    const r = buildReview([...recent, ...older], [
      { weekStart: '2026-10-26', sessions: 24 },
      { weekStart: '2026-10-19', sessions: 24 },
      { weekStart: '2026-10-12', sessions: 24 },
      { weekStart: '2026-10-05', sessions: 24 },
      { weekStart: '2026-09-28', sessions: 18 },
      { weekStart: '2026-09-21', sessions: 18 },
    ], NOW);
    expect(r.dropDecreased).toBe(true);
    expect(r.buckets[0].sessionsPerWeek).toBe(24);
    expect(r.buckets[1].sessionsPerWeek).toBe(18);
  });

  it('회기 수를 입력하지 않았으면 null이다', () => {
    const r = buildReview([ci(1, 9, [br('slow_breathing', 5)])], [], NOW);
    expect(r.buckets[0].sessionsPerWeek).toBeNull();
  });
});
