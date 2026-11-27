import { describe, expect, it } from 'vitest';
import { guessReactions } from './emotionGuess';

const top = (t: string) => guessReactions(t)[0]?.id;

describe('guessReactions — 적은 반응이 여섯 중 무엇인지', () => {
  it.each([
    ['가슴이 계속 두근거려요', 'hyperarousal'],
    ['손이 떨리고 긴장돼요', 'hyperarousal'],
    ['내담자 부모한테 너무 화가 나요', 'anger'],
    ['짜증나고 억울해요', 'anger'],
    ['들은 장면이 자꾸 눈앞에 떠올라요', 'intrusion'],
    ['그냥 멍해요', 'numbness'],
    ['아무 느낌이 없고 텅 빈 것 같아요', 'numbness'],
    ['내가 할 수 있는 게 없어서 무력해요', 'heaviness'],
    ['마음이 무겁고 슬퍼요', 'heaviness'],
    ['아까 그렇게 말하지 말걸 계속 생각나요', 'rumination'],
    ['다음 회기가 걱정돼요', 'rumination'],
  ])('%s → %s', (text, want) => {
    expect(top(text)).toBe(want);
  });

  it('"대화·화면·변화"의 화는 분노로 보지 않는다', () => {
    expect(guessReactions('대화 화면 변화')).toEqual([]);
  });

  it('아무것도 안 맞거나 비어 있으면 빈 배열', () => {
    expect(guessReactions('')).toEqual([]);
    expect(guessReactions('오늘 점심은 김밥')).toEqual([]);
  });

  it('엇비슷하면 두 개까지', () => {
    const g = guessReactions('화가 나고 심장이 두근거려요');
    expect(g.map((x) => x.id).sort()).toEqual(['anger', 'hyperarousal']);
    expect(g.length).toBeLessThanOrEqual(2);
  });
});
