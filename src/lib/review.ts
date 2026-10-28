import { REVIEW, TECHNIQUE_LABELS } from '../constants';
import type { CheckIn, TechniqueId, WeeklySessionCount } from '../types';

export interface ReviewBucket {
  /** "최근 4주", "그 전 4주" 같은 상대 라벨 */
  label: string;
  startMs: number;
  endMs: number;
  /** 이 구간의 재평정 건수 */
  ratingCount: number;
  /** (sudsPre - sudsPost) 평균. 재평정이 없으면 null */
  avgDrop: number | null;
  /** 이 구간의 주당 평균 회기 수. 입력이 없으면 null */
  sessionsPerWeek: number | null;
}

export interface ReviewResult {
  /** 최신 구간이 먼저 */
  buckets: ReviewBucket[];
  /** 최근 두 구간이 모두 최소 재평정 수를 넘겼는가 */
  comparable: boolean;
  /** 최근 구간의 하강폭이 직전 구간보다 작아졌는가 */
  dropDecreased: boolean;
  /** 기법 1개로 마무리된 비율. 기법을 한 체크인이 없으면 null */
  singleTechniqueRate: number | null;
  /** 기법별 평균 하강폭. 하강폭이 큰 것부터 */
  byTechnique: { id: TechniqueId; label: string; avgDrop: number; count: number }[];
  totalCheckIns: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

function bucketLabel(index: number): string {
  const weeks = REVIEW.bucketDays / 7;
  if (index === 0) return `최근 ${weeks}주`;
  if (index === 1) return `그 전 ${weeks}주`;
  return `${index * weeks}~${(index + 1) * weeks}주 전`;
}

/** 'YYYY-MM-DD' 를 로컬 자정 밀리초로 */
function dateKeyToMs(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

/**
 * 명세 7.4 — 돌아보기.
 * SUDS 원점수 추세는 쓰지 않는다. 그건 사례 구성을 재는 것이지 상태를 재는 것이 아니다.
 * 대신 회기 내 조절 효과(sudsPre - sudsPost)를 쓴다.
 */
export function buildReview(
  checkIns: CheckIn[],
  weeklySessions: WeeklySessionCount[],
  now: Date = new Date(),
): ReviewResult {
  const nowMs = now.getTime();

  const buckets: ReviewBucket[] = [];
  for (let i = 0; i < REVIEW.maxBuckets; i++) {
    const endMs = nowMs - i * REVIEW.bucketDays * DAY_MS;
    const startMs = endMs - REVIEW.bucketDays * DAY_MS;

    const drops: number[] = [];
    for (const c of checkIns) {
      const t = new Date(c.timestamp).getTime();
      if (Number.isNaN(t) || t < startMs || t >= endMs) continue;
      for (const tech of c.techniques) {
        if (tech.sudsPost !== null) drops.push(c.sudsPre - tech.sudsPost);
      }
    }

    const sessions = weeklySessions
      .filter((w) => {
        const ms = dateKeyToMs(w.weekStart);
        return w.sessions !== null && ms >= startMs && ms < endMs;
      })
      .map((w) => w.sessions as number);

    buckets.push({
      label: bucketLabel(i),
      startMs,
      endMs,
      ratingCount: drops.length,
      avgDrop: mean(drops),
      sessionsPerWeek: mean(sessions),
    });
  }

  const [recent, previous] = buckets;
  const comparable =
    recent.ratingCount >= REVIEW.minRatingsPerBucket &&
    previous !== undefined &&
    previous.ratingCount >= REVIEW.minRatingsPerBucket;

  const dropDecreased =
    comparable &&
    recent.avgDrop !== null &&
    previous.avgDrop !== null &&
    recent.avgDrop < previous.avgDrop;

  // 기법 1개로 마무리된 비율 — 기법을 한 체크인만 분모에 넣는다.
  const withTechnique = checkIns.filter((c) => c.techniques.length > 0);
  const single = withTechnique.filter(
    (c) => c.techniques.length === 1 && !c.externalResourceOffered,
  );
  const singleTechniqueRate =
    withTechnique.length === 0 ? null : single.length / withTechnique.length;

  // 기법별 평균 하강폭
  const perTechnique = new Map<TechniqueId, number[]>();
  for (const c of checkIns) {
    for (const tech of c.techniques) {
      if (tech.sudsPost === null) continue;
      const list = perTechnique.get(tech.id) ?? [];
      list.push(c.sudsPre - tech.sudsPost);
      perTechnique.set(tech.id, list);
    }
  }
  const byTechnique = [...perTechnique.entries()]
    .map(([id, drops]) => ({
      id,
      label: TECHNIQUE_LABELS[id],
      avgDrop: mean(drops) as number,
      count: drops.length,
    }))
    .sort((a, b) => b.avgDrop - a.avgDrop);

  return {
    buckets,
    comparable,
    dropDecreased,
    singleTechniqueRate,
    byTechnique,
    totalCheckIns: checkIns.length,
  };
}
