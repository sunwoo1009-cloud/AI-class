import { describe, expect, it } from 'vitest';
import { TECHNIQUE_SCRIPTS } from '../scripts/techniques';
import type { ScriptOption } from '../scripts/techniques';
import { resolveOptions, toggleChoice } from './choice';

const opts: ScriptOption[] = [
  { id: 'a', label: 'A' },
  { id: 'b', label: 'B' },
  { id: 'none', label: '정하지 않음', exclusive: true },
];

describe('toggleChoice — 여러 개 고르기', () => {
  it('누르면 더하고, 다시 누르면 뺀다', () => {
    expect(toggleChoice([], opts[0], opts)).toEqual(['a']);
    expect(toggleChoice(['a'], opts[1], opts)).toEqual(['a', 'b']);
    expect(toggleChoice(['a', 'b'], opts[0], opts)).toEqual(['b']);
  });

  it("'정하지 않음'을 고르면 나머지가 빠진다", () => {
    expect(toggleChoice(['a', 'b'], opts[2], opts)).toEqual(['none']);
  });

  it("다른 것을 고르면 '정하지 않음'이 빠진다", () => {
    expect(toggleChoice(['none'], opts[0], opts)).toEqual(['a']);
  });
});

describe('resolveOptions — 심리적 분리 2번 선택지 (명세 8.4)', () => {
  const step = TECHNIQUE_SCRIPTS.detachment.steps[1];
  if (step.kind !== 'choice') throw new Error('2번은 선택 단계여야 한다');

  it('안전 걱정을 고르지 않았으면 기본 선택지', () => {
    const ids = resolveOptions(step, { thought_kind: ['missed'] }).map((o) => o.id);
    expect(ids).toContain('undecided');
    expect(ids).not.toContain('immediate');
  });

  it("여러 개 중에 '내담자 안전에 대한 걱정'이 있으면 '지금 바로 확인 필요'를 보여준다", () => {
    const options = resolveOptions(step, { thought_kind: ['missed', 'client_safety'] });
    const immediate = options.find((o) => o.id === 'immediate');
    expect(immediate?.action).toBe('safety_immediate');
    expect(options.map((o) => o.id)).not.toContain('undecided');
  });

  it('두 단계 모두 여러 개 고르기다', () => {
    const [s1, s2] = TECHNIQUE_SCRIPTS.detachment.steps;
    expect(s1.kind === 'choice' && s1.multiple).toBe(true);
    expect(s2.kind === 'choice' && s2.multiple).toBe(true);
  });
});
