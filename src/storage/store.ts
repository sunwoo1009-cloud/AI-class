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
  introSeen: `${PREFIX}introSeenDate`,
  stamps: `${PREFIX}stampTotal`,
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

export function writeWeeklySessions(list: WeeklySessionCount[]): void {
  write(KEYS.weeklySessions, list);
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

// --- 인트로 (퇴근길 장면을 오늘 봤는지) ---

/** 인트로를 마지막으로 본 날짜. YYYY-MM-DD, 본 적 없으면 null */
export function loadIntroSeenDate(): string | null {
  return read<string | null>(KEYS.introSeen, null);
}

export function saveIntroSeenDate(dateKey: string): void {
  write(KEYS.introSeen, dateKey);
}

// --- 쿠폰 도장 (명세 8.7) ---

/** 지금까지 찍은 도장 수. 마무리를 한 번 마칠 때마다 한 개 늘어난다. */
export function loadStampTotal(): number {
  const n = read<number>(KEYS.stamps, 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function addStamp(): number {
  const next = loadStampTotal() + 1;
  write(KEYS.stamps, next);
  return next;
}

// --- 전체 삭제 ---
// 내보내기·가져오기는 lib/dataTransfer.ts 가 담당한다 (저장소와 분리해 테스트하기 위해).

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

/** 명세 7.3 — 하루에 1개. 같은 날 다시 열면 기존 일기를 수정한다. */
export function journalForDate(date: string): JournalEntry | null {
  return loadJournal().find((j) => j.date === date) ?? null;
}

export function upsertJournal(entry: JournalEntry): JournalEntry[] {
  const list = loadJournal();
  const i = list.findIndex((j) => j.date === entry.date);
  const next = i >= 0 ? list.map((j, k) => (k === i ? entry : j)) : [...list, entry];
  next.sort((a, b) => (a.date < b.date ? 1 : -1));
  saveJournal(next);
  return next;
}

export function deleteJournal(id: string): JournalEntry[] {
  const next = loadJournal().filter((j) => j.id !== id);
  saveJournal(next);
  return next;
}
