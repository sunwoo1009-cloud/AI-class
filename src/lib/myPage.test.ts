import { describe, expect, it } from 'vitest';
import {
  bumpCase,
  caseMix,
  countOn,
  sanitizeCaseLog,
  shouldShowTraumaSnack,
  traumaHeavy,
  TRAUMA_LOAD,
} from './caseMix';
import type { CaseEntry } from './caseMix';
import { nextPulseAt, pulseDue, pulseSignals, pulseTrend, sanitizePulse } from './pulse';
import type { PulseCheck, PulseLevel } from './pulse';
import {
  dueNudge,
  isSessionEvent,
  planNudges,
  toNudges,
  toSessions,
} from './sessionCalendar';
import type { RawEvent } from './sessionCalendar';

const NOW = new Date(2026, 10, 27, 15, 0); // 2026-11-27 15:00 (로컬)

describe('사례 종류 비율', () => {
  it('하나 더하고 빼면 줄이 생기고 없어진다', () => {
    let log: CaseEntry[] = [];
    log = bumpCase(log, '2026-11-27', 'trauma', 1);
    log = bumpCase(log, '2026-11-27', 'trauma', 1);
    expect(countOn(log, '2026-11-27', 'trauma')).toBe(2);
    log = bumpCase(log, '2026-11-27', 'trauma', -1);
    log = bumpCase(log, '2026-11-27', 'trauma', -1);
    expect(log).toEqual([]);
    expect(bumpCase([], '2026-11-27', 'mood', -1)).toEqual([]);
  });

  it('지난 30일만 센다', () => {
    const log: CaseEntry[] = [
      { date: '2026-11-27', kind: 'trauma', count: 3 },
      { date: '2026-10-29', kind: 'mood', count: 1 }, // 30일째 — 들어간다
      { date: '2026-10-28', kind: 'trauma', count: 5 }, // 31일 전 — 빠진다
    ];
    const mix = caseMix(log, NOW);
    expect(mix.total).toBe(4);
    expect(mix.byKind.trauma).toBe(3);
    expect(mix.traumaRatio).toBeCloseTo(0.75);
  });

  it('기록이 적으면 비중이 높아도 과도하다고 하지 않는다', () => {
    const few = caseMix([{ date: '2026-11-27', kind: 'trauma', count: 3 }], NOW);
    expect(traumaHeavy(few)).toBe(false);
    const many = caseMix(
      [
        { date: '2026-11-27', kind: 'trauma', count: 5 },
        { date: '2026-11-26', kind: 'mood', count: 5 },
      ],
      NOW,
    );
    expect(many.total).toBe(TRAUMA_LOAD.minSessions);
    expect(traumaHeavy(many)).toBe(true);
  });

  it("'확인'을 누르면 7일 동안 다시 띄우지 않는다", () => {
    const mix = caseMix([{ date: '2026-11-27', kind: 'trauma', count: 12 }], NOW);
    expect(shouldShowTraumaSnack(mix, null, NOW)).toBe(true);
    expect(shouldShowTraumaSnack(mix, new Date(2026, 10, 25).toISOString(), NOW)).toBe(false);
    expect(shouldShowTraumaSnack(mix, new Date(2026, 10, 19).toISOString(), NOW)).toBe(true);
  });

  it('모양이 틀린 줄은 버린다', () => {
    expect(
      sanitizeCaseLog([
        { date: '2026-11-27', kind: 'trauma', count: 2 },
        { date: 'x', kind: 'trauma', count: 2 },
        { date: '2026-11-27', kind: 'nope', count: 2 },
        { date: '2026-11-27', kind: 'mood', count: 0 },
      ]),
    ).toEqual([{ date: '2026-11-27', kind: 'trauma', count: 2 }]);
    expect(sanitizeCaseLog('x')).toEqual([]);
  });
});

function check(day: number, r: PulseLevel, d: PulseLevel, i: PulseLevel): PulseCheck {
  return {
    id: `p${day}`,
    at: new Date(2026, 10, day, 12).toISOString(),
    answers: { recovery: r, distance: d, interest: i },
  };
}

