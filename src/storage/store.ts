import type {
  CheckIn,
  JournalEntry,
  Settings,
  WeeklySessionCount,
} from '../types';

/**
 * 명세 2절 설계 원칙 2 — 로컬 저장만 한다.
 * 서버, 계정, 분석 도구, 외부 전송이 없다. 저장 키에는 앱 접두어를 붙인다.
 */
const PREFIX = 'cbd:';
export const SCHEMA_VERSION = 1;

export const KEYS = {
  schemaVersion: `${PREFIX}schemaVersion`,
  settings: `${PREFIX}settings`,
  checkIns: `${PREFIX}checkins`,
  journal: `${PREFIX}journal`,
  weeklySessions: `${PREFIX}weeklySessions`,
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 공간이 없거나 접근이 막힌 경우 조용히 넘긴다.
  }
}

export function ensureSchemaVersion(): void {
  write(KEYS.schemaVersion, SCHEMA_VERSION);
}

// --- 설정 ---

export function loadSettings(): Settings | null {
  return read<Settings | null>(KEYS.settings, null);
}

export function saveSettings(settings: Settings): void {
  write(KEYS.settings, settings);
}

// --- 체크인 ---

export function loadCheckIns(): CheckIn[] {
  return read<CheckIn[]>(KEYS.checkIns, []);
}

export function saveCheckIns(list: CheckIn[]): void {
  write(KEYS.checkIns, list);
}

/** 같은 id가 있으면 교체하고, 없으면 추가한다 (흐름 중 갱신용) */
export function upsertCheckIn(record: CheckIn): CheckIn[] {
  const list = loadCheckIns();
  const i = list.findIndex((c) => c.id === record.id);
  const next = i >= 0 ? list.map((c, j) => (j === i ? record : c)) : [...list, record];
  saveCheckIns(next);
  return next;
}

// --- 주간 회기 수 ---

export function loadWeeklySessions(): WeeklySessionCount[] {
  return read<WeeklySessionCount[]>(KEYS.weeklySessions, []);
}

export function saveWeeklySession(entry: WeeklySessionCount): WeeklySessionCount[] {
  const list = loadWeeklySessions();
  const i = list.findIndex((w) => w.weekStart === entry.weekStart);
  const next =
    i >= 0 ? list.map((w, j) => (j === i ? entry : w)) : [...list, entry];
  write(KEYS.weeklySessions, next);
  return next;
}

// --- 일기 ---

export function loadJournal(): JournalEntry[] {
  return read<JournalEntry[]>(KEYS.journal, []);
}

export function saveJournal(list: JournalEntry[]): void {
  write(KEYS.journal, list);
}

// --- 내보내기 / 전체 삭제 ---

/** 명세 7.3 — 내보내기에서 일기는 기본적으로 제외한다 */
export function exportData(includeJournal: boolean): string {
  const payload: Record<string, unknown> = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    settings: loadSettings(),
    checkIns: loadCheckIns(),
    weeklySessions: loadWeeklySessions(),
  };
  if (includeJournal) payload.journal = loadJournal();
  return JSON.stringify(payload, null, 2);
}

/** 명세 2절 — "모든 데이터 삭제" */
export function clearAllData(): void {
  try {
    for (const key of Object.values(KEYS)) localStorage.removeItem(key);
  } catch {
    // 접근이 막힌 경우 무시한다.
  }
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
