import { toDateKey } from './date';

/**
 * 사례 종류 비율 (2026-11-27 추가, 마이페이지).
 *
 * 회기를 마칠 때마다 그 회기가 어떤 종류의 사례였는지 한 번 눌러 센다.
 * 날짜·종류·횟수만 남긴다 — 내담자를 알아볼 수 있는 정보는 받지 않는다 (설계 원칙 1).
 *
 * 지난 30일 동안 외상 사례 비중이 기준을 넘으면 마이페이지에 Snackbar 로
 * "수퍼비전을 받거나 기관 책임자와 의논하세요"를 띄운다.
 * 사례 배정은 개인이 고를 수 없는 업무 구조이므로(설계 원칙 3) 앱 안의 기법이 아니라
 * 앱 밖의 자리(수퍼비전·기관 책임자)를 권한다 (설계 원칙 4).
 */

export type CaseKind = 'trauma' | 'crisis' | 'mood' | 'relation' | 'study' | 'other';

export const CASE_KINDS: { id: CaseKind; label: string; sub: string }[] = [
  { id: 'trauma', label: '외상', sub: '학대·폭력·사고·상실' },
  { id: 'crisis', label: '위기', sub: '자해·자살 위험' },
  { id: 'mood', label: '우울·불안', sub: '' },
  { id: 'relation', label: '관계·가족', sub: '' },
  { id: 'study', label: '학업·진로', sub: '적응 포함' },
  { id: 'other', label: '기타', sub: '' },
];

const KIND_IDS = new Set<string>(CASE_KINDS.map((k) => k.id));

/** 하루·종류마다 한 줄 */
export interface CaseEntry {
  date: string; // YYYY-MM-DD
  kind: CaseKind;
  count: number;
}

/**
 * 기준 수치는 검증된 값이 아니라 설계 가정이다 (7.2 ESCALATION 과 같은 이유로 상수로 뺀다).
 * 외상 사례 비중이 높을수록 이차 외상 스트레스 위험이 커진다는 연구를 따라 '비중'을 본다.
 */
export const TRAUMA_LOAD = {
  windowDays: 30,
  /** 이만큼은 기록이 있어야 비율을 판단한다 — 두세 회기로 경고를 띄우지 않는다 */
  minSessions: 10,
  /** 외상 비중이 이 이상이면 과도하다고 본다 */
  highRatio: 0.5,
  /** '확인'을 누르면 이 기간 동안 다시 띄우지 않는다 */
  snoozeDays: 7,
} as const;

export function sanitizeCaseLog(raw: unknown): CaseEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: CaseEntry[] = [];
  for (const v of raw) {
    if (typeof v !== 'object' || v === null) continue;
    const e = v as Record<string, unknown>;
    if (typeof e.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) continue;
    if (typeof e.kind !== 'string' || !KIND_IDS.has(e.kind)) continue;
    if (typeof e.count !== 'number' || !Number.isInteger(e.count) || e.count <= 0) continue;
    out.push({ date: e.date, kind: e.kind as CaseKind, count: Math.min(e.count, 99) });
  }
  return out;
}

/** 그날 그 종류를 하나 더하거나(+1) 빼기(-1). 0이 되면 줄을 없앤다. */
export function bumpCase(
  log: CaseEntry[],
  date: string,
  kind: CaseKind,
  delta: 1 | -1,
): CaseEntry[] {
  const i = log.findIndex((e) => e.date === date && e.kind === kind);
  if (i < 0) return delta > 0 ? [...log, { date, kind, count: 1 }] : log;
  const count = log[i].count + delta;
  if (count <= 0) return log.filter((_, j) => j !== i);
  return log.map((e, j) => (j === i ? { ...e, count: Math.min(count, 99) } : e));
}

export function countOn(log: CaseEntry[], date: string, kind: CaseKind): number {
  return log.find((e) => e.date === date && e.kind === kind)?.count ?? 0;
}

export interface CaseMix {
  total: number;
  byKind: Record<CaseKind, number>;
  /** 기록이 하나도 없으면 null */
  traumaRatio: number | null;
}

/** 오늘을 포함한 최근 windowDays 일 */
export function caseMix(
  log: CaseEntry[],
  now: Date = new Date(),
  windowDays: number = TRAUMA_LOAD.windowDays,
): CaseMix {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (windowDays - 1));
  const fromKey = toDateKey(from);
  const toKey = toDateKey(now);
  const byKind = Object.fromEntries(CASE_KINDS.map((k) => [k.id, 0])) as Record<
    CaseKind,
    number
  >;
  let total = 0;
  for (const e of log) {
    if (e.date < fromKey || e.date > toKey) continue;
    byKind[e.kind] += e.count;
    total += e.count;
  }
  return { total, byKind, traumaRatio: total > 0 ? byKind.trauma / total : null };
}

export function traumaHeavy(mix: CaseMix): boolean {
  return (
    mix.total >= TRAUMA_LOAD.minSessions &&
    mix.traumaRatio !== null &&
    mix.traumaRatio >= TRAUMA_LOAD.highRatio
  );
}

/** 과도하고, 최근 snoozeDays 안에 '확인'을 누르지 않았으면 띄운다 */
export function shouldShowTraumaSnack(
  mix: CaseMix,
  dismissedAt: string | null,
  now: Date = new Date(),
): boolean {
  if (!traumaHeavy(mix)) return false;
  if (!dismissedAt) return true;
  const t = new Date(dismissedAt).getTime();
  if (Number.isNaN(t)) return true;
  return now.getTime() - t >= TRAUMA_LOAD.snoozeDays * 24 * 60 * 60 * 1000;
}

export const TRAUMA_SNACK_TEXT = '수퍼비전을 받거나 기관 책임자와 의논하세요';
