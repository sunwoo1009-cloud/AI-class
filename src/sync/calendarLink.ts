/**
 * 캘린더 앱 연동 (2026-11-27 추가) — 구글 캘린더.
 *
 * 왜 구글 캘린더인가: 웹앱(PWA)은 휴대폰 캘린더 앱의 일정을 직접 읽을 수 없다.
 * 안드로이드 캘린더와 iOS 캘린더 앱 모두 구글 계정 캘린더를 함께 보여주므로,
 * 구글 캘린더 API 로 읽고 쓰면 두 쪽에서 다 된다. (iCloud 캘린더만 쓰면 웹에서 읽을 방법이 없다.)
 *
 * 하는 일
 *  1. 오늘부터 7일 치 일정 중 제목에 '상담'(바꿀 수 있다)이 들어간 일정을 회기로 본다
 *  2. 회기가 끝나는 시각에 "상담이 끝나셨나요? 남은 감정을 정리해봐요" 짧은 일정을 만들고
 *     팝업 알림(0분 전)을 붙인다 → 캘린더 앱이 그 시각에 알림을 띄운다. 이 앱을 닫아 두어도 온다.
 *  3. 회기가 바뀌거나 지워지면 알림 일정도 맞춰 고치고, 연동을 끊으면 앞으로의 알림 일정을 지운다
 *
 * 개인정보
 *  - 일정 제목은 브라우저 안에서 회기인지 판단하는 데만 쓰고 저장하지 않는다 (lib/sessionCalendar.ts)
 *  - 구글 접근 토큰은 이 탭이 살아 있는 동안만(sessionStorage) 둔다. 이 앱의 서버로는 아무것도 보내지 않는다
 *
 * 설정: VITE_GOOGLE_CLIENT_ID (구글 클라우드 OAuth 클라이언트 ID, 비밀값 아님). 없으면 화면에 '준비 중'.
 */
import {
  DEFAULT_KEYWORD,
  NUDGE_TEXT,
  PLAN_DAYS,
  planNudges,
  toNudges,
  toSessions,
} from '../lib/sessionCalendar';
import type { RawEvent, Session } from '../lib/sessionCalendar';
import { readCalLinkRaw, writeCalLinkRaw } from '../storage/store';

/** 구글 OAuth 클라이언트 ID — 비밀값이 아니다(브라우저에 그대로 보인다). 환경 변수가 있으면 그것을 쓴다. */
const DEFAULT_CLIENT_ID = '197072890877-34bu509vetamb20h37d5qacfk2r3rkb3.apps.googleusercontent.com';
const CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || DEFAULT_CLIENT_ID;
export const calendarAvailable = Boolean(CLIENT_ID);

/** 일정 읽기·쓰기 (회기 일정을 읽고, 알림 일정을 만든다) */
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const APP_URL = `${typeof window !== 'undefined' ? window.location.origin : ''}${import.meta.env.BASE_URL}`;

/** 앱을 열 때 이만큼 지났으면 첫 누름에 다시 맞춘다 */
const AUTO_SYNC_HOURS = 6;

/* ------------------------------------------------------------------ */
/* 기기에 남기는 연동 상태 */

export interface CalLink {
  connected: boolean;
  /** 제목에 이 말이 들어간 일정을 회기로 본다 */
  keyword: string;
  /** 오늘부터의 회기 (id·시작·끝만) */
  sessions: Session[];
  lastSyncAt: string | null;
  /** 홈 알림 띠에서 닫은 회기 */
  dismissed: string[];
}

const EMPTY: CalLink = {
  connected: false,
  keyword: DEFAULT_KEYWORD,
  sessions: [],
  lastSyncAt: null,
  dismissed: [],
};

export function loadCalLink(): CalLink {
  const raw = readCalLinkRaw();
  if (!raw || typeof raw !== 'object') return { ...EMPTY };
  const v = raw as Partial<CalLink>;
  return {
    connected: v.connected === true,
    keyword: typeof v.keyword === 'string' ? v.keyword : DEFAULT_KEYWORD,
    sessions: Array.isArray(v.sessions)
      ? v.sessions.filter(
          (s): s is Session =>
            !!s && typeof s.id === 'string' && typeof s.start === 'string' && typeof s.end === 'string',
        )
      : [],
    lastSyncAt: typeof v.lastSyncAt === 'string' ? v.lastSyncAt : null,
    dismissed: Array.isArray(v.dismissed)
      ? v.dismissed.filter((x): x is string => typeof x === 'string').slice(-50)
      : [],
  };
}

