import { AvatarSvg } from '../avatar/Avatar';
import type { Equipped } from '../avatar/Avatar';

/** 개발 확인용 — 아이템 조합을 한 화면에 늘어놓는다 (?screens=avatar-parts) */
const LOOKS: [string, Equipped][] = [
  ['처음 (실루엣)', {}],
  ['피부만', { skin: 'skin-1' }],
  ['웨이브+베스트', { skin: 'skin-1', hair: 'hair-wave', top: 'top-vest', bottom: 'bottom-slacks', shoes: 'shoes-sneakers' }],
  ['단발+셔츠', { skin: 'skin-2', hair: 'hair-bob', top: 'top-shirt', bottom: 'bottom-jeans', shoes: 'shoes-loafer', glasses: 'acc-glasses' }],
  ['긴머리+가디건', { skin: 'skin-3', hair: 'hair-long', top: 'top-cardigan', bottom: 'bottom-skirt', shoes: 'shoes-dress' }],
  ['포니+후드', { skin: 'skin-4', hair: 'hair-pony', top: 'top-hoodie', bottom: 'bottom-chino', shoes: 'shoes-sneakers', bag: 'acc-backpack' }],
  ['코트+목도리', { skin: 'skin-1', hair: 'hair-wave', top: 'top-coat', bottom: 'bottom-slacks', shoes: 'shoes-dress', neck: 'acc-scarf' }],
  ['넥타이+볼캡', { skin: 'skin-2', hair: 'hair-wave', top: 'top-shirt', bottom: 'bottom-slacks', shoes: 'shoes-dress', neck: 'acc-tie', hat: 'acc-cap' }],
  ['옷만 (피부 없음)', { top: 'top-hoodie', bottom: 'bottom-jeans', shoes: 'shoes-sneakers' }],
];

export function AvatarParts() {
  return (
    <div className="app" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        alignContent: 'start',
        gap: 8,
      }}>
      {LOOKS.map(([label, eq]) => (
        <div key={label} style={{ textAlign: 'center', fontSize: 12 }}>
          <AvatarSvg equipped={eq} />
          {label}
        </div>
      ))}
    </div>
  );
}
