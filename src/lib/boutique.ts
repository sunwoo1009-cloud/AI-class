/**
 * 부티크 — 모은 붕어빵 도장으로 직장인을 꾸민다 (명세 8.8, 2026-11-24 추가).
 *
 * - 처음 모습은 인트로의 실루엣이다. 아이템을 입히면 그 부분만 색이 생긴다.
 * - 값은 **도장 수**다. 기본(피부·헤어) 1개, 옷(상의·하의·신발) 2개, 액세서리 3개.
 * - 도장은 마무리마다 하나씩 쌓이고(`cbd:stampTotal`, 줄지 않는다),
 *   산 만큼은 `spent` 에 따로 센다. 쓸 수 있는 도장 = 모은 도장 − 쓴 도장.
 * - 모두 이 기기에만 저장한다. 계정·서버는 없다 (설계 원칙 2).
 *
 * 그림은 src/avatar/Avatar.tsx 가 그린다. 여기는 데이터와 계산만 둔다.
 */

export type Category = 'skin' | 'hair' | 'top' | 'bottom' | 'shoes' | 'accessory';

/** 한 칸에는 아이템 하나만 입는다. 액세서리는 칸이 나뉘어 있어 여러 개를 함께 쓸 수 있다. */
export type Slot =
  | 'skin'
  | 'hair'
  | 'top'
  | 'bottom'
  | 'shoes'
  | 'glasses'
  | 'neck'
  | 'hat'
  | 'bag';

export interface Item {
  id: string;
  name: string;
  category: Category;
  slot: Slot;
  /** 도장 수 */
  price: number;
}

export const PRICE = { basic: 1, clothes: 2, accessory: 3 } as const;

export const CATEGORY_LABELS: Record<Category, string> = {
  skin: '피부',
  hair: '헤어',
  top: '상의',
  bottom: '하의',
  shoes: '신발',
  accessory: '액세서리',
};

export const CATEGORIES: Category[] = ['skin', 'hair', 'top', 'bottom', 'shoes', 'accessory'];

const basic = (id: string, name: string, category: 'skin' | 'hair'): Item => ({
  id,
  name,
  category,
  slot: category,
  price: PRICE.basic,
});
const clothes = (id: string, name: string, category: 'top' | 'bottom' | 'shoes'): Item => ({
  id,
  name,
  category,
  slot: category,
  price: PRICE.clothes,
});
const acc = (id: string, name: string, slot: Slot): Item => ({
  id,
  name,
  category: 'accessory',
  slot,
  price: PRICE.accessory,
});

/** 1차 아이템 25개 */
export const ITEMS: Item[] = [
  basic('skin-1', '밝은 피부', 'skin'),
  basic('skin-2', '중간 피부', 'skin'),
  basic('skin-3', '황갈색 피부', 'skin'),
  basic('skin-4', '짙은 피부', 'skin'),

  basic('hair-wave', '기본 웨이브', 'hair'),
  basic('hair-bob', '단발', 'hair'),
  basic('hair-long', '긴 생머리', 'hair'),
  basic('hair-pony', '포니테일', 'hair'),

  clothes('top-vest', '니트 베스트', 'top'),
  clothes('top-shirt', '셔츠', 'top'),
  clothes('top-cardigan', '가디건', 'top'),
  clothes('top-hoodie', '후드티', 'top'),
  clothes('top-coat', '코트', 'top'),

  clothes('bottom-slacks', '슬랙스', 'bottom'),
  clothes('bottom-jeans', '청바지', 'bottom'),
  clothes('bottom-chino', '치노 팬츠', 'bottom'),
  clothes('bottom-skirt', '치마 (A라인)', 'bottom'),

  clothes('shoes-sneakers', '운동화', 'shoes'),
  clothes('shoes-dress', '구두', 'shoes'),
  clothes('shoes-loafer', '로퍼', 'shoes'),

  acc('acc-glasses', '안경', 'glasses'),
  acc('acc-tie', '넥타이', 'neck'),
  acc('acc-scarf', '목도리', 'neck'),
  acc('acc-cap', '볼캡', 'hat'),
  acc('acc-backpack', '백팩', 'bag'),
];

const BY_ID = new Map(ITEMS.map((i) => [i.id, i]));

export function itemById(id: string): Item | undefined {
  return BY_ID.get(id);
}

