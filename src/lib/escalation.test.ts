import { describe, expect, it } from 'vitest';
import { ESCALATION } from '../constants';
import { evaluateEscalation } from './escalation';
import type { CheckIn, ReactionType, TechniqueId } from '../types';

const NOW = new Date('2026-10-28T12:00:00');

/** 며칠 전 체크인 하나 */
function ci(
  daysAgo: number,
  sudsPre: number,
  reactions: ReactionType[] = ['hyperarousal'],
  posts: (number | null)[] = [],
): CheckIn {
  const t = new Date(NOW);
  t.setDate(t.getDate() - daysAgo);
  return {
    id: `${daysAgo}-${sudsPre}-${Math.random()}`,
    timestamp: t.toISOString(),
    reactions,
    sudsPre,
    techniques: posts.map((sudsPost, i) => ({
      id: (i === 0 ? 'slow_breathing' : 'containment') as TechniqueId,
      sudsPost,
    })),
    ruminationSafetyFlag: false,
    externalResourceOffered: false,
    readiness: 'ready',
  };
}

describe('7.2 조건 ① sudsPre 7 이상이 3회 이상', () => {
  it('2회면 걸리지 않는다', () => {
    const r = evaluateEscalation([ci(1, 8, ['anger']), ci(2, 7, ['numbness'])], NOW);
    expect(r.reasons).not.toContain('highSuds');
  });

  it('3회면 걸린다', () => {
    const r = evaluateEscalation(
      [ci(1, 8, ['anger']), ci(2, 7, ['numbness']), ci(3, 10, ['heaviness'])],
      NOW,
    );
    expect(r.reasons).toContain('highSuds');
    expect(r.triggered).toBe(true);
  });

  it('6은 세지 않는다', () => {
    const r = evaluateEscalation(
      [ci(1, 6, ['anger']), ci(2, 6, ['numbness']), ci(3, 6, ['heaviness'])],
      NOW,
    );
    expect(r.triggered).toBe(false);
  });

  it('7일을 넘은 기록은 세지 않는다', () => {
    const r = evaluateEscalation(
      [ci(1, 8, ['anger']), ci(2, 9, ['numbness']), ci(9, 10, ['heaviness'])],
      NOW,
    );
    expect(r.reasons).not.toContain('highSuds');
  });
});

describe('7.2 조건 ② 같은 반응 유형이 7 이상으로 2회 이상', () => {
  it('서로 다른 유형 1회씩이면 걸리지 않는다', () => {
    const r = evaluateEscalation([ci(1, 8, ['anger']), ci(2, 9, ['numbness'])], NOW);
    expect(r.reasons).not.toContain('sameReaction');
  });

  it('같은 유형 2회면 걸린다', () => {
    const r = evaluateEscalation(
      [ci(1, 8, ['intrusion']), ci(2, 9, ['intrusion'])],
      NOW,
    );
    expect(r.reasons).toContain('sameReaction');
    expect(r.detail.sameReaction).toContain('intrusion');
  });

  it('보조 반응으로 골랐어도 센다 (sameReactionScope: all)', () => {
    expect(ESCALATION.sameReactionScope).toBe('all');
    const r = evaluateEscalation(
      [ci(1, 8, ['anger', 'intrusion']), ci(2, 9, ['numbness', 'intrusion'])],
      NOW,
    );
    expect(r.detail.sameReaction).toContain('intrusion');
  });

  it('점수가 낮으면 같은 유형이 반복돼도 걸리지 않는다', () => {
    const r = evaluateEscalation(
      [ci(1, 5, ['intrusion']), ci(2, 6, ['intrusion'])],
      NOW,
    );
    expect(r.triggered).toBe(false);
  });
});

describe('7.2 조건 ③ 재평정에서 점수가 내려가지 않은 경우 2회 이상', () => {
  it('1회면 걸리지 않는다', () => {
    const r = evaluateEscalation([ci(1, 5, ['anger'], [5])], NOW);
    expect(r.reasons).not.toContain('noImprovement');
  });

  it('같은 점수도 내려가지 않은 것으로 센다', () => {
    const r = evaluateEscalation(
      [ci(1, 5, ['anger'], [5]), ci(2, 6, ['numbness'], [6])],
      NOW,
    );
    expect(r.reasons).toContain('noImprovement');
  });

  it('올라간 경우도 센다', () => {
    const r = evaluateEscalation(
      [ci(1, 5, ['anger'], [7]), ci(2, 4, ['numbness'], [6])],
      NOW,
    );
    expect(r.reasons).toContain('noImprovement');
  });

  it('한 체크인 안의 재평정 2건도 2회로 센다', () => {
    const r = evaluateEscalation([ci(1, 5, ['anger'], [5, 6])], NOW);
    expect(r.reasons).toContain('noImprovement');
  });

  it('재평정이 없는 기법(null)은 세지 않는다', () => {
    const r = evaluateEscalation(
      [ci(1, 5, ['anger'], [null]), ci(2, 5, ['numbness'], [null])],
      NOW,
    );
    expect(r.triggered).toBe(false);
  });

  it('내려간 경우는 세지 않는다', () => {
    const r = evaluateEscalation(
      [ci(1, 8, ['anger'], [4]), ci(2, 7, ['numbness'], [3])],
      NOW,
    );
    expect(r.reasons).not.toContain('noImprovement');
  });
});

describe('7.2 종합', () => {
  it('기록이 없으면 걸리지 않는다', () => {
    const r = evaluateEscalation([], NOW);
    expect(r.triggered).toBe(false);
    expect(r.reasons).toHaveLength(0);
  });

  it('여러 조건이 동시에 걸릴 수 있다', () => {
    const r = evaluateEscalation(
      [
        ci(1, 8, ['intrusion'], [8]),
        ci(2, 9, ['intrusion'], [9]),
        ci(3, 7, ['anger'], [4]),
      ],
      NOW,
    );
    expect(r.reasons).toEqual(
      expect.arrayContaining(['highSuds', 'sameReaction', 'noImprovement']),
    );
  });
});
