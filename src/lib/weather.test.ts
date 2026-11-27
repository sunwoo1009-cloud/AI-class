import { describe, expect, it } from 'vitest';
import { cacheFresh, coarse, parseWeatherOverride, weatherFromCode } from './weather';

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
