import * as THREE from 'three';
import type { Equipped } from '../avatar/Avatar';

/**
 * 3D 아바타 (2026-11-27) — 사용자가 준 참고 이미지(클레이 인형 느낌의 3D 캐릭터)를 따른다.
 * 큰 머리 · 선으로 그은 눈과 눈썹 · 작은 코 · 큰 귀 · 볼 홍조 · 짧은 몸 · 통 넓은 바지 · 둥근 신발.
 *
 * 규칙은 2D 아바타(src/avatar/Avatar.tsx)와 같다:
 * - 아무것도 안 입힌 부분은 실루엣 한 색이다. 피부를 입혀야 얼굴이 보인다.
 * - 헤어를 안 샀으면 기본 웨이브 모양을 실루엣 색으로.
 * - 색은 2D 와 같은 값을 쓴다 (옷장 썸네일은 여전히 2D 라서 맞춰 둔다).
 *
 * 단위: 바닥 y=0, 키 약 1.9. 앞은 +z.
 */

export const SILHOUETTE = '#574b45';

const SKIN: Record<string, string> = {
  'skin-1': '#fde3cf',
  'skin-2': '#f3c9a3',
  'skin-3': '#d79f6e',
  'skin-4': '#8f5b3b',
};
const HAIR = '#6b4430';
const TOP_COLOR: Record<string, string> = {
  'top-vest': '#fbfaf6',
  'top-shirt': '#cfe0f2',
  'top-cardigan': '#d9bf9a',
  'top-hoodie': '#f3cd4b',
  'top-coat': '#c79a63',
};
const BOTTOM_COLOR: Record<string, string> = {
  'bottom-slacks': '#4a4a52',
  'bottom-jeans': '#4f77a8',
  'bottom-chino': '#d8c39a',
};
const SHOE_COLOR: Record<string, string> = {
  'shoes-sneakers': '#f5f2ec',
  'shoes-dress': '#2b2b2e',
  'shoes-loafer': '#7a4a2c',
};
const INK = '#3a2a22';

/** 머리 */
const HEAD_Y = 1.36;
const HEAD_R = 0.42;
/** 어깨 높이 · 몸통 */
const SHOULDER_Y = 0.98;

/* ------------------------------------------------------------------ */

