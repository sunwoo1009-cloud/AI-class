import { REACTIONS } from '../constants';
import { mergeCloset, sanitizeCloset } from './boutique';
import type { Closet } from './boutique';
import { SCHEMA_VERSION } from '../storage/store';
import type {
  CheckIn,
  JournalEntry,
  ReactionType,
  Settings,
  TechniqueId,
  WeeklySessionCount,
} from '../types';

export interface Snapshot {
  settings: Settings | null;
  checkIns: CheckIn[];
  weeklySessions: WeeklySessionCount[];
  journal: JournalEntry[];
  /** 쿠폰 도장 수 (명세 8.7). 기기를 바꿔도 0부터 다시 시작하지 않게 함께 옮긴다. */
  stampTotal: number;
  /** 부티크 옷장 (명세 8.8) — 산 아이템·입은 모습·쓴 도장 */
  closet: Closet;
}

export type ImportOutcome =
  | { ok: false; reason: string }
  | {
      ok: true;
      merged: Snapshot;
      added: { checkIns: number; journal: number; weeklySessions: number };
      /** 모양이 틀려서 건너뛴 레코드 수 */
      skipped: number;
    };

const REACTION_IDS = new Set<string>(REACTIONS.map((r) => r.id));
const TECHNIQUE_IDS = new Set<string>([
  'slow_breathing',
  'grounding',
  'containment',
  'detachment',
  'compassion',
  'self_distancing',
]);
const PROMPT_IDS = new Set<string>(['drain', 'response', 'let_go']);

/** 명세 7.3 — 내보내기에서 일기는 기본적으로 제외한다 */
export function buildExport(snap: Snapshot, includeJournal: boolean): string {
  const payload: Record<string, unknown> = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    settings: snap.settings,
    checkIns: snap.checkIns,
    weeklySessions: snap.weeklySessions,
    stampTotal: snap.stampTotal,
    closet: snap.closet,
  };
  if (includeJournal) payload.journal = snap.journal;
  return JSON.stringify(payload, null, 2);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isSuds(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 10;
}

function validCheckIn(v: unknown): CheckIn | null {
  if (!isObject(v)) return null;
  if (typeof v.id !== 'string' || v.id.length === 0) return null;
  if (typeof v.timestamp !== 'string') return null;
  if (Number.isNaN(new Date(v.timestamp).getTime())) return null;
  if (!isSuds(v.sudsPre)) return null;
  if (!Array.isArray(v.reactions) || v.reactions.length === 0) return null;
  if (!v.reactions.every((r) => typeof r === 'string' && REACTION_IDS.has(r))) {
    return null;
  }
  if (!Array.isArray(v.techniques)) return null;

  const techniques: CheckIn['techniques'] = [];
  for (const t of v.techniques) {
    if (!isObject(t)) return null;
    if (typeof t.id !== 'string' || !TECHNIQUE_IDS.has(t.id)) return null;
    if (t.sudsPost !== null && !isSuds(t.sudsPost)) return null;
    techniques.push({
      id: t.id as TechniqueId,
      sudsPost: t.sudsPost as number | null,
    });
  }

  const readiness =
    v.readiness === 'ready' || v.readiness === 'more' ? v.readiness : null;

  return {
    id: v.id,
    timestamp: v.timestamp,
    reactions: v.reactions as ReactionType[],
    sudsPre: v.sudsPre,
    techniques,
    ruminationSafetyFlag: v.ruminationSafetyFlag === true,
    externalResourceOffered: v.externalResourceOffered === true,
    readiness,
  };
}

function validJournal(v: unknown): JournalEntry | null {
  if (!isObject(v)) return null;
  if (typeof v.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v.date)) {
    return null;
  }
  if (!Array.isArray(v.answers)) return null;

  const answers: JournalEntry['answers'] = [];
  for (const a of v.answers) {
    if (!isObject(a)) return null;
    if (typeof a.promptId !== 'string' || !PROMPT_IDS.has(a.promptId)) {
      return null;
    }
    if (typeof a.text !== 'string') return null;
    answers.push({
      promptId: a.promptId as JournalEntry['answers'][number]['promptId'],
      text: a.text,
    });
  }

  const now = new Date().toISOString();
  return {
    id: typeof v.id === 'string' && v.id ? v.id : `imported-${v.date}`,
    date: v.date,
    answers,
    createdAt: typeof v.createdAt === 'string' ? v.createdAt : now,
    updatedAt: typeof v.updatedAt === 'string' ? v.updatedAt : now,
  };
}

