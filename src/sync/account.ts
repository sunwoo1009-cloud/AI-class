/**
 * 선택 가입 · 기록 백업/동기화 (명세 7.7, 2026-11-25 추가).
 *
 * - 가입은 선택이다. 가입하지 않으면 지금처럼 기기에만 저장한다.
 * - 가입할 때 받는 것: 닉네임·이메일·비밀번호. 이름·소속은 받지 않는다.
 * - 올라가는 것: 체크인 기록, 도장 수·부티크 옷장·주간 회기 수.
 *   일기는 '일기도 백업하기'를 켰을 때만 올라간다. 끄면 서버의 일기를 지운다.
 * - 각 사용자는 자기 기록만 읽고 쓴다(서버 RLS). 운영자는 관리자 화면에서 볼 수 있다.
 * - 탈퇴하면 서버 기록을 모두 지운다. 기기 기록은 사용자가 남길지 고른다.
 *
 * 서버 쪽 표와 규칙: supabase/accounts.sql
 * 합치는 규칙은 JSON 가져오기와 같다(lib/dataTransfer.parseImport) — 같은 기록이면 기기 것을 남긴다.
 */
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { baseUrl } from '../dev/feedback';
import { parseImport } from '../lib/dataTransfer';
import type { Snapshot } from '../lib/dataTransfer';
import {
  loadCheckIns,
  loadCloset,
  loadJournal,
  loadSettings,
  loadStampTotal,
  loadWeeklySessions,
  onDataChanged,
  saveCheckIns,
  saveCloset,
  saveJournal,
  saveSettings,
  saveStampTotal,
  writeWeeklySessions,
} from '../storage/store';

const URL_ = baseUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** 서버 연결 정보가 빌드에 들어 있는가. 없으면 설정에 '준비 중'으로 보인다. */
export const accountsAvailable = Boolean(URL_ && KEY);

let clientPromise: Promise<SupabaseClient> | null = null;

/** 필요할 때만 불러온다 — 가입하지 않는 사람은 이 코드를 쓰지 않는다 */
export function client(): Promise<SupabaseClient> {
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(URL_ ?? '', KEY ?? '', {
        auth: { persistSession: true, autoRefreshToken: true, storageKey: 'cbd:auth' },
      }),
    );
  }
  return clientPromise;
}

/* ------------------------------------------------------------------ */
/* 동기화 설정 (기기에만 저장) */

const PREF_KEY = 'cbd:syncPrefs';

export interface SyncPrefs {
  /** '일기도 백업하기' — 기본 꺼짐 */
  journalBackup: boolean;
  lastSyncAt: string | null;
}

export function loadSyncPrefs(): SyncPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREF_KEY) ?? 'null') as Partial<SyncPrefs> | null;
    return {
      journalBackup: raw?.journalBackup === true,
      lastSyncAt: typeof raw?.lastSyncAt === 'string' ? raw.lastSyncAt : null,
    };
  } catch {
    return { journalBackup: false, lastSyncAt: null };
  }
}

function saveSyncPrefs(p: SyncPrefs): void {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(p));
  } catch {
    // 저장이 막힌 경우 무시
  }
}

/* ------------------------------------------------------------------ */
/* 계정 */

export interface Account {
  email: string;
  nickname: string;
}

function toAccount(s: Session | null): Account | null {
  if (!s) return null;
  const nickname = (s.user.user_metadata?.nickname as string | undefined)?.trim() ?? '';
  return { email: s.user.email ?? '', nickname };
}

/** 지금 로그인한 계정. 가입·로그인한 적이 없으면 서버 코드를 아예 불러오지 않는다. */
export async function currentAccount(): Promise<Account | null> {
  if (!accountsAvailable || !hasStoredSession()) return null;
  const { data } = await (await client()).auth.getSession();
  return toAccount(data.session);
}

function hasStoredSession(): boolean {
  try {
    return localStorage.getItem('cbd:auth') !== null;
  } catch {
    return false;
  }
}

