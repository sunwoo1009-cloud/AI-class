/**
 * 배경 음악 (2026-11-27).
 *
 * - 음악 파일은 public/audio/bgm.mp3 하나. 없으면 조용히 '파일 없음' 상태가 된다.
 * - 브라우저는 사람이 화면을 한 번 누르기 전에는 소리를 못 내게 막는다.
 *   그래서 앱을 연 뒤 **첫 탭(인트로를 누르는 순간)** 에 음악을 튼다.
 * - 켜기·끄기와 음량은 이 기기에만 저장한다 (cbd:bgm). 기록이 아니라 기기 설정이라
 *   내보내기·동기화·전체 삭제에는 들어가지 않는다.
 * - 화면이 숨겨지면(다른 앱으로 가면) 멈추고, 돌아오면 이어서 튼다.
 */

export const BGM_URL = `${import.meta.env.BASE_URL}audio/bgm.mp3`;
const PREFS_KEY = 'cbd:bgm';

export interface BgmPrefs {
  on: boolean;
  /** 0 ~ 1 */
  volume: number;
}

export const DEFAULT_BGM: BgmPrefs = { on: true, volume: 0.4 };

export function clampVolume(v: unknown): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : DEFAULT_BGM.volume;
  return Math.min(1, Math.max(0, Math.round(n * 100) / 100));
}

/** 저장된 값을 읽는다. 모양이 이상하면 기본값 */
export function parseBgmPrefs(raw: string | null): BgmPrefs {
  if (!raw) return { ...DEFAULT_BGM };
  try {
    const o = JSON.parse(raw) as Partial<BgmPrefs>;
    return {
      on: typeof o.on === 'boolean' ? o.on : DEFAULT_BGM.on,
      volume: clampVolume(o.volume),
    };
  } catch {
    return { ...DEFAULT_BGM };
  }
}

export function loadBgmPrefs(): BgmPrefs {
  try {
    return parseBgmPrefs(localStorage.getItem(PREFS_KEY));
  } catch {
    return { ...DEFAULT_BGM };
  }
}

function savePrefs(p: BgmPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    // 저장이 막혀도 이번 실행 동안은 그대로 동작한다
  }
}

/* ------------------------------------------------------------------ */

export type BgmStatus = 'unknown' | 'ready' | 'missing';

let audio: HTMLAudioElement | null = null;
let status: BgmStatus = 'unknown';
/** 사람이 한 번이라도 눌러서 소리를 낼 수 있게 되었는가 */
let unlocked = false;
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

/** 상태가 바뀌면 부른다. 돌려준 함수로 그만 듣는다. */
export function onBgmChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function bgmStatus(): BgmStatus {
  return status;
}

export function bgmPlaying(): boolean {
  return !!audio && !audio.paused;
}

function ensureAudio(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  if (audio) return audio;
  audio = new Audio(BGM_URL);
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = loadBgmPrefs().volume;
  audio.addEventListener('canplay', () => {
    status = 'ready';
    emit();
  });
  audio.addEventListener('error', () => {
    status = 'missing';
    emit();
  });
  audio.addEventListener('play', emit);
  audio.addEventListener('pause', emit);
  return audio;
}

function tryPlay() {
  const a = ensureAudio();
  if (!a || status === 'missing') return;
  if (!loadBgmPrefs().on) return;
  void a.play().catch(() => {
    // 아직 눌러 본 적이 없거나 파일이 없으면 조용히 넘어간다
  });
}

/**
 * 앱을 열 때 한 번 부른다. 첫 탭에 음악을 틀고, 화면이 숨겨지면 멈춘다.
 * 발표용·관리자 화면에서는 부르지 않는다 (설정 화면에서 켜면 그때 튼다).
 */
export function startBgmOnFirstGesture(): void {
  if (typeof document === 'undefined') return;
  ensureAudio();
  const first = () => {
    unlocked = true;
    tryPlay();
    document.removeEventListener('pointerdown', first);
    document.removeEventListener('keydown', first);
  };
  document.addEventListener('pointerdown', first);
  document.addEventListener('keydown', first);
  document.addEventListener('visibilitychange', () => {
    if (!audio) return;
    if (document.hidden) audio.pause();
    else if (unlocked) tryPlay();
  });
}

/** 켜기·끄기 — 누른 순간이 사람의 동작이라 바로 소리를 낼 수 있다 */
export function setBgmOn(on: boolean): void {
  savePrefs({ ...loadBgmPrefs(), on });
  unlocked = true;
  const a = ensureAudio();
  if (!a) return;
  if (on) tryPlay();
  else a.pause();
  emit();
}

export function setBgmVolume(volume: number): void {
  const v = clampVolume(volume);
  savePrefs({ ...loadBgmPrefs(), volume: v });
  const a = ensureAudio();
  if (a) a.volume = v;
  emit();
}

/** 설정 화면을 열 때 — 파일이 있는지 미리 알아본다 */
export function probeBgm(): void {
  ensureAudio();
}