function validWeek(v: unknown): WeeklySessionCount | null {
  if (!isObject(v)) return null;
  if (typeof v.weekStart !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v.weekStart)) {
    return null;
  }
  if (
    v.sessions !== null &&
    !(typeof v.sessions === 'number' && Number.isInteger(v.sessions) && v.sessions >= 0)
  ) {
    return null;
  }
  return { weekStart: v.weekStart, sessions: v.sessions as number | null };
}

/**
 * 가져오기는 **덮어쓰지 않고 합친다.** 기존 기록을 지우는 쪽이 사고 피해가 크고,
 * 기기 교체 상황에서는 받는 쪽이 비어 있어 결과가 같다.
 * 충돌하면(같은 id / 같은 날짜 / 같은 주) 기기에 있던 것을 남긴다.
 */
export function parseImport(raw: string, current: Snapshot): ImportOutcome {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'JSON 파일이 아니에요.' };
  }
  if (!isObject(parsed)) {
    return { ok: false, reason: 'JSON 파일이 아니에요.' };
  }

  const known = ['checkIns', 'journal', 'weeklySessions', 'settings', 'stampTotal', 'closet'];
  if (!known.some((k) => k in parsed)) {
    return {
      ok: false,
      reason: '이 앱의 내보내기 파일이 아니에요.',
    };
  }

  let skipped = 0;

  const incomingCheckIns: CheckIn[] = [];
  if (Array.isArray(parsed.checkIns)) {
    for (const item of parsed.checkIns) {
      const v = validCheckIn(item);
      if (v) incomingCheckIns.push(v);
      else skipped++;
    }
  }

  const incomingJournal: JournalEntry[] = [];
  if (Array.isArray(parsed.journal)) {
    for (const item of parsed.journal) {
      const v = validJournal(item);
      if (v) incomingJournal.push(v);
      else skipped++;
    }
  }

  const incomingWeeks: WeeklySessionCount[] = [];
  if (Array.isArray(parsed.weeklySessions)) {
    for (const item of parsed.weeklySessions) {
      const v = validWeek(item);
      if (v) incomingWeeks.push(v);
      else skipped++;
    }
  }

  // 합치기 — 충돌하면 기기에 있던 것을 남긴다
  const haveIds = new Set(current.checkIns.map((c) => c.id));
  const newCheckIns = incomingCheckIns.filter((c) => !haveIds.has(c.id));

  const haveDates = new Set(current.journal.map((j) => j.date));
  const newJournal = incomingJournal.filter((j) => !haveDates.has(j.date));

  const haveWeeks = new Set(current.weeklySessions.map((w) => w.weekStart));
  const newWeeks = incomingWeeks.filter((w) => !haveWeeks.has(w.weekStart));

  // 표시 이름은 기기에 없을 때만 가져온다
  let settings = current.settings;
  if (settings === null && isObject(parsed.settings)) {
    const s = parsed.settings;
    if (typeof s.displayName === 'string' && s.displayName.trim()) {
      settings = {
        displayName: s.displayName.trim(),
        onboardedAt:
          typeof s.onboardedAt === 'string'
            ? s.onboardedAt
            : new Date().toISOString(),
      };
    }
  }

  // 도장은 둘 중 큰 쪽을 남긴다 — 가져오기로 도장이 줄어드는 일은 없다
  const incomingStamps =
    typeof parsed.stampTotal === 'number' &&
    Number.isInteger(parsed.stampTotal) &&
    parsed.stampTotal > 0
      ? parsed.stampTotal
      : 0;

  return {
    ok: true,
    merged: {
      settings,
      stampTotal: Math.max(current.stampTotal, incomingStamps),
      // 옷장이 없는 옛 파일이면 기기 것을 그대로 둔다
      closet:
        'closet' in parsed
          ? mergeCloset(current.closet, sanitizeCloset(parsed.closet))
          : current.closet,
      checkIns: [...current.checkIns, ...newCheckIns],
      journal: [...current.journal, ...newJournal].sort((a, b) =>
        a.date < b.date ? 1 : -1,
      ),
      weeklySessions: [...current.weeklySessions, ...newWeeks],
    },
    added: {
      checkIns: newCheckIns.length,
      journal: newJournal.length,
      weeklySessions: newWeeks.length,
    },
    skipped,
  };
}