/** Supabase 영문 오류를 사용자 문구로 */
export function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return '이메일 또는 비밀번호가 맞지 않아요';
  if (m.includes('already registered') || m.includes('already been registered')) {
    return '이미 가입된 이메일이에요. 로그인해 주세요';
  }
  if (m.includes('email not confirmed')) return '메일함에서 가입 확인 링크를 먼저 눌러 주세요';
  if (m.includes('password') && (m.includes('6') || m.includes('short') || m.includes('weak'))) {
    return '비밀번호는 6자 이상으로 정해 주세요';
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return '요청이 많아 잠시 막혔어요. 조금 뒤에 다시 해 주세요';
  }
  if (m.includes('invalid') && m.includes('email')) return '이메일 주소를 다시 확인해 주세요';
  if (m.includes('fetch') || m.includes('network')) return '인터넷 연결을 확인해 주세요';
  return `문제가 생겼어요 (${message})`;
}

export type SignUpResult = { ok: true; needsEmailConfirm: boolean } | { ok: false; reason: string };

export async function signUp(nickname: string, email: string, password: string): Promise<SignUpResult> {
  const sb = await client();
  const { data, error } = await sb.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { nickname: nickname.trim() },
      emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
    },
  });
  if (error) return { ok: false, reason: friendlyError(error.message) };
  if (data.session) {
    adoptNickname(nickname);
    await syncNow();
    return { ok: true, needsEmailConfirm: false };
  }
  return { ok: true, needsEmailConfirm: true };
}

export async function signIn(email: string, password: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const sb = await client();
  const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return { ok: false, reason: friendlyError(error.message) };
  const acc = toAccount(data.session);
  if (acc?.nickname) adoptNickname(acc.nickname);
  await syncNow();
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const sb = await client();
  await sb.auth.signOut();
}

export const NICKNAME_MAX = 20;

/** 로그인한 뒤 닉네임 바꾸기 — 계정 정보와 기기의 부를 이름을 함께 바꾼다 */
export async function updateNickname(
  nickname: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const name = nickname.trim();
  if (!name) return { ok: false, reason: '닉네임을 적어 주세요' };
  if (name.length > NICKNAME_MAX) return { ok: false, reason: `${NICKNAME_MAX}자까지 적을 수 있어요` };
  const sb = await client();
  const { error } = await sb.auth.updateUser({ data: { nickname: name } });
  if (error) return { ok: false, reason: friendlyError(error.message) };
  adoptNickname(name);
  return { ok: true };
}

/** 가입할 때 정한 닉네임을 자기 거리두기 기법에서 부를 이름으로 쓴다 */
function adoptNickname(nickname: string): void {
  const name = nickname.trim();
  const s = loadSettings();
  if (!name || !s || s.displayName === name) return;
  saveSettings({ ...s, displayName: name });
}

/* ------------------------------------------------------------------ */
/* 동기화 */

function snapshot(): Snapshot {
  return {
    settings: loadSettings(),
    checkIns: loadCheckIns(),
    weeklySessions: loadWeeklySessions(),
    journal: loadJournal(),
    stampTotal: loadStampTotal(),
    closet: loadCloset(),
  };
}

let syncing: Promise<SyncResult> | null = null;

export type SyncResult = { ok: true; added: number; at: string } | { ok: false; reason: string };

/**
 * 서버와 맞춘다: 서버 기록을 받아 기기에 합치고, 합친 결과를 서버에 올린다.
 * 일기는 '일기도 백업하기'가 켜져 있을 때만 주고받는다.
 */
export function syncNow(): Promise<SyncResult> {
  if (!syncing) syncing = doSync().finally(() => (syncing = null));
  return syncing;
}