const listeners = new Set<(c: CalLink) => void>();
export function onCalLinkChange(fn: (c: CalLink) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function saveCalLink(next: CalLink): CalLink {
  writeCalLinkRaw(next);
  for (const fn of listeners) fn(next);
  return next;
}

export function setKeyword(keyword: string): CalLink {
  return saveCalLink({ ...loadCalLink(), keyword: keyword.slice(0, 20) });
}

export function dismissNudge(sessionId: string): CalLink {
  const c = loadCalLink();
  return saveCalLink({ ...c, dismissed: [...c.dismissed, sessionId].slice(-50) });
}

/* ------------------------------------------------------------------ */
/* 구글 로그인 (Google Identity Services — 토큰 방식) */

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
}
interface TokenClient {
  requestAccessToken: (o?: { prompt?: string }) => void;
}
interface GoogleOAuth {
  initTokenClient: (o: {
    client_id: string;
    scope: string;
    callback: (r: TokenResponse) => void;
    error_callback?: (e: { type?: string }) => void;
  }) => TokenClient;
  revoke: (token: string, done?: () => void) => void;
}
declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GoogleOAuth } };
  }
}

let scriptPromise: Promise<void> | null = null;
let tokenClient: TokenClient | null = null;
let pending: { resolve: (t: string) => void; reject: (e: Error) => void } | null = null;

/**
 * 구글 로그인 스크립트를 미리 불러 둔다.
 * 로그인 창(팝업)은 누름 안에서 바로 열어야 막히지 않아서, 누르기 전에 준비해 둔다.
 */
export function prepareGoogle(): Promise<void> {
  if (!calendarAvailable) return Promise.reject(new Error('not-set-up'));
  if (tokenClient) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error('script'));
    };
    document.head.appendChild(s);
  });
  return scriptPromise.then(() => {
    const oauth = window.google?.accounts?.oauth2;
    if (!oauth) throw new Error('script');
    tokenClient ??= oauth.initTokenClient({
      client_id: CLIENT_ID!,
      scope: SCOPE,
      callback: (r) => {
        const p = pending;
        pending = null;
        if (r.error || !r.access_token) return p?.reject(new Error(r.error || 'denied'));
        saveToken(r.access_token, r.expires_in ?? 3600);
        p?.resolve(r.access_token);
      },
      error_callback: (e) => {
        const p = pending;
        pending = null;
        p?.reject(new Error(e.type || 'popup'));
      },
    });
  });
}

export function googleReady(): boolean {
  return tokenClient !== null;
}

const TOKEN_KEY = 'cbd:gcalToken';

function saveToken(token: string, expiresIn: number) {
  try {
    sessionStorage.setItem(
      TOKEN_KEY,
      JSON.stringify({ t: token, exp: Date.now() + (expiresIn - 60) * 1000 }),
    );
  } catch {
    // 저장이 막혀도 이번 호출에는 쓴다
  }
}

function cachedToken(): string | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(TOKEN_KEY) ?? 'null') as {
      t: string;
      exp: number;
    } | null;
    return v && v.exp > Date.now() ? v.t : null;
  } catch {
    return null;
  }
}

function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // 무시
  }
}

/** 누름 안에서 불러야 한다. 이미 허락했으면 창이 잠깐 떴다 닫힌다. */
function requestToken(prompt: '' | 'consent'): Promise<string> {
  const t = cachedToken();
  if (t) return Promise.resolve(t);
  if (!tokenClient) return Promise.reject(new Error('not-ready'));
  return new Promise<string>((resolve, reject) => {
    pending = { resolve, reject };
    tokenClient!.requestAccessToken({ prompt });
  });
}

/* ------------------------------------------------------------------ */
/* 구글 캘린더 호출 */

class ApiError extends Error {}

async function api<T>(token: string, url: string, init: RequestInit = {}): Promise<T | null> {
  const r = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (r.status === 401) {
    clearToken();
    throw new ApiError('expired');
  }
  // 이미 지워진 알림 일정은 지운 것으로 본다
  if (r.status === 404 || r.status === 410) return null;
  if (!r.ok) throw new ApiError(`http-${r.status}`);
  if (r.status === 204) return null;
  return (await r.json().catch(() => null)) as T | null;
}

async function listEvents(token: string, from: Date, to: Date): Promise<RawEvent[]> {
  const out: RawEvent[] = [];
  let pageToken: string | undefined;
  for (let i = 0; i < 5; i++) {
    const q = new URLSearchParams({
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
      fields: 'items(id,summary,status,start,end,extendedProperties),nextPageToken',
    });
    if (pageToken) q.set('pageToken', pageToken);
    const r = await api<{ items?: RawEvent[]; nextPageToken?: string }>(token, `${API}?${q}`);
    out.push(...(r?.items ?? []));
    pageToken = r?.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}

function createNudge(token: string, s: Session) {
  const end = new Date(new Date(s.end).getTime() + 10 * 60 * 1000).toISOString();
  return api(token, API, {
    method: 'POST',
    body: JSON.stringify({
      summary: NUDGE_TEXT,
      description: `퇴근길 붕어빵 한 입에서 남은 감정을 정리해요\n${APP_URL}`,
      start: { dateTime: s.end },
      end: { dateTime: end },
      // 바쁨으로 잡히지 않게, 붕어빵 색(바나나)으로
      transparency: 'transparent',
      colorId: '5',
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 0 }] },
      extendedProperties: { private: { cbdKind: 'nudge', cbdSession: s.id } },
    }),
  });
}

