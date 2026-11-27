import { describe, expect, it } from 'vitest';
import { cacheFresh, coarse, duskBySunset, parseWeatherOverride, weatherFromCode } from './weather';
import { isEveningScene } from './devTime';

describe('실제 일몰 기준 노을 (2026-11-27)', () => {
  const day = (h: number, m = 0) => new Date(2026, 10, 27, h, m);
  it('일몰 40분 전부터 노을', () => {
    expect(duskBySunset('2026-11-27T17:15', day(16, 34))).toBe(false);
    expect(duskBySunset('2026-11-27T17:15', day(16, 35))).toBe(true);
    expect(duskBySunset('2026-11-27T17:15', day(22))).toBe(true);
  });
  it('여름처럼 일몰이 늦으면 5시가 넘어도 아직 낮', () => {
    const june = new Date(2026, 5, 21, 18, 0);
    expect(duskBySunset('2026-06-21T19:57', june)).toBe(false);
  });
  it('다른 날 것이거나 없으면 판단하지 않는다(null)', () => {
    expect(duskBySunset('2026-11-26T17:15', day(18))).toBeNull();
    expect(duskBySunset(undefined, day(18))).toBeNull();
    expect(duskBySunset('엉뚱', day(18))).toBeNull();
  });
  it('장면 판단 — 일몰이 있으면 그걸, 없으면 17시', () => {
    expect(isEveningScene('', day(16, 50), '2026-11-27T17:15')).toBe(true);
    expect(isEveningScene('', day(16, 50), undefined)).toBe(false);
    expect(isEveningScene('', day(17, 5), undefined)).toBe(true);
  });
  it('?time= 확인용은 늘 17시 기준', () => {
    expect(isEveningScene('?time=16', day(12), '2026-11-27T15:00')).toBe(false);
    expect(isEveningScene('?time=18', day(12), '2026-11-27T20:00')).toBe(true);
  });
});

describe('날씨 코드 → 네 가지', () => {
  it('맑음', () => {
    expect(weatherFromCode(0)).toBe('clear');
    expect(weatherFromCode(1)).toBe('clear');
  });
  it('흐림 (구름·안개)', () => {
    for (const c of [2, 3, 45, 48]) expect(weatherFromCode(c)).toBe('cloudy');
  });
  it('비 (이슬비·어는 비·소나기·뇌우)', () => {
    for (const c of [51, 55, 61, 65, 66, 67, 80, 82, 95, 99]) expect(weatherFromCode(c)).toBe('rain');
  });
  it('눈', () => {
    for (const c of [71, 73, 75, 77, 85, 86]) expect(weatherFromCode(c)).toBe('snow');
  });
});

describe('확인용 ?weather=', () => {
  it('네 가지만 받는다', () => {
    expect(parseWeatherOverride('?weather=snow')).toBe('snow');
    expect(parseWeatherOverride('?weather=storm')).toBeNull();
    expect(parseWeatherOverride('')).toBeNull();
  });
});

describe('저장해 둔 날씨', () => {
  const place = { lat: 37.6, lon: 127 };
  const now = new Date('2026-11-27T12:00:00.000Z');
  it('같은 곳에서 1시간 안이면 쓴다', () => {
    expect(cacheFresh({ kind: 'rain', at: '2026-11-27T11:30:00.000Z', ...place }, place, now)).toBe(true);
  });
  it('1시간이 지나면 다시 묻는다', () => {
    expect(cacheFresh({ kind: 'rain', at: '2026-11-27T10:59:00.000Z', ...place }, place, now)).toBe(false);
  });
  it('지역이 바뀌면 다시 묻는다', () => {
    expect(cacheFresh({ kind: 'rain', at: '2026-11-27T11:30:00.000Z', lat: 35.1, lon: 129 }, place, now)).toBe(false);
  });
  it('이상한 값은 버린다', () => {
    expect(cacheFresh(null, place, now)).toBe(false);
    expect(cacheFresh({ kind: 'storm' as never, at: '2026-11-27T11:30:00.000Z', ...place }, place, now)).toBe(false);
  });
});

describe('좌표 뭉개기', () => {
  it('소수 첫째 자리 (약 10km)', () => {
    expect(coarse(37.56654)).toBe(37.6);
    expect(coarse(126.97797)).toBe(127);
  });
});
