import { describe, expect, it } from 'vitest';
import { buildExport, parseImport } from './dataTransfer';
import type { Snapshot } from './dataTransfer';
import { emptyCloset } from './boutique';
import type { CheckIn, JournalEntry } from '../types';

const empty: Snapshot = {
  settings: null,
  checkIns: [],
  weeklySessions: [],
  journal: [],
  stampTotal: 0,
  closet: emptyCloset(),
};

const checkIn = (id: string, sudsPre = 5): CheckIn => ({
  id,
  timestamp: '2026-10-20T09:00:00.000Z',
  reactions: ['anger'],
  sudsPre,
  techniques: [{ id: 'self_distancing', sudsPost: 3 }],
  ruminationSafetyFlag: false,
  externalResourceOffered: false,
  readiness: 'ready',
});

const entry = (date: string): JournalEntry => ({
  id: `j-${date}`,
  date,
  answers: [{ promptId: 'drain', text: '많았어요' }],
  createdAt: `${date}T18:00:00.000Z`,
  updatedAt: `${date}T18:00:00.000Z`,
});

const full: Snapshot = {
  settings: { displayName: '선우', onboardedAt: '2026-09-01T00:00:00.000Z' },
  checkIns: [checkIn('a'), checkIn('b')],
  weeklySessions: [{ weekStart: '2026-10-19', sessions: 20 }],
  journal: [entry('2026-10-20')],
  stampTotal: 13,
  closet: {
    spent: 3,
    owned: ['skin-2', 'top-hoodie'],
    equipped: { skin: 'skin-2', top: 'top-hoodie' },
  },
};

// ---------------------------------------------------------------------------
// 내보내기 — 명세 7.3: 일기는 기본적으로 제외한다
// ---------------------------------------------------------------------------

