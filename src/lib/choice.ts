import type { ScriptOption, ScriptStep } from '../scripts/techniques';

type ChoiceStep = Extract<ScriptStep, { kind: 'choice' }>;

/** 지금까지 고른 것 — 선택 칸마다 고른 id 목록 */
export type ChoiceAnswers = Record<string, string[]>;

/**
 * 앞선 선택에 따라 선택지를 바꾼다 (명세 8.4).
 * 여러 개를 고를 수 있으므로, 앞에서 고른 것 **중에** whenValue 가 있으면 바꾼다.
 */
export function resolveOptions(step: ChoiceStep, answers: ChoiceAnswers): ScriptOption[] {
  for (const v of step.variants ?? []) {
    if (answers[v.whenChoiceId]?.includes(v.whenValue)) return v.options;
  }
  return step.options;
}

/**
 * 여러 개 고르기에서 하나를 눌렀을 때.
 * - 이미 골랐으면 뺀다.
 * - '정하지 않음'처럼 따로만 고를 수 있는 것(exclusive)을 고르면 나머지를 비운다.
 * - 다른 것을 고르면 exclusive 는 빠진다.
 */
export function toggleChoice(
  selected: string[],
  option: ScriptOption,
  options: ScriptOption[],
): string[] {
  if (selected.includes(option.id)) return selected.filter((id) => id !== option.id);
  if (option.exclusive) return [option.id];
  const exclusiveIds = new Set(options.filter((o) => o.exclusive).map((o) => o.id));
  return [...selected.filter((id) => !exclusiveIds.has(id)), option.id];
}