export interface Closet {
  /** 아이템을 사느라 쓴 도장 수 */
  spent: number;
  /** 산 아이템 id */
  owned: string[];
  /** 칸마다 입고 있는 아이템 id */
  equipped: Partial<Record<Slot, string>>;
}

export function emptyCloset(): Closet {
  return { spent: 0, owned: [], equipped: {} };
}

/** 쓸 수 있는 도장 = 모은 도장 − 쓴 도장 */
export function stampBalance(stampTotal: number, closet: Closet): number {
  return Math.max(0, Math.floor(stampTotal) - closet.spent);
}

export type BuyResult =
  | { ok: true; closet: Closet }
  | { ok: false; reason: 'unknown' | 'owned' | 'short' };

/** 사면 바로 입는다 */
export function buyItem(closet: Closet, stampTotal: number, id: string): BuyResult {
  const item = itemById(id);
  if (!item) return { ok: false, reason: 'unknown' };
  if (closet.owned.includes(id)) return { ok: false, reason: 'owned' };
  if (stampBalance(stampTotal, closet) < item.price) return { ok: false, reason: 'short' };
  return {
    ok: true,
    closet: {
      spent: closet.spent + item.price,
      owned: [...closet.owned, id],
      equipped: { ...closet.equipped, [item.slot]: id },
    },
  };
}

/**
 * 입어 본 여러 개를 한 번에 산다. 하나라도 문제가 있으면 **하나도 사지 않는다**
 * (도장이 반만 빠지는 일이 없게).
 */
export function buyItems(closet: Closet, stampTotal: number, ids: string[]): BuyResult {
  const unique = [...new Set(ids)];
  const items: Item[] = [];
  for (const id of unique) {
    const item = itemById(id);
    if (!item) return { ok: false, reason: 'unknown' };
    if (closet.owned.includes(id)) return { ok: false, reason: 'owned' };
    items.push(item);
  }
  const cost = items.reduce((sum, i) => sum + i.price, 0);
  if (stampBalance(stampTotal, closet) < cost) return { ok: false, reason: 'short' };
  const equipped = { ...closet.equipped };
  for (const i of items) equipped[i.slot] = i.id;
  return {
    ok: true,
    closet: { spent: closet.spent + cost, owned: [...closet.owned, ...unique], equipped },
  };
}

/** 가진 아이템을 누르면 입고, 입고 있으면 벗는다 */
export function toggleEquip(closet: Closet, id: string): Closet {
  const item = itemById(id);
  if (!item || !closet.owned.includes(id)) return closet;
  const equipped = { ...closet.equipped };
  if (equipped[item.slot] === id) delete equipped[item.slot];
  else equipped[item.slot] = id;
  return { ...closet, equipped };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** 저장값·가져온 파일을 믿지 않고 모양을 맞춘다 */
export function sanitizeCloset(raw: unknown): Closet {
  if (!isObject(raw)) return emptyCloset();
  const spent =
    typeof raw.spent === 'number' && Number.isFinite(raw.spent) && raw.spent > 0
      ? Math.floor(raw.spent)
      : 0;
  const owned = Array.isArray(raw.owned)
    ? [...new Set(raw.owned.filter((x): x is string => typeof x === 'string' && BY_ID.has(x)))]
    : [];
  const equipped: Closet['equipped'] = {};
  if (isObject(raw.equipped)) {
    for (const [slot, id] of Object.entries(raw.equipped)) {
      if (typeof id !== 'string' || !owned.includes(id)) continue;
      const item = BY_ID.get(id);
      if (item && item.slot === slot) equipped[item.slot] = id;
    }
  }
  return { spent, owned, equipped };
}

/**
 * 가져오기 — 가진 것은 합치고, 쓴 도장은 큰 쪽을 남긴다 (도장 수와 같은 규칙).
 * 입은 모습은 기기 것을 우선하고, 기기에 입은 게 없을 때만 파일 것을 쓴다.
 */
export function mergeCloset(current: Closet, incoming: Closet): Closet {
  const owned = [...new Set([...current.owned, ...incoming.owned])];
  const equipped =
    Object.keys(current.equipped).length > 0 ? current.equipped : incoming.equipped;
  return sanitizeCloset({
    spent: Math.max(current.spent, incoming.spent),
    owned,
    equipped,
  });
}