function deleteEvent(token: string, id: string) {
  return api(token, `${API}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/* ------------------------------------------------------------------ */
/* 바깥에서 쓰는 것 */

export type CalResult =
  | { ok: true; sessions: number; created: number; removed: number }
  | { ok: false; reason: string };

function friendly(e: unknown): string {
  const m = e instanceof Error ? e.message : '';
  if (m === 'not-set-up') return '캘린더 연동은 아직 준비 중이에요';
  if (m === 'not-ready' || m === 'script') return '구글 연결을 준비하지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요';
  if (m === 'popup_closed' || m === 'access_denied' || m === 'denied')
    return '구글 연결을 그만뒀어요. 다시 누르면 이어서 할 수 있어요';
  if (m === 'popup_failed_to_open' || m === 'popup')
    return '구글 로그인 창이 열리지 않았어요. 팝업 차단을 풀고 다시 눌러 주세요';
  if (m === 'expired') return '구글 연결이 만료됐어요. 다시 눌러 주세요';
  return '캘린더와 맞추지 못했어요. 잠시 뒤 다시 해 주세요';
}

let running: Promise<CalResult> | null = null;

/**
 * 회기를 읽고 알림 일정을 맞춘다. 누름 안에서 불러야 한다(토큰이 없으면 구글 창이 뜬다).
 * first: 처음 연결 — 허락 창을 반드시 보여준다.
 */
export function syncCalendar(first = false): Promise<CalResult> {
  if (running) return running;
  if (!calendarAvailable) return Promise.resolve({ ok: false, reason: friendly(new Error('not-set-up')) });
  // 토큰 요청은 누름 안에서 바로 해야 팝업이 막히지 않는다 — await 앞에서 부른다
  const tokenP = requestToken(first ? 'consent' : '');
  running = (async (): Promise<CalResult> => {
    try {
      const token = await tokenP;
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const to = new Date(from.getTime() + (PLAN_DAYS + 1) * 24 * 60 * 60 * 1000);
      const c = loadCalLink();
      const events = await listEvents(token, from, to);
      const sessions = toSessions(events, c.keyword);
      const plan = planNudges(sessions, toNudges(events), now);
      for (const n of plan.remove) await deleteEvent(token, n.id);
      for (const s of plan.create) await createNudge(token, s);
      saveCalLink({
        ...loadCalLink(),
        connected: true,
        sessions,
        lastSyncAt: new Date().toISOString(),
      });
      return {
        ok: true,
        sessions: sessions.filter((s) => new Date(s.end) > now).length,
        created: plan.create.length,
        removed: plan.remove.length,
      };
    } catch (e) {
      return { ok: false, reason: friendly(e) };
    } finally {
      running = null;
    }
  })();
  return running;
}

/** 연동 끊기 — 앞으로의 알림 일정을 지우고, 구글 허락을 거둔다. 누름 안에서 부른다. */
export async function disconnectCalendar(): Promise<CalResult> {
  let removed = 0;
  try {
    const token = await requestToken('');
    const now = new Date();
    const to = new Date(now.getTime() + (PLAN_DAYS + 2) * 24 * 60 * 60 * 1000);
    const nudges = toNudges(await listEvents(token, now, to));
    for (const n of nudges) {
      await deleteEvent(token, n.id);
      removed += 1;
    }
    window.google?.accounts?.oauth2?.revoke(token);
  } catch {
    // 구글에 닿지 못해도 기기의 연동 상태는 지운다 — 남은 알림 일정은 캘린더에서 지울 수 있다
  }
  clearToken();
  saveCalLink({ ...EMPTY, keyword: loadCalLink().keyword });
  return { ok: true, sessions: 0, created: 0, removed };
}

/**
 * 앱을 열고 처음 누를 때 조용히 다시 맞춘다 (연결했고, 마지막으로 맞춘 지 6시간이 지났을 때).
 * 새로 넣은 회기에도 알림 일정이 생기게 한다.
 */
export function startCalendarAutoSync(): void {
  if (!calendarAvailable) return;
  const c = loadCalLink();
  if (!c.connected) return;
  const stale =
    !c.lastSyncAt ||
    Date.now() - new Date(c.lastSyncAt).getTime() > AUTO_SYNC_HOURS * 60 * 60 * 1000;
  if (!stale) return;
  void prepareGoogle()
    .then(() => {
      const onClick = () => {
        window.removeEventListener('click', onClick, true);
        void syncCalendar(false);
      };
      window.addEventListener('click', onClick, true);
    })
    .catch(() => undefined);
}
