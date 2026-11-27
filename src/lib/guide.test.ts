import { describe, expect, it } from 'vitest';
import { speechText } from './guide';

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
