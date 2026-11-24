import { describe, expect, it } from 'vitest';
import {
  ITEMS,
  PRICE,
  buyItem,
  emptyCloset,
  itemById,
  mergeCloset,
  sanitizeCloset,
  stampBalance,
  toggleEquip,
} from './boutique';
import type { Closet } from './boutique';

const closet = (patch: Partial<Closet> = {}): Closet => ({ ...emptyCloset(), ...patch });

describe('카탈로그', () => {
  it('아이템 id 가 겹치지 않는다', () => {
    const ids = ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('가격은 기본 1 · 옷 2 · 액세서리 3', () => {
    for (const item of ITEMS) {
      const expected =
        item.category === 'skin' || item.category === 'hair'
          ? PRICE.basic
          : item.category === 'accessory'
            ? PRICE.accessory
            : PRICE.clothes;
      expect(item.price).toBe(expected);
    }
    expect(PRICE).toEqual({ basic: 1, clothes: 2, accessory: 3 });
  });
});

describe('stampBalance — 쓸 수 있는 도장', () => {
  it('모은 도장에서 쓴 도장을 뺀다', () => {
    expect(stampBalance(12, closet({ spent: 5 }))).toBe(7);
  });

  it('음수가 되지 않는다', () => {
    expect(stampBalance(2, closet({ spent: 5 }))).toBe(0);
  });
});

describe('buyItem — 사기', () => {
  const hoodie = ITEMS.find((i) => i.category === 'top')!;

  it('도장이 충분하면 사고, 쓴 도장이 늘고, 바로 입는다', () => {
    const r = buyItem(closet(), 10, hoodie.id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.closet.spent).toBe(hoodie.price);
    expect(r.closet.owned).toContain(hoodie.id);
    expect(r.closet.equipped[hoodie.slot]).toBe(hoodie.id);
  });

  it('도장이 모자라면 사지 못한다', () => {
    const r = buyItem(closet(), hoodie.price - 1, hoodie.id);
    expect(r).toEqual({ ok: false, reason: 'short' });
  });

  it('이미 쓴 도장까지 계산한다', () => {
    const r = buyItem(closet({ spent: 9 }), 10, hoodie.id);
    expect(r.ok).toBe(false);
  });

  it('이미 가진 것은 다시 사지 않는다', () => {
    const r = buyItem(closet({ owned: [hoodie.id] }), 10, hoodie.id);
    expect(r).toEqual({ ok: false, reason: 'owned' });
  });

  it('없는 아이템은 거절한다', () => {
    expect(buyItem(closet(), 10, 'nope')).toEqual({ ok: false, reason: 'unknown' });
  });
});

describe('toggleEquip — 입고 벗기', () => {
  const [a, b] = ITEMS.filter((i) => i.slot === 'top');

  it('가진 것을 누르면 입고, 같은 칸의 다른 것은 벗는다', () => {
    let c = closet({ owned: [a.id, b.id], equipped: { top: a.id } });
    c = toggleEquip(c, b.id);
    expect(c.equipped.top).toBe(b.id);
  });

  it('입고 있는 것을 다시 누르면 벗는다', () => {
    const c = toggleEquip(closet({ owned: [a.id], equipped: { top: a.id } }), a.id);
    expect(c.equipped.top).toBeUndefined();
  });

  it('안 가진 것은 입을 수 없다', () => {
    const c = toggleEquip(closet(), a.id);
    expect(c.equipped.top).toBeUndefined();
  });

  it('액세서리는 칸이 달라 함께 쓸 수 있다', () => {
    const glasses = ITEMS.find((i) => i.slot === 'glasses')!;
    const hat = ITEMS.find((i) => i.slot === 'hat')!;
    let c = closet({ owned: [glasses.id, hat.id] });
    c = toggleEquip(toggleEquip(c, glasses.id), hat.id);
    expect(c.equipped.glasses).toBe(glasses.id);
    expect(c.equipped.hat).toBe(hat.id);
  });
});

describe('sanitizeCloset · mergeCloset — 저장값과 가져오기', () => {
  const real = ITEMS[0].id;

  it('모르는 아이템과 이상한 값은 버린다', () => {
    const c = sanitizeCloset({
      spent: -3,
      owned: [real, 'nope', 7],
      equipped: { skin: 'nope', [itemById(real)!.slot]: real },
    });
    expect(c.spent).toBe(0);
    expect(c.owned).toEqual([real]);
    expect(c.equipped[itemById(real)!.slot]).toBe(real);
    expect(c.equipped.skin === 'nope').toBe(false);
  });

  it('가지지 않은 아이템은 입고 있을 수 없다', () => {
    const c = sanitizeCloset({ spent: 0, owned: [], equipped: { skin: real } });
    expect(Object.keys(c.equipped)).toHaveLength(0);
  });

  it('합칠 때 가진 것은 합치고, 쓴 도장은 큰 쪽을 남긴다', () => {
    const other = ITEMS[1].id;
    const m = mergeCloset(
      closet({ spent: 3, owned: [real] }),
      closet({ spent: 5, owned: [other] }),
    );
    expect(m.spent).toBe(5);
    expect(new Set(m.owned)).toEqual(new Set([real, other]));
  });

  it('기기에서 입고 있던 모습을 우선한다', () => {
    const slot = itemById(real)!.slot;
    const m = mergeCloset(
      closet({ owned: [real], equipped: { [slot]: real } }),
      closet({ owned: [], equipped: {} }),
    );
    expect(m.equipped[slot]).toBe(real);
  });
});
