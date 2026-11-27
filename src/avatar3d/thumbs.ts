import * as THREE from 'three';
import type { Equipped } from '../avatar/Avatar';
import type { Slot } from '../lib/boutique';
import { buildAvatar, disposeAvatar } from './buildAvatar';

/**
 * 옷장 아이템 칸 그림을 3D 로 (2026-11-27).
 *
 * 브라우저는 3D 캔버스를 한 화면에 16개쯤까지만 띄운다. 그래서 칸마다 캔버스를 두지 않고,
 * **보이지 않는 렌더러 하나**로 칸 그림을 차례로 그려 이미지(PNG 주소)로 돌려준다.
 * 같은 모습은 다시 그리지 않는다(캐시).
 */

const SIZE = 200;

/** 아이템 종류마다 어디를 비출지 — 겨냥점 높이, 거리, 돌린 각도 */
const FRAME: Record<Slot, { y: number; dist: number; turn?: number }> = {
  skin: { y: 1.34, dist: 2.3 },
  hair: { y: 1.38, dist: 2.5, turn: 25 },
  glasses: { y: 1.36, dist: 2.0 },
  hat: { y: 1.48, dist: 2.4, turn: 30 },
  top: { y: 0.86, dist: 2.9 },
  neck: { y: 0.98, dist: 2.2 },
  bag: { y: 0.92, dist: 2.9, turn: 150 },
  bottom: { y: 0.42, dist: 2.7 },
  shoes: { y: 0.12, dist: 1.6, turn: 25 },
};

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let pivot: THREE.Group;

function setup(): boolean {
  if (renderer) return true;
  try {
    const canvas = document.createElement('canvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  } catch {
    return false;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(SIZE, SIZE, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(26, 1, 0.1, 30);
  scene.add(new THREE.HemisphereLight('#fff6ea', '#7a6a58', 1.3));
  const key = new THREE.DirectionalLight('#fff1de', 2.0);
  key.position.set(-2.2, 3.4, 3.2);
  scene.add(key);
  const fill = new THREE.DirectionalLight('#e8eefc', 0.7);
  fill.position.set(2.5, 1.5, 1.5);
  scene.add(fill);
  pivot = new THREE.Group();
  scene.add(pivot);
  return true;
}

const cache = new Map<string, string>();
let queue: Promise<unknown> = Promise.resolve();

/** 그 모습 그대로 한 칸 그림을 그려 PNG 주소로. 3D 를 못 쓰면 null. */
export function renderThumb(equipped: Equipped, slot: Slot): Promise<string | null> {
  const key = `${slot}|${JSON.stringify(equipped)}`;
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  // 한 번에 하나씩 — 렌더러 하나를 나눠 쓴다. 칸 사이에 숨을 돌려 화면이 굳지 않게 한다.
  const job = queue.then(
    () =>
      new Promise<string | null>((resolve) => {
        window.setTimeout(() => {
          if (!setup() || !renderer) return resolve(null);
          const again = cache.get(key);
          if (again) return resolve(again);
          const f = FRAME[slot];
          const avatar = buildAvatar(equipped, { mannequin: true });
          pivot.rotation.y = ((f.turn ?? 0) * Math.PI) / 180;
          pivot.add(avatar);
          camera.position.set(0, f.y + 0.08, f.dist);
          camera.lookAt(0, f.y, 0);
          renderer.render(scene, camera);
          const url = renderer.domElement.toDataURL('image/png');
          pivot.remove(avatar);
          disposeAvatar(avatar);
          if (cache.size > 300) cache.clear();
          cache.set(key, url);
          resolve(url);
        }, 0);
      }),
  );
  queue = job.catch(() => null);
  return job;
}
