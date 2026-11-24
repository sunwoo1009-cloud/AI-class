import { sanitizeCloset, stampBalance } from '../lib/boutique';
import type { Closet } from '../lib/boutique';
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
  /** 2026-11-24 부터 안 쓴다 (인트로가 열 때마다 나온다). 전체 삭제 때 옛 값을 지우려고 남겨둔다. */
  introSeen: `${PREFIX}introSeenDate`,
  stamps: `${PREFIX}stampTotal`,
  lastExport: `${PREFIX}lastExportAt`,
  closet: `${PREFIX}closet`,
} as const;

/**
 * 브라우저에 "이 사이트 데이터는 함부로 지우지 마세요"를 요청한다.
 * 저장 공간이 모자랄 때 브라우저가 사이트 데이터를 정리하는 것을 막는다.
 * 기록을 처음 쓸 때 한 번만 묻는다. 지원하지 않거나 거절돼도 앱은 그대로 돈다.
 */
let persistAsked = false;
function askPersistOnce(): void {
  if (persistAsked) return;
  persistAsked = true;
  try {
    const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
    if (!storage?.persist || !storage.persisted) return;
    void storage
      .persisted()
      .then((already) => (already ? true : storage.persist()))
      .catch(() => undefined);
  } catch {
    // 지원하지 않는 브라우저
  }
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * 백업·동기화(명세 7.7)가 기록이 바뀐 걸 알 수 있게 한다.
 * 저장소는 서버를 모른다 — 듣는 쪽(sync/account.ts)이 로그인했을 때만 붙는다.
 */
const SYNCED_KEYS = new Set<string>([
  `${PREFIX}checkins`,
  `${PREFIX}journal`,
  `${PREFIX}weeklySessions`,
  `${PREFIX}stampTotal`,
  `${PREFIX}closet`,
]);
const listeners: (() => void)[] = [];

export function onDataChanged(fn: () => void): void {
  listeners.push(fn);
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    askPersistOnce();
  } catch {
    // 저장 공간이 없거나 접근이 막힌 경우 조용히 넘긴다.
    return;
  }
  if (SYNCED_KEYS.has(key)) for (const fn of listeners) fn();
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

// --- 부티크 옷장 (명세 8.8) ---

/** 산 아이템·입은 모습·쓴 도장 수 */
export function loadCloset(): Closet {
  return sanitizeCloset(read<unknown>(KEYS.closet, null));
}

export function saveCloset(closet: Closet): void {
  write(KEYS.closet, closet);
}

/** 쓸 수 있는 도장 = 모은 도장 − 부티크에서 쓴 도장 */
export function loadStampBalance(): number {
  return stampBalance(loadStampTotal(), loadCloset());
}

/** 가져오기로 도장 수를 옮길 때 쓴다 */
export function saveStampTotal(n: number): void {
  write(KEYS.stamps, Math.max(0, Math.floor(n)));
}

// --- 백업 (명세 7.6) ---

/** 마지막으로 내보낸 시각. 내보낸 적 없으면 null */
export function loadLastExportAt(): string | null {
  return read<string | null>(KEYS.lastExport, null);
}

export function saveLastExportAt(iso: string): void {
  write(KEYS.lastExport, iso);
}

/** 가장 오래된 체크인·일기 시각. 백업 알림을 언제부터 셀지 정한다. */
export function oldestRecordAt(): string | null {
  const times = [
    ...loadCheckIns().map((c) => c.timestamp),
    ...loadJournal().map((j) => j.createdAt),
  ].filter((t) => !Number.isNaN(new Date(t).getTime()));
  if (times.length === 0) return null;
  return times.reduce((a, b) => (new Date(a) < new Date(b) ? a : b));
}

// --- 전체 삭제 ---
// 내보내기·가져오기는 lib/dataTransfer.ts 가 담당한다 (저장소와 분리해 테스트하기 위해).

/** 명세 2절 — "모든 데이터 삭제" */
export function clearAllData(): void {
  try {
    for (const key of Object.values(KEYS)) localStorage.removeItem(key);
    // 이 기기에서 로그아웃도 한다 — 남겨 두면 다음 동기화 때 서버 기록이 다시 내려온다.
    // 서버 기록은 그대로다. 지우려면 설정의 '계정 삭제'를 쓴다.
    localStorage.removeItem(`${PREFIX}auth`);
    localStorage.removeItem(`${PREFIX}syncPrefs`);
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