async function doSync(): Promise<SyncResult> {
  const sb = await client();
  const { data: sess } = await sb.auth.getSession();
  if (!sess.session) return { ok: false, reason: '로그인이 필요해요' };
  const prefs = loadSyncPrefs();

  try {
    // 1) 받기
    const [ci, st, jr] = await Promise.all([
      sb.from('checkins').select('data'),
      sb.from('user_state').select('data').maybeSingle(),
      prefs.journalBackup ? sb.from('journal').select('data') : Promise.resolve({ data: [], error: null }),
    ]);
    const err = ci.error ?? st.error ?? jr.error;
    if (err) return { ok: false, reason: friendlyError(err.message) };

    const state = (st.data?.data ?? {}) as Record<string, unknown>;
    const remote = JSON.stringify({
      checkIns: (ci.data ?? []).map((r) => r.data),
      journal: (jr.data ?? []).map((r: { data: unknown }) => r.data),
      weeklySessions: state.weeklySessions ?? [],
      stampTotal: state.stampTotal ?? 0,
      closet: state.closet ?? undefined,
    });

    // 2) 합치기 — JSON 가져오기와 같은 규칙 (같은 기록이면 기기 것)
    const merged = parseImport(remote, snapshot());
    if (!merged.ok) return { ok: false, reason: merged.reason };
    const m = merged.merged;
    // 서버 것을 기기에 쓰는 동안은 '기록이 바뀌었다' 알림을 무시한다 (동기화가 다시 동기화를 부르지 않게)
    applyingRemote = true;
    try {
      saveCheckIns(m.checkIns);
      saveJournal(m.journal);
      writeWeeklySessions(m.weeklySessions);
      saveStampTotal(m.stampTotal);
      saveCloset(m.closet);
    } finally {
      applyingRemote = false;
    }

    // 3) 올리기 — 합친 결과 전체
    const now = new Date().toISOString();
    const ups = [
      m.checkIns.length
        ? sb.from('checkins').upsert(m.checkIns.map((c) => ({ id: c.id, data: c, updated_at: now })))
        : null,
      sb.from('user_state').upsert({
        data: { stampTotal: m.stampTotal, closet: m.closet, weeklySessions: m.weeklySessions },
        updated_at: now,
      }),
      prefs.journalBackup && m.journal.length
        ? sb.from('journal').upsert(m.journal.map((j) => ({ date: j.date, data: j, updated_at: now })))
        : null,
    ];
    for (const r of await Promise.all(ups)) {
      if (r?.error) return { ok: false, reason: friendlyError(r.error.message) };
    }

    saveSyncPrefs({ ...prefs, lastSyncAt: now });
    const added = merged.added.checkIns + merged.added.journal;
    return { ok: true, added, at: now };
  } catch (e) {
    return { ok: false, reason: friendlyError((e as Error).message) };
  }
}

/** '일기도 백업하기' 켜고 끄기. 끄면 서버에 올라간 일기를 모두 지운다. */
export async function setJournalBackup(on: boolean): Promise<SyncResult> {
  saveSyncPrefs({ ...loadSyncPrefs(), journalBackup: on });
  if (on) return syncNow();
  const sb = await client();
  const { data: sess } = await sb.auth.getSession();
  if (!sess.session) return { ok: false, reason: '로그인이 필요해요' };
  const { error } = await sb.from('journal').delete().eq('user_id', sess.session.user.id);
  if (error) return { ok: false, reason: friendlyError(error.message) };
  return { ok: true, added: 0, at: new Date().toISOString() };
}

/** 기기에서 일기를 지우면 서버에서도 지운다 (백업 중일 때) */
export async function deleteRemoteJournal(date: string): Promise<void> {
  if (!accountsAvailable || !hasStoredSession() || !loadSyncPrefs().journalBackup) return;
  const sb = await client();
  const { data: sess } = await sb.auth.getSession();
  if (!sess.session) return;
  await sb.from('journal').delete().eq('user_id', sess.session.user.id).eq('date', date);
}

/** 탈퇴 — 서버의 계정과 기록을 모두 지운다. 기기 기록은 부르는 쪽이 정한다. */
export async function deleteAccount(): Promise<{ ok: true } | { ok: false; reason: string }> {
  const sb = await client();
  const { error } = await sb.rpc('delete_my_account');
  if (error) return { ok: false, reason: friendlyError(error.message) };
  await sb.auth.signOut();
  saveSyncPrefs({ journalBackup: false, lastSyncAt: null });
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* 자동 동기화 — 기록이 바뀌면 몇 초 뒤에 조용히 맞춘다 */

let timer: number | null = null;
let applyingRemote = false;
let listening = false;

/** 앱을 열 때와 로그인한 뒤에 부른다. 로그인한 적이 없으면 아무것도 하지 않는다. */
export function startAutoSync(): void {
  if (!accountsAvailable || !hasStoredSession()) return;
  void syncNow();
  if (listening) return;
  listening = true;
  onDataChanged(() => {
    if (applyingRemote || !hasStoredSession()) return;
    if (timer !== null) window.clearTimeout(timer);
    timer = window.setTimeout(() => void syncNow(), 4000);
  });
}