describe('2주 점검', () => {
  it('한 번도 안 했으면 바로 할 때다', () => {
    expect(pulseDue([], NOW)).toBe(true);
    expect(nextPulseAt([])).toBeNull();
  });
  it('마지막 점검에서 14일이 지나야 다시 할 때다', () => {
    expect(pulseDue([check(20, 0, 0, 0)], NOW)).toBe(false);
    expect(pulseDue([check(13, 0, 0, 0)], NOW)).toBe(true);
  });
  it('지난번과 비교한다', () => {
    const list = [check(1, 1, 2, 0), check(15, 2, 2, 0)];
    expect(pulseTrend(list, 'recovery')).toBe('up');
    expect(pulseTrend(list, 'distance')).toBe('same');
    expect(pulseTrend([check(1, 1, 1, 1)], 'interest')).toBe('first');
  });
  it("'꽤' 이상이거나 세 번 연달아 늘면 신호", () => {
    expect(pulseSignals([check(1, 2, 0, 0)])).toEqual(['recovery']);
    expect(pulseSignals([check(1, 0, 0, 0), check(5, 0, 1, 0), check(9, 0, 1, 0)])).toEqual([]);
    expect(
      pulseSignals([check(1, 0, 0, 0), check(5, 0, 0, 1), check(9, 0, 0, 1)]),
    ).toEqual([]);
    expect(pulseSignals([check(1, 0, 0, 0), check(5, 0, 0, 0), check(9, 1, 0, 0)])).toEqual([]);
  });
  it('모양이 틀린 점검은 버리고 시각 순으로 줄 세운다', () => {
    const out = sanitizePulse([
      check(15, 1, 1, 1),
      check(1, 0, 0, 0),
      { id: 'x', at: 'bad', answers: {} },
      { id: 'y', at: NOW.toISOString(), answers: { recovery: 5, distance: 0, interest: 0 } },
    ]);
    expect(out.map((p) => p.id)).toEqual(['p1', 'p15']);
  });
});

const at = (h: number, m = 0) => new Date(2026, 10, 27, h, m).toISOString();
function ev(id: string, summary: string, s: string, e: string, extra: Partial<RawEvent> = {}): RawEvent {
  return { id, summary, start: { dateTime: s }, end: { dateTime: e }, ...extra };
}

describe('캘린더 앱 연동', () => {
  const nudgeEv = (id: string, session: string, when: string): RawEvent => ({
    id,
    summary: '상담이 끝나셨나요? 남은 감정을 정리해봐요',
    start: { dateTime: when },
    end: { dateTime: when },
    extendedProperties: { private: { cbdKind: 'nudge', cbdSession: session } },
  });

  it('제목에 알아보는 말이 있는 시간 일정만 회기로 본다', () => {
    expect(isSessionEvent(ev('a', '개인상담 3회기', at(14), at(14, 50)), '상담')).toBe(true);
    expect(isSessionEvent(ev('b', '회의', at(14), at(15)), '상담')).toBe(false);
    expect(isSessionEvent({ id: 'c', summary: '상담 주간', start: { date: '2026-11-27' } }, '상담')).toBe(false);
    expect(isSessionEvent(ev('d', '상담', at(14), at(15), { status: 'cancelled' }), '상담')).toBe(false);
    expect(isSessionEvent(ev('e', '회의', at(14), at(15)), ' ')).toBe(true);
    // 이 앱이 만든 알림 일정은 회기가 아니다 (제목에 '상담'이 있어도)
    expect(isSessionEvent(nudgeEv('n', 'a', at(15)), '상담')).toBe(false);
  });

  it('회기에는 제목을 남기지 않는다', () => {
    const s = toSessions([ev('a', '김○○ 상담', at(14), at(14, 50))], '상담');
    expect(s).toEqual([{ id: 'a', start: at(14), end: at(14, 50) }]);
    expect(JSON.stringify(s)).not.toContain('김');
  });

  it('끝나지 않은 회기마다 알림을 하나 만들고, 바뀌거나 사라진 알림은 지운다', () => {
    const sessions = toSessions(
      [
        ev('done', '상담', at(13), at(14)), // 이미 끝남 — 만들지 않는다
        ev('keep', '상담', at(16), at(16, 50)),
        ev('moved', '상담', at(17), at(18)),
        ev('new', '상담', at(19), at(19, 50)),
      ],
      '상담',
    );
    const nudges = toNudges([
      nudgeEv('n1', 'keep', at(16, 50)),
      nudgeEv('n1b', 'keep', at(16, 50)), // 같은 회기에 두 개 — 하나는 지운다
      nudgeEv('n2', 'moved', at(17, 50)), // 끝 시각이 바뀜
      nudgeEv('n3', 'gone', at(20)), // 회기가 없어짐
      nudgeEv('n4', 'past', at(10)), // 지난 알림 — 그대로 둔다
    ]);
    const plan = planNudges(sessions, nudges, NOW);
    expect(plan.create.map((s) => s.id)).toEqual(['moved', 'new']);
    expect(plan.remove.map((n) => n.id).sort()).toEqual(['n1b', 'n2', 'n3']);
  });

  it('회기가 끝나고 3시간 안, 그 뒤 체크인이 없을 때만 홈에 알림 띠', () => {
    const sessions = toSessions(
      [ev('a', '상담', at(10), at(11)), ev('b', '상담', at(13), at(14)), ev('c', '상담', at(16), at(17))],
      '상담',
    );
    expect(dueNudge(sessions, [], [], NOW)?.id).toBe('b');
    expect(dueNudge(sessions, [at(14, 10)], [], NOW)).toBeNull();
    expect(dueNudge(sessions, [at(13, 30)], [], NOW)?.id).toBe('b');
    expect(dueNudge(sessions, [], ['b'], NOW)).toBeNull();
  });
});
