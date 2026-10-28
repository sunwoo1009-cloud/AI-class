import { ESCALATION, REACTIONS } from '../constants';
import type { CheckIn, ReactionType } from '../types';
import { isWithinDays } from './date';

export type EscalationReason = 'highSuds' | 'sameReaction' | 'noImprovement';

export interface EscalationResult {
  triggered: boolean;
  reasons: EscalationReason[];
  detail: {
    highSudsCount: number;
    /** 조건 ②에 걸린 반응 유형들 */
    sameReaction: ReactionType[];
    noImprovementCount: number;
  };
}

/**
 * 명세 7.2 — 최근 7일 안에 아래 중 하나라도 해당하면 자원 제안 카드를 띄운다.
 *   ① sudsPre가 7 이상인 체크인이 3회 이상
 *   ② 같은 반응 유형이 sudsPre 7 이상으로 2회 이상
 *   ③ 재평정에서 점수가 내려가지 않은 경우(sudsPost >= sudsPre)가 2회 이상
 *
 * 기준 수치는 검증된 값이 아니라 설계 가정이므로 ESCALATION 상수로 분리되어 있다.
 */
export function evaluateEscalation(
  checkIns: CheckIn[],
  now: Date = new Date(),
): EscalationResult {
  const window = checkIns.filter((c) =>
    isWithinDays(c.timestamp, ESCALATION.windowDays, now),
  );

  // ① 고강도 체크인 횟수
  const high = window.filter((c) => c.sudsPre >= ESCALATION.highSudsThreshold);
  const highSudsCount = high.length;

  // ② 반응 유형별 고강도 횟수
  const sameReaction: ReactionType[] = [];
  for (const { id } of REACTIONS) {
    const count = high.filter((c) =>
      ESCALATION.sameReactionScope === 'primary'
        ? c.reactions[0] === id
        : c.reactions.includes(id),
    ).length;
    if (count >= ESCALATION.sameReactionHighCount) sameReaction.push(id);
  }

  // ③ 내려가지 않은 재평정 건수 (체크인 단위가 아니라 재평정 단위로 센다)
  let noImprovementCount = 0;
  for (const c of window) {
    for (const t of c.techniques) {
      if (t.sudsPost !== null && t.sudsPost >= c.sudsPre) noImprovementCount++;
    }
  }

  const reasons: EscalationReason[] = [];
  if (highSudsCount >= ESCALATION.highSudsCount) reasons.push('highSuds');
  if (sameReaction.length > 0) reasons.push('sameReaction');
  if (noImprovementCount >= ESCALATION.noImprovementCount) {
    reasons.push('noImprovement');
  }

  return {
    triggered: reasons.length > 0,
    reasons,
    detail: { highSudsCount, sameReaction, noImprovementCount },
  };
}