const mats = new Map<string, THREE.MeshStandardMaterial>();
/** 클레이 질감 — 반사 없이 무르게 */
function mat(color: string, rough = 0.88): THREE.MeshStandardMaterial {
  const key = `${color}|${rough}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: rough, metalness: 0 });
    mats.set(key, m);
  }
  return m;
}

function mesh(geo: THREE.BufferGeometry, color: string, rough?: number): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat(color, rough));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function at<T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T {
  o.position.set(x, y, z);
  return o;
}

/** 머리 표면의 한 점 — 가로 각(yaw, 앞=0), 세로 각(pitch, 위=+) */
function onHead(yaw: number, pitch: number, lift = 0): THREE.Vector3 {
  const r = HEAD_R + lift;
  return new THREE.Vector3(
    r * Math.cos(pitch) * Math.sin(yaw),
    HEAD_Y + r * Math.sin(pitch) * 0.95,
    r * Math.cos(pitch) * Math.cos(yaw) * 0.92,
  );
}

/** 표면에 붙이고 바깥을 보게 */
function stick(o: THREE.Object3D, p: THREE.Vector3): THREE.Object3D {
  o.position.copy(p);
  const out = p.clone().sub(new THREE.Vector3(0, HEAD_Y, 0)).add(p);
  o.lookAt(out);
  return o;
}

/* ------------------------------------------------------------------ */

function buildHead(g: THREE.Group, skin: string, hasSkin: boolean, blush: boolean) {
  const head = mesh(new THREE.SphereGeometry(HEAD_R, 48, 36), skin);
  head.scale.set(1, 0.95, 0.92);
  g.add(at(head, 0, HEAD_Y, 0));

  // 큰 귀
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.SphereGeometry(0.1, 24, 18), skin);
    ear.scale.set(0.55, 1, 0.8);
    g.add(at(ear, s * 0.4, HEAD_Y - 0.03, -0.02));
  }

  // 목
  g.add(at(mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.14, 20), skin), 0, 1.0, 0));

  if (!hasSkin) return;

  // 눈 — 짧은 가로선 (참고 이미지)
  for (const s of [-1, 1]) {
    const eye = mesh(new THREE.CapsuleGeometry(0.017, 0.05, 6, 12), INK, 0.6);
    stick(eye, onHead(s * 0.3, -0.02, -0.004));
    eye.rotateZ(Math.PI / 2);
    g.add(eye);

    const brow = mesh(new THREE.CapsuleGeometry(0.011, 0.055, 6, 12), INK, 0.6);
    stick(brow, onHead(s * 0.3, 0.16, -0.006));
    brow.rotateZ(Math.PI / 2 + s * 0.08);
    g.add(brow);

    if (blush) {
      const cheek = new THREE.Mesh(
        new THREE.CircleGeometry(0.06, 24),
        new THREE.MeshStandardMaterial({ color: '#f29a92', transparent: true, opacity: 0.45, roughness: 1 }),
      );
      stick(cheek, onHead(s * 0.47, -0.2, 0.004));
      g.add(cheek);
    }
  }

  // 작은 코
  const nose = mesh(new THREE.SphereGeometry(0.032, 16, 12), skin);
  stick(nose, onHead(0, -0.12, 0.01));
  g.add(nose);

  // 작은 입
  const mouth = mesh(new THREE.CapsuleGeometry(0.009, 0.03, 4, 8), '#8b4a3c', 0.6);
  stick(mouth, onHead(0, -0.32, -0.004));
  mouth.rotateZ(Math.PI / 2);
  g.add(mouth);
}

function buildHair(g: THREE.Group, id: string | undefined, silhouette: string) {
  const color = id ? HAIR : silhouette;
  /*
   * 머리카락 바탕 — 세 조각 (2026-11-27 "머리가 비어있어" 고침: 전에는 정수리만 얇게 덮여 옆이 맨머리였다)
   * three.js 구의 가로 각 φ: 앞(+z)이 0.5π, +x 가 π, 뒤(-z)가 1.5π, -x 가 0/2π. 세로 각 θ 는 정수리에서 0.
   *  ① 옆·뒤 껍질: 앞쪽 ±0.75 만 비우고 귀 바로 위(θ≈1.38)까지 덮는다
   *  ② 뒤통수: 뒤쪽만 목덜미(θ≈2.3)까지
   *  ③ 앞 정수리: 이마 위(θ≈1.0)까지 — 그 아래 이마는 비워 두고 앞머리가 내려온다
   */
  const R = HEAD_R + 0.03;
  const shell = (phiStart: number, phiLen: number, thetaLen: number) => {
    const m = mesh(new THREE.SphereGeometry(R, 48, 28, phiStart, phiLen, 0, thetaLen), color);
    m.scale.set(1, 0.95, 0.94);
    return at(m, 0, HEAD_Y + 0.005, -0.005);
  };
  const FRONT = Math.PI / 2;
  g.add(shell(FRONT + 0.75, Math.PI * 2 - 1.5, 1.38));
  g.add(shell(Math.PI * 1.5 - 0.95, 1.9, 2.3));
  g.add(shell(FRONT - 0.8, 1.6, 1.0));

  if (!id || id === 'hair-wave') {
    // 앞머리 — 동글동글한 덩어리가 정수리 끝에서 이마로 내려온다 (참고 이미지)
    for (let i = -3; i <= 3; i++) {
      const lump = mesh(new THREE.SphereGeometry(0.095, 20, 16), color);
      lump.scale.set(1, 0.85, 0.7);
      stick(lump, onHead(i * 0.21, 0.5 - Math.abs(i) * 0.035, 0.0));
      g.add(lump);
    }
    return;
  }
  if (id === 'hair-bob') {
    for (const s of [-1, 1]) {
      const side = mesh(new THREE.CapsuleGeometry(0.1, 0.32, 8, 16), color);
      g.add(at(side, s * 0.4, HEAD_Y - 0.12, -0.04));
    }
    const nape = mesh(new THREE.CapsuleGeometry(0.3, 0.12, 8, 24), color);
    nape.scale.set(1.25, 1, 0.55);
    g.add(at(nape, 0, HEAD_Y - 0.14, -0.2));
    return;
  }
  if (id === 'hair-long') {
    for (const s of [-1, 1]) {
      const side = mesh(new THREE.CapsuleGeometry(0.09, 0.62, 8, 16), color);
      g.add(at(side, s * 0.39, HEAD_Y - 0.3, -0.05));
    }
    const fall = mesh(new THREE.CapsuleGeometry(0.32, 0.55, 8, 24), color);
    fall.scale.set(1.15, 1, 0.45);
    g.add(at(fall, 0, HEAD_Y - 0.33, -0.22));
    return;
  }
  // 포니테일
  const tail = mesh(new THREE.CapsuleGeometry(0.1, 0.42, 8, 16), color);
  tail.rotation.x = 0.35;
  g.add(at(tail, 0, HEAD_Y - 0.08, -0.5));
  const tie = mesh(new THREE.TorusGeometry(0.075, 0.025, 10, 24), '#e07a8c');
  tie.rotation.x = Math.PI / 2 + 0.35;
  g.add(at(tie, 0, HEAD_Y + 0.15, -0.43));
}

/* ------------------------------------------------------------------ */

function buildTorso(g: THREE.Group, top: string | undefined, silhouette: string, skin: string) {
  const color = top && TOP_COLOR[top] ? TOP_COLOR[top] : silhouette;

  // 몸통 — 아래가 조금 넓은 둥근 통
  const body = mesh(new THREE.CapsuleGeometry(0.22, 0.2, 10, 28), color);
  body.scale.set(1.08, 1, 0.78);
  g.add(at(body, 0, 0.8, 0));

  // 팔 — 살짝 벌린 A 자세. 소매는 상의 색, 끝에 손
  const sleeve = top === 'top-vest' ? '#fbfaf6' : color;
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(s * 0.24, SHOULDER_Y - 0.04, 0);
    arm.rotation.z = s * 0.42;
    const upper = mesh(new THREE.CapsuleGeometry(0.075, 0.3, 8, 18), sleeve);
    upper.position.y = -0.2;
    arm.add(upper);
    const hand = mesh(new THREE.SphereGeometry(0.068, 18, 14), skin);
    hand.position.y = -0.43;
    arm.add(hand);
    g.add(arm);
  }

  if (!top || !TOP_COLOR[top]) return;

  // 깃 — 셔츠·베스트(안의 셔츠)·코트
  const collar = (c: string) => {
    for (const s of [-1, 1]) {
      const flap = mesh(new THREE.BoxGeometry(0.11, 0.025, 0.09), c);
      flap.rotation.set(0.5, s * 0.35, s * -0.5);
      g.add(at(flap, s * 0.07, 0.99, 0.13));
    }
  };

  if (top === 'top-vest') {
    // 셔츠 위에 니트 조끼 — 아래쪽을 감싸는 통
    const vest = new THREE.Mesh(
      new THREE.CylinderGeometry(0.235, 0.255, 0.36, 32, 1, true),
      // 열린 통이라 안쪽도 그린다 — 같이 쓰는 재질을 건드리지 않게 따로 만든다
      new THREE.MeshStandardMaterial({ color: '#f3e3bf', roughness: 0.95, side: THREE.DoubleSide }),
    );
    vest.castShadow = true;
    vest.scale.set(1.1, 1, 0.82);
    g.add(at(vest, 0, 0.75, 0));
    collar('#ffffff');
  } else if (top === 'top-shirt') {
    collar('#e8f1fa');
    for (const y of [0.9, 0.82, 0.74]) {
      g.add(at(mesh(new THREE.SphereGeometry(0.014, 10, 8), INK), 0.02, y, 0.175));
    }
  } else if (top === 'top-cardigan') {
    const inner = mesh(new THREE.ConeGeometry(0.08, 0.2, 3), '#fbfaf6');
    inner.rotation.set(Math.PI, 0, 0);
    inner.scale.set(1, 1, 0.3);
    g.add(at(inner, 0, 0.92, 0.155));
    for (const y of [0.8, 0.7]) g.add(at(mesh(new THREE.SphereGeometry(0.018, 10, 8), '#8a6a45'), 0.03, y, 0.175));
  } else if (top === 'top-hoodie') {
    const hood = mesh(new THREE.TorusGeometry(0.15, 0.06, 14, 30), '#e3b93a');
    hood.rotation.x = Math.PI / 2 - 0.25;
    g.add(at(hood, 0, 1.0, -0.03));
    const pocket = mesh(new THREE.BoxGeometry(0.26, 0.09, 0.03), '#e3b93a');
    g.add(at(pocket, 0, 0.66, 0.17));
  } else if (top === 'top-coat') {
    // 무릎까지 오는 코트 자락
    const skirt = mesh(new THREE.CylinderGeometry(0.25, 0.31, 0.42, 32), '#c79a63');
    skirt.scale.set(1, 1, 0.78);
    g.add(at(skirt, 0, 0.5, 0));
    collar('#b5864f');
    for (const y of [0.85, 0.72, 0.58]) g.add(at(mesh(new THREE.SphereGeometry(0.02, 10, 8), '#6b4a2a'), 0.04, y, 0.2));
  }
}

function buildLegs(g: THREE.Group, bottom: string | undefined, shoes: string | undefined, silhouette: string, skin: string) {
  const pants = bottom && BOTTOM_COLOR[bottom] ? BOTTOM_COLOR[bottom] : null;
  // 엉덩이 — 몸통과 두 다리 사이 틈을 메운다 (치마면 치마가 덮는다)
  if (bottom !== 'bottom-skirt') {
    const hips = mesh(new THREE.SphereGeometry(0.235, 32, 20), pants ?? silhouette);
    hips.scale.set(1.0, 0.6, 0.74);
    g.add(at(hips, 0, 0.6, 0));
  }
  for (const s of [-1, 1]) {
    if (bottom === 'bottom-skirt') {
      g.add(at(mesh(new THREE.CapsuleGeometry(0.055, 0.32, 8, 16), skin), s * 0.1, 0.3, 0));
    } else {
      // 통 넓은 바지 (참고 이미지)
      const leg = mesh(new THREE.CylinderGeometry(0.1, 0.115, 0.52, 24), pants ?? silhouette);
      g.add(at(leg, s * 0.11, 0.36, 0));
    }
    // 둥근 신발
    const color = shoes && SHOE_COLOR[shoes] ? SHOE_COLOR[shoes] : silhouette;
    const shoe = mesh(new THREE.CapsuleGeometry(0.08, 0.1, 8, 18), color, shoes === 'shoes-dress' ? 0.45 : 0.85);
    shoe.rotation.x = Math.PI / 2;
    shoe.scale.set(1, 1, 0.75);
    g.add(at(shoe, s * 0.11, 0.065, 0.04));
    if (shoes === 'shoes-sneakers') {
      // 초록 뒤축 (참고 이미지)
      const heel = mesh(new THREE.SphereGeometry(0.03, 12, 10), '#6fa36b');
      g.add(at(heel, s * 0.11, 0.08, -0.09));
    }
  }
  if (bottom === 'bottom-skirt') {
    const skirt = mesh(new THREE.CylinderGeometry(0.23, 0.33, 0.3, 32), '#34466e');
    skirt.scale.set(1, 1, 0.8);
    g.add(at(skirt, 0, 0.5, 0));
  }
}

function buildAccessories(g: THREE.Group, eq: Equipped) {
  if (eq.glasses === 'acc-glasses') {
    for (const s of [-1, 1]) {
      const ring = mesh(new THREE.TorusGeometry(0.075, 0.011, 10, 32), '#2b2b2e', 0.4);
      stick(ring, onHead(s * 0.3, -0.02, 0.03));
      g.add(ring);
    }
    const bridge = mesh(new THREE.CapsuleGeometry(0.008, 0.06, 4, 8), '#2b2b2e', 0.4);
    stick(bridge, onHead(0, 0.0, 0.035));
    bridge.rotateZ(Math.PI / 2);
    g.add(bridge);
  }
  if (eq.neck === 'acc-tie') {
    const knot = mesh(new THREE.SphereGeometry(0.03, 12, 10), '#2f3e6b');
    g.add(at(knot, 0, 0.95, 0.17));
    const blade = mesh(new THREE.ConeGeometry(0.045, 0.22, 4), '#2f3e6b');
    blade.rotation.set(Math.PI, Math.PI / 4, 0);
    blade.scale.set(1, 1, 0.3);
    g.add(at(blade, 0, 0.82, 0.18));
  }
  if (eq.neck === 'acc-scarf') {
    const wrap = mesh(new THREE.TorusGeometry(0.15, 0.055, 14, 30), '#c8524a');
    wrap.rotation.x = Math.PI / 2;
    g.add(at(wrap, 0, 1.01, 0));
    const tail = mesh(new THREE.BoxGeometry(0.09, 0.26, 0.04), '#c8524a');
    tail.rotation.z = 0.1;
    g.add(at(tail, 0.08, 0.86, 0.15));
  }
  if (eq.hat === 'acc-cap') {
    // 뒤로 쓴 볼캡 (참고 이미지) — 둥근 정수리 + 뒤로 나온 챙
    const crown = mesh(new THREE.SphereGeometry(HEAD_R + 0.055, 48, 20, 0, Math.PI * 2, 0, Math.PI * 0.42), '#4f74c4');
    crown.scale.set(1, 0.9, 0.95);
    g.add(at(crown, 0, HEAD_Y + 0.04, 0));
    const brim = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.025, 32, 1, false, 0, Math.PI), '#3e5fa6');
    brim.rotation.y = Math.PI / 2;
    brim.scale.set(1, 1, 1.6);
    g.add(at(brim, 0, HEAD_Y + 0.17, -0.42));
    g.add(at(mesh(new THREE.SphereGeometry(0.03, 12, 10), '#3e5fa6'), 0, HEAD_Y + 0.47, 0));
  }
  if (eq.bag === 'acc-backpack') {
    const pack = mesh(new THREE.CapsuleGeometry(0.17, 0.16, 8, 20), '#45444c');
    pack.scale.set(1.1, 1, 0.6);
    g.add(at(pack, 0, 0.8, -0.24));
    // 어깨끈 — 어깨 위를 넘어 앞(몸통 안으로 숨음)에서 뒤(가방)로 걸치는 반원
    for (const s of [-1, 1]) {
      const strap = mesh(new THREE.TorusGeometry(0.16, 0.022, 8, 24, Math.PI), '#45444c');
      strap.rotation.y = Math.PI / 2;
      g.add(at(strap, s * 0.13, 0.84, -0.06));
    }
  }
}

/** 입힌 것대로 아바타 한 벌을 만든다. 바닥 그림자 받이는 따로(scene 쪽에서). */
export function buildAvatar(eq: Equipped, silhouette = SILHOUETTE): THREE.Group {
  const g = new THREE.Group();
  const skin = eq.skin ? (SKIN[eq.skin] ?? silhouette) : silhouette;
  buildLegs(g, eq.bottom, eq.shoes, silhouette, skin);
  buildTorso(g, eq.top, silhouette, skin);
  buildHead(g, skin, Boolean(eq.skin), eq.skin !== 'skin-4');
  buildHair(g, eq.hair, silhouette);
  buildAccessories(g, eq);
  return g;
}

/** 다 쓴 모양을 버린다 (재질은 같이 쓰므로 남긴다) */
export function disposeAvatar(g: THREE.Object3D): void {
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      if (o.material instanceof THREE.Material && !mats.has(keyOf(o.material))) o.material.dispose();
    }
  });
}

function keyOf(m: THREE.Material): string {
  if (m instanceof THREE.MeshStandardMaterial) return `#${m.color.getHexString()}|${m.roughness}`;
  return '';
}
