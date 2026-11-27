import type { Equipped } from '../avatar/Avatar';
import { Avatar3DLazy } from '../avatar3d/Avatar3DLazy';

/** 확인용 옷차림 — 첫 줄은 참고 이미지와 비슷하게 */
const LOOKS: { name: string; eq: Equipped }[] = [
  {
    name: '참고 이미지처럼',
    eq: { skin: 'skin-1', hair: 'hair-wave', top: 'top-vest', bottom: 'bottom-chino', shoes: 'shoes-sneakers', hat: 'acc-cap' },
  },
  { name: '아무것도 안 입음', eq: {} },
  {
    name: '셔츠·넥타이·슬랙스·구두·안경',
    eq: { skin: 'skin-2', hair: 'hair-bob', top: 'top-shirt', bottom: 'bottom-slacks', shoes: 'shoes-dress', glasses: 'acc-glasses', neck: 'acc-tie' },
  },
  {
    name: '후드티·청바지·백팩·포니테일',
    eq: { skin: 'skin-3', hair: 'hair-pony', top: 'top-hoodie', bottom: 'bottom-jeans', shoes: 'shoes-sneakers', bag: 'acc-backpack' },
  },
  {
    name: '코트·목도리·치마·로퍼·긴 머리',
    eq: { skin: 'skin-4', hair: 'hair-long', top: 'top-coat', bottom: 'bottom-skirt', shoes: 'shoes-loafer', neck: 'acc-scarf' },
  },
  {
    name: '가디건·치노',
    eq: { skin: 'skin-1', hair: 'hair-wave', top: 'top-cardigan', bottom: 'bottom-chino', shoes: 'shoes-loafer' },
  },
];

/**
 * 3D 아바타 확인용 (2026-11-27) — 옷차림 하나를 앞·¾·옆·뒤로.
 * `?screens=avatar-3d&bare=1&look=0~5` (브라우저가 3D 캔버스를 16개쯤까지만 띄워서 한 번에 하나씩)
 */
export function Avatar3DParts() {
  const raw = Number(new URLSearchParams(window.location.search).get('look') ?? 0);
  const i = Number.isInteger(raw) && raw >= 0 && raw < LOOKS.length ? raw : 0;
  const l = LOOKS[i];
  return (
    <div className="app" style={{ maxWidth: 'none' }}>
      <p style={{ margin: '4px 0', fontWeight: 700 }}>
        {i}. {l.name}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {[0, 35, 90, 180].map((a) => (
          <Avatar3DLazy key={a} className="parts3d" equipped={l.eq} angle={a} />
        ))}
      </div>
    </div>
  );
}
