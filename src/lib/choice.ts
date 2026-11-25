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
 * 고른 선택지마다 붙은 후속 화면(followUp)을 그 선택 단계 바로 뒤에 끼워 넣는다 (명세 8.4).
 * 여러 개를 골랐으면 선택지 순서대로 하나씩 차례로 나온다.
 */
export function expandSteps(steps: ScriptStep[], answers: ChoiceAnswers): ScriptStep[] {
  const out: ScriptStep[] = [];
  for (const step of steps) {
    out.push(step);
    if (step.kind !== 'choice') continue;
    const picked = answers[step.choiceId] ?? [];
    for (const o of resolveOptions(step, answers)) {
      if (o.followUp && picked.includes(o.id)) {
        out.push({ kind: 'text', seconds: FOLLOW_UP_SECONDS, text: o.followUp });
      }
    }
  }
  return out;
}

/** 후속 화면에 머무는 시간 */
export const FOLLOW_UP_SECONDS = 15;

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
