import { describe, expect, it } from 'vitest';
import { speechText, voiceScore } from './guide';

describe('자연스러운 한국어 목소리 고르기', () => {
  const v = (name: string, lang = 'ko-KR') => ({ name, lang });
  it('한국어가 아니면 고르지 않는다', () => {
    expect(voiceScore(v('Samantha', 'en-US'))).toBeLessThan(0);
  });
  it('신경망·온라인 > 프리미엄·향상 > Google > 기본 > 압축', () => {
    const order = [
      v('Microsoft SunHi Online (Natural) - Korean (Korea)'),
      v('Yuna (Premium)'),
      v('Yuna (Enhanced)'),
      v('Google 한국의'),
      v('Yuna'),
      v('Yuna (Compact)'),
    ].map(voiceScore);
    expect([...order].sort((a, b) => b - a)).toEqual(order);
  });
});

describe('음성 안내 — 읽을 글 다듬기', () => {
  it('닉네임 자리(○○)와 뒤 조사는 읽지 않는다', () => {
    expect(speechText('○○는 지금 지쳐 있다')).toBe('지금 지쳐 있다');
    expect(speechText('○○아, 숨을 쉬어 봐')).toBe('숨을 쉬어 봐');
  });

  it('줄바꿈은 쉼표로 이어 읽는다', () => {
    expect(speechText('그 무게는 내 것이 아니라\n함께 있었기 때문에 전해진 거예요')).toBe(
      '그 무게는 내 것이 아니라, 함께 있었기 때문에 전해진 거예요',
    );
  });

  it('빈 줄은 한 번만 쉰다', () => {
    expect(speechText('첫 줄\n\n셋째 줄')).toBe('첫 줄, 셋째 줄');
  });

  it('닉네임이 있으면 그대로 읽는다', () => {
    expect(speechText('슈붕파는 지금 지쳐 있다')).toBe('슈붕파는 지금 지쳐 있다');
  });
});
