/**
 * 기법 안내 돕기 (2026-11-27) — 음성 안내 · 진동 박자 · 화면 꺼짐 막기.
 * 모두 브라우저에 들어 있는 기능이라 비용이 없다.
 * 읽어 주는 글은 정해진 대본뿐이라 개인 기록은 어디로도 나가지 않는다.
 * 지원하지 않는 브라우저에서는 조용히 아무것도 하지 않는다.
 */

const PREF_KEY = 'cbd:guide';

export interface GuidePrefs {
  /** 소리로 듣기 */
  voice: boolean;
  /** 진동으로 호흡 박자 (안드로이드) */
  haptic: boolean;
}

export function loadGuidePrefs(): GuidePrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREF_KEY) ?? '{}') as Partial<GuidePrefs>;
    return { voice: raw.voice === true, haptic: raw.haptic === true };
  } catch {
    return { voice: false, haptic: false };
  }
}

export function saveGuidePrefs(p: GuidePrefs): void {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(p));
  } catch {
    // 저장 못 해도 이번에는 쓴다
  }
}

/* ------------------------------------------------------------------ */
/* 음성 */

export const speechAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;
export const hapticAvailable = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

/**
 * 읽을 글로 다듬는다 (순수 함수).
 * - 닉네임이 없을 때 대본에 들어가는 '○○'(와 뒤 조사·호칭)는 읽지 않는다 — "동그라미 동그라미"가 되지 않게
 * - 줄바꿈은 쉼으로
 */
export function speechText(text: string): string {
  return text
    .replace(/○○(?:님|씨)?(?:이|가|은|는|을|를|아|야|의|에게|도)?[,，]?\s*/g, '')
    .replace(/\s*\n+\s*/g, ', ')
    .replace(/,\s*,/g, ',')
    .replace(/^\s*,\s*/, '')
    .trim();
}

let koVoice: SpeechSynthesisVoice | null | undefined;
function pickVoice(): SpeechSynthesisVoice | null {
  if (!speechAvailable) return null;
  if (koVoice !== undefined && koVoice !== null) return koVoice;
  const voices = window.speechSynthesis.getVoices();
  koVoice = voices.find((v) => v.lang?.toLowerCase().startsWith('ko')) ?? null;
  return koVoice;
}

/** 지금 읽던 것을 멈추고 새로 읽는다 */
export function speak(text: string): void {
  if (!speechAvailable) return;
  const t = speechText(text);
  if (!t) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(t);
  u.lang = 'ko-KR';
  u.rate = 0.9;
  u.pitch = 1;
  const v = pickVoice();
  if (v) u.voice = v;
  synth.speak(u);
}

export function stopSpeaking(): void {
  if (speechAvailable) window.speechSynthesis.cancel();
}

/* ------------------------------------------------------------------ */
/* 진동 */

export function buzz(pattern: number | number[]): void {
  if (!hapticAvailable) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // 막혀 있으면 무시
  }
}

/* ------------------------------------------------------------------ */
/* 화면 꺼짐 막기 — 2분짜리 기법 도중에 화면이 꺼지지 않게 */

type Sentinel = { release: () => Promise<void> };
type WakeNav = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<Sentinel> } };

/** 켜 두고, 돌려받은 함수를 부르면 끈다. 다른 앱에 다녀오면 다시 켠다. */
export function keepScreenOn(): () => void {
  const nav = typeof navigator === 'undefined' ? undefined : (navigator as WakeNav);
  if (!nav?.wakeLock) return () => undefined;
  let sentinel: Sentinel | null = null;
  let alive = true;
  const acquire = () => {
    nav.wakeLock!
      .request('screen')
      .then((s) => {
        if (alive) sentinel = s;
        else void s.release();
      })
      .catch(() => undefined);
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible' && alive) acquire();
  };
  acquire();
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    alive = false;
    document.removeEventListener('visibilitychange', onVisible);
    if (sentinel) void sentinel.release().catch(() => undefined);
  };
}