describe('buildExport', () => {
  it('일기를 기본으로 제외한다', () => {
    const parsed = JSON.parse(buildExport(full, false));
    expect(parsed.checkIns).toHaveLength(2);
    expect(parsed.journal).toBeUndefined();
  });

  it('포함을 고르면 일기도 넣는다', () => {
    const parsed = JSON.parse(buildExport(full, true));
    expect(parsed.journal).toHaveLength(1);
  });

  it('스키마 버전과 시각을 함께 쓴다', () => {
    const parsed = JSON.parse(buildExport(full, false));
    expect(parsed.schemaVersion).toBe(1);
    expect(typeof parsed.exportedAt).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// 가져오기 — 덮어쓰지 않고 합친다
// ---------------------------------------------------------------------------

describe('parseImport — 잘못된 파일을 거른다', () => {
  it('JSON이 아니면 거절한다', () => {
    const r = parseImport('이건 그냥 글이에요', empty);
    expect(r.ok).toBe(false);
  });

  it('객체가 아니면 거절한다', () => {
    expect(parseImport('[1,2,3]', empty).ok).toBe(false);
    expect(parseImport('"문자열"', empty).ok).toBe(false);
  });

  it('이 앱의 내보내기 파일이 아니면 거절한다', () => {
    const r = parseImport(JSON.stringify({ hello: 'world' }), empty);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('내보내기 파일');
  });
});

describe('parseImport — 정상 파일', () => {
  it('빈 기기에 그대로 들어온다', () => {
    const r = parseImport(buildExport(full, true), empty);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.merged.checkIns).toHaveLength(2);
    expect(r.merged.journal).toHaveLength(1);
    expect(r.merged.weeklySessions).toHaveLength(1);
    expect(r.added).toEqual({ checkIns: 2, journal: 1, weeklySessions: 1 });
  });

  it('표시 이름이 없을 때만 가져온 이름을 쓴다', () => {
    const r1 = parseImport(buildExport(full, false), empty);
    if (r1.ok) expect(r1.merged.settings?.displayName).toBe('선우');

    const existing: Snapshot = {
      ...empty,
      settings: { displayName: '민', onboardedAt: '2026-10-01T00:00:00.000Z' },
    };
    const r2 = parseImport(buildExport(full, false), existing);
    if (r2.ok) expect(r2.merged.settings?.displayName).toBe('민');
  });
});

// ---------------------------------------------------------------------------
// 쿠폰 도장 — 기기를 바꿔도 0부터 다시 시작하지 않게
// ---------------------------------------------------------------------------

describe('쿠폰 도장 수 옮기기', () => {
  it('내보내기에 도장 수가 들어간다', () => {
    const parsed = JSON.parse(buildExport(full, false));
    expect(parsed.stampTotal).toBe(13);
  });

  it('빈 기기로 가져오면 도장 수가 그대로 온다', () => {
    const r = parseImport(buildExport(full, false), empty);
    if (r.ok) expect(r.merged.stampTotal).toBe(13);
  });

  it('합칠 때는 둘 중 큰 쪽을 남긴다 — 도장이 줄어들지 않는다', () => {
    const r = parseImport(buildExport(full, false), { ...empty, stampTotal: 20 });
    if (r.ok) expect(r.merged.stampTotal).toBe(20);
  });

  it('도장 수가 없거나 이상한 옛 파일은 기기 값을 유지한다', () => {
    const old = JSON.stringify({ checkIns: [] });
    const r1 = parseImport(old, { ...empty, stampTotal: 4 });
    if (r1.ok) expect(r1.merged.stampTotal).toBe(4);

    const bad = JSON.stringify({ checkIns: [], stampTotal: -3 });
    const r2 = parseImport(bad, { ...empty, stampTotal: 4 });
    if (r2.ok) expect(r2.merged.stampTotal).toBe(4);
  });
});

describe('부티크 옷장 옮기기', () => {
  it('내보내기에 옷장이 들어가고, 빈 기기로 그대로 온다', () => {
    const r = parseImport(buildExport(full, false), empty);
    if (!r.ok) throw new Error('실패');
    expect(r.merged.closet.owned).toEqual(['skin-2', 'top-hoodie']);
    expect(r.merged.closet.equipped.top).toBe('top-hoodie');
    expect(r.merged.closet.spent).toBe(3);
  });

  it('옷장이 없는 옛 파일은 기기 옷장을 그대로 둔다', () => {
    const device = { ...empty, closet: full.closet };
    const r = parseImport(JSON.stringify({ checkIns: [] }), device);
    if (r.ok) expect(r.merged.closet).toEqual(full.closet);
  });
});

describe('parseImport — 합치기', () => {
  it('기존 기록을 지우지 않는다', () => {
    const current: Snapshot = { ...empty, checkIns: [checkIn('z')] };
    const r = parseImport(buildExport(full, false), current);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.merged.checkIns.map((c) => c.id).sort()).toEqual(['a', 'b', 'z']);
  });

  it('같은 id는 중복으로 넣지 않고 기존 것을 남긴다', () => {
    const current: Snapshot = { ...empty, checkIns: [checkIn('a', 9)] };
    const r = parseImport(buildExport(full, false), current);
    if (!r.ok) return;
    expect(r.merged.checkIns).toHaveLength(2);
    expect(r.merged.checkIns.find((c) => c.id === 'a')?.sudsPre).toBe(9);
    expect(r.added.checkIns).toBe(1);
  });

  it('일기는 날짜 기준으로 합치고 기존 것을 남긴다', () => {
    const mine = entry('2026-10-20');
    mine.answers = [{ promptId: 'drain', text: '내가 쓴 것' }];
    const current: Snapshot = { ...empty, journal: [mine] };
    const r = parseImport(buildExport(full, true), current);
    if (!r.ok) return;
    expect(r.merged.journal).toHaveLength(1);
    expect(r.merged.journal[0].answers[0].text).toBe('내가 쓴 것');
    expect(r.added.journal).toBe(0);
  });

  it('주간 회기 수는 weekStart 기준으로 합친다', () => {
    const current: Snapshot = {
      ...empty,
      weeklySessions: [{ weekStart: '2026-10-19', sessions: 30 }],
    };
    const r = parseImport(buildExport(full, false), current);
    if (!r.ok) return;
    expect(r.merged.weeklySessions).toHaveLength(1);
    expect(r.merged.weeklySessions[0].sessions).toBe(30);
  });
});

describe('parseImport — 망가진 레코드', () => {
  it('모양이 틀린 체크인은 건너뛰고 센다', () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      checkIns: [
        checkIn('good'),
        { id: 'no-timestamp', sudsPre: 5 },
        { timestamp: '2026-10-20T09:00:00.000Z' },
        null,
      ],
    });
    const r = parseImport(raw, empty);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.merged.checkIns).toHaveLength(1);
    expect(r.skipped).toBe(3);
  });

  it('SUDS 범위를 벗어난 체크인은 건너뛴다', () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      checkIns: [{ ...checkIn('bad'), sudsPre: 42 }],
    });
    const r = parseImport(raw, empty);
    if (!r.ok) return;
    expect(r.merged.checkIns).toHaveLength(0);
    expect(r.skipped).toBe(1);
  });

  it('체크인이 하나도 유효하지 않아도 파일 자체는 받아들인다', () => {
    const raw = JSON.stringify({ schemaVersion: 1, checkIns: [] });
    expect(parseImport(raw, empty).ok).toBe(true);
  });
});
