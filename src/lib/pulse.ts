/**
 * 2주 점검 (2026-11-27 추가, 마이페이지).
 *
 * 소진의 조기 신호 세 가지를 격주로 스스로 점검한다.
 *  - recovery: 회기 후 피로가 풀리는 데 평소보다 오래 걸린다
 *  - distance: 내담자에 대한 정서적 거리감이 늘었다
 *  - interest: 사례 개념화에 대한 흥미가 둔해졌다
 *
 * 진단 도구가 아니다. 점수를 매기지 않고, 지난번과 비교해 "늘었다·비슷하다·줄었다"만 보여준다.
 * 신호가 보이면 앱 밖의 자리(수퍼비전·동료·전문가 평가)를 권한다 (설계 원칙 4).
 */

export type PulseItem = 'recovery' | 'distance' | 'interest';

export const PULSE_ITEMS: { id: PulseItem; title: string; question: string }[] = [
  {
    id: 'recovery',
    title: '회복 시간',
    question: '회기가 끝난 뒤 피로가 풀리는 데 평소보다 오래 걸렸나요?',
  },
  {
    id: 'distance',
    title: '정서적 거리감',
    question: '내담자에게 마음이 멀어지거나 거리감이 느껴졌나요?',
  },
  {
    id: 'interest',
    title: '사례 개념화 흥미',
    question: '사례를 이해하고 개념화하는 일에 흥미가 줄었나요?',
  },
];

/** 0 아니에요 · 1 조금 · 2 꽤 · 3 많이 */
export type PulseLevel = 0 | 1 | 2 | 3;
export const PULSE_LEVELS: { value: PulseLevel; label: string }[] = [
  { value: 0, label: '아니에요' },
  { value: 1, label: '조금' },
  { value: 2, label: '꽤' },
  { value: 3, label: '많이' },
];

export interface PulseCheck {
  id: string;
  /** 점검한 시각 ISO */
  at: string;
  answers: Record<PulseItem, PulseLevel>;
}

/** 설계 가정 — 상수로 뺀다 */
export const PULSE = {
  intervalDays: 14,
  /** 이 이상(꽤·많이)이면 신호로 본다 */
  signalLevel: 2,
} as const;

const DAY = 24 * 60 * 60 * 1000;

export function sanitizePulse(raw: unknown): PulseCheck[] {
  if (!Array.isArray(raw)) return [];
  const out: PulseCheck[] = [];
  for (const v of raw) {
    if (typeof v !== 'object' || v === null) continue;
    const p = v as Record<string, unknown>;
    if (typeof p.id !== 'string' || typeof p.at !== 'string') continue;
    if (Number.isNaN(new Date(p.at).getTime())) continue;
    const a = p.answers as Record<string, unknown> | undefined;
    if (!a || typeof a !== 'object') continue;
    const ok = PULSE_ITEMS.every(
      ({ id }) => typeof a[id] === 'number' && [0, 1, 2, 3].includes(a[id] as number),
    );
    if (!ok) continue;
    out.push({ id: p.id, at: p.at, answers: a as Record<PulseItem, PulseLevel> });
  }
  return out.sort((x, y) => (x.at < y.at ? -1 : 1));
}

export function lastPulse(list: PulseCheck[]): PulseCheck | null {
  return list.length ? list[list.length - 1] : null;
}

/** 다음 점검 날 — 한 번도 안 했으면 null(바로 할 수 있다) */
export function nextPulseAt(list: PulseCheck[]): Date | null {
  const last = lastPulse(list);
  if (!last) return null;
  return new Date(new Date(last.at).getTime() + PULSE.intervalDays * DAY);
}

/** 점검할 때가 됐는지 — 한 번도 안 했거나 마지막 점검에서 14일이 지났다 */
export function pulseDue(list: PulseCheck[], now: Date = new Date()): boolean {
  const next = nextPulseAt(list);
  return next === null || now.getTime() >= next.getTime();
}

export type Trend = 'up' | 'same' | 'down' | 'first';

/** 지난번과 비교 — 숫자가 클수록 신호가 큰 쪽 */
export function pulseTrend(list: PulseCheck[], item: PulseItem): Trend {
  if (list.length < 2) return 'first';
  const now = list[list.length - 1].answers[item];
  const before = list[list.length - 2].answers[item];
  if (now > before) return 'up';
  if (now < before) return 'down';
  return 'same';
}

/**
 * 신호가 보이는 항목 — 이번에 '꽤' 이상이거나, 두 번 연속 늘었다.
 * 보이면 결과 화면에 앱 밖 자원을 권한다.
 */
export function pulseSignals(list: PulseCheck[]): PulseItem[] {
  const last = lastPulse(list);
  if (!last) return [];
  return PULSE_ITEMS.map((x) => x.id).filter((id) => {
    if (last.answers[id] >= PULSE.signalLevel) return true;
    if (list.length >= 3) {
      const [a, b, c] = list.slice(-3).map((p) => p.answers[id]);
      return a < b && b < c;
    }
    return false;
  });
}
