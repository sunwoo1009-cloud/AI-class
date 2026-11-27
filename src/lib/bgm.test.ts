import { describe, expect, it } from 'vitest';
import { DEFAULT_BGM, clampVolume, parseBgmPrefs } from './bgm';

describe('배경 음악 설정 읽기', () => {
  it('저장된 것이 없으면 기본값 (켜짐, 음량 40%)', () => {
    expect(parseBgmPrefs(null)).toEqual(DEFAULT_BGM);
    expect(DEFAULT_BGM).toEqual({ on: true, volume: 0.4 });
  });
  it('저장된 값을 그대로 읽는다', () => {
    expect(parseBgmPrefs('{"on":false,"volume":0.75}')).toEqual({ on: false, volume: 0.75 });
  });
  it('모양이 깨졌으면 기본값', () => {
    expect(parseBgmPrefs('{not json')).toEqual(DEFAULT_BGM);
    expect(parseBgmPrefs('{"on":"yes","volume":"loud"}')).toEqual(DEFAULT_BGM);
  });
});

describe('clampVolume', () => {
  it('0~1 사이로 자르고 소수 둘째 자리까지', () => {
    expect(clampVolume(1.4)).toBe(1);
    expect(clampVolume(-0.2)).toBe(0);
    expect(clampVolume(0.333)).toBe(0.33);
  });
  it('숫자가 아니면 기본 음량', () => {
    expect(clampVolume(NaN)).toBe(DEFAULT_BGM.volume);
    expect(clampVolume(undefined)).toBe(DEFAULT_BGM.volume);
  });
});
