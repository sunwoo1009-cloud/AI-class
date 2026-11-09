import { describe, expect, it } from 'vitest';
import {
  isEveningScene,
  parseIntroOverride,
  parseTimeOverride,
  sceneNow,
} from './devTime';

const BASE = new Date('2026-11-09T09:30:00');

describe('parseTimeOverride', () => {
  it('?time= 을 읽는다', () => {
    expect(parseTimeOverride('?time=18')).toBe(18);
    expect(parseTimeOverride('?time=0')).toBe(0);
    expect(parseTimeOverride('?time=23')).toBe(23);
  });

  it('?hour= 도 그대로 받는다', () => {
    expect(parseTimeOverride('?hour=20')).toBe(20);
  });

  it('?time= 이 ?hour= 보다 우선한다', () => {
    expect(parseTimeOverride('?hour=9&time=18')).toBe(18);
  });

  it('없으면 null', () => {
    expect(parseTimeOverride('')).toBeNull();
    expect(parseTimeOverride('?other=1')).toBeNull();
    expect(parseTimeOverride('?time=')).toBeNull();
  });

  it('범위를 벗어나거나 숫자가 아니면 무시한다', () => {
    expect(parseTimeOverride('?time=24')).toBeNull();
    expect(parseTimeOverride('?time=-1')).toBeNull();
    expect(parseTimeOverride('?time=여섯')).toBeNull();
    expect(parseTimeOverride('?time=9.5')).toBeNull();
  });
});

describe('parseIntroOverride', () => {
  it('1 이면 true, 0 이면 false', () => {
    expect(parseIntroOverride('?intro=1')).toBe(true);
    expect(parseIntroOverride('?intro=0')).toBe(false);
  });

  it('true / false 도 받는다', () => {
    expect(parseIntroOverride('?intro=true')).toBe(true);
    expect(parseIntroOverride('?intro=false')).toBe(false);
  });

  it('없거나 알 수 없는 값이면 null', () => {
    expect(parseIntroOverride('')).toBeNull();
    expect(parseIntroOverride('?intro=')).toBeNull();
    expect(parseIntroOverride('?intro=maybe')).toBeNull();
  });
});

describe('sceneNow', () => {
  it('강제가 없으면 실제 시각을 그대로 쓴다', () => {
    expect(sceneNow('', BASE).getHours()).toBe(9);
  });

  it('강제가 있으면 그 시각으로 바꾼다', () => {
    expect(sceneNow('?time=20', BASE).getHours()).toBe(20);
  });

  it('날짜는 바꾸지 않는다 — 저장되는 값에 영향을 주면 안 된다', () => {
    const d = sceneNow('?time=20', BASE);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(10);
    expect(d.getDate()).toBe(9);
  });
});

describe('isEveningScene — 명세 7.3 의 5시 분기', () => {
  it('오전은 낮 장면', () => {
    expect(isEveningScene('', BASE)).toBe(false);
  });

  it('17시부터 노을 장면', () => {
    expect(isEveningScene('?time=16', BASE)).toBe(false);
    expect(isEveningScene('?time=17', BASE)).toBe(true);
    expect(isEveningScene('?time=23', BASE)).toBe(true);
  });
});
