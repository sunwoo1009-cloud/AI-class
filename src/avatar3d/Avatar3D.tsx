import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Equipped } from '../avatar/Avatar';
import { buildAvatar, buildRoom, disposeAvatar } from './buildAvatar';

export interface Avatar3DProps {
  equipped: Equipped;
  /** 옷장 — 손가락으로 끌어 돌린다(뒷모습까지). 없으면 앞모습 한 장 */
  rotatable?: boolean;
  className?: string;
  title?: string;
  /** 처음 돌아가 있는 각도(도) — 확인용 화면에서 뒷모습을 바로 보려고 */
  angle?: number;
  /** 집 안 옷장 앞 배경 (옷장 무대) */
  room?: boolean;
}

const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * 3D 아바타 화면 (2026-11-27). three.js 는 이 파일을 쓰는 화면을 열 때만 불러온다(Avatar3DLazy).
 *
 * - 옷장(rotatable): 좌우로 끌면 돌아가고, 놓으면 살살 멈춘다. ‹ › 버튼으로 45도씩.
 * - 마이페이지: 돌리지 않고 앞모습. 그릴 일이 있을 때만 그린다(계속 돌지 않는다).
 */
export default function Avatar3D({
  equipped,
  rotatable = false,
  className,
  title,
  angle = 0,
  room = false,
}: Avatar3DProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const api = useRef<{
    setEquipped: (e: Equipped) => void;
    turn: (deg: number) => void;
  } | null>(null);

  // 장면은 한 번만 만든다
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
    camera.position.set(0, 1.1, 4.8);
    camera.lookAt(0, 0.9, 0);

    // 부드러운 스튜디오 빛 — 위에서 감싸는 빛 + 왼쪽 앞 주광 + 오른쪽 보조광
    scene.add(new THREE.HemisphereLight('#fff6ea', '#7a6a58', 1.25));
    const key = new THREE.DirectionalLight('#fff1de', 2.1);
    key.position.set(-2.2, 3.4, 3.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -1.5;
    key.shadow.camera.right = 1.5;
    key.shadow.camera.top = 2.5;
    key.shadow.camera.bottom = -0.5;
    key.shadow.radius = 6;
    key.shadow.bias = -0.0005;
    scene.add(key);
    const fill = new THREE.DirectionalLight('#e8eefc', 0.7);
    fill.position.set(2.5, 1.5, 1.5);
    scene.add(fill);
    const rim = new THREE.DirectionalLight('#fff', 0.6);
    rim.position.set(0, 2.5, -3);
    scene.add(rim);

    // 배경 — 옷장 무대는 집 안 옷장 앞, 그 밖에는 바닥 그림자만 받는 투명한 판
    const ground = new THREE.Mesh(new THREE.CircleGeometry(1.2, 48), new THREE.ShadowMaterial({ opacity: 0.18 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    let backdrop: THREE.Group | null = null;
    if (room) {
      backdrop = buildRoom();
      scene.add(backdrop);
      key.shadow.camera.left = -3;
      key.shadow.camera.right = 3;
      key.shadow.camera.top = 3.2;
      key.shadow.camera.bottom = -1;
      key.shadow.camera.far = 14;
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.camera.updateProjectionMatrix();
      // 방 안이라 조금 물러서서 옷장이 보이게
      camera.position.set(0, 1.2, 5.4);
      camera.lookAt(0, 0.98, 0);
    } else {
      scene.add(ground);
    }

    const pivot = new THREE.Group();
    pivot.rotation.y = (angle * Math.PI) / 180;
    scene.add(pivot);
    let avatar: THREE.Group | null = null;

    let frame = 0;
    const render = () => renderer.render(scene, camera);
    const requestRender = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    // 돌리기 — 끌면 따라오고, 놓으면 관성으로 살살 멈춘다
    let velocity = 0;
    let target: number | null = null;
    function tick() {
      frame = 0;
      let again = false;
      if (target !== null) {
        const d = target - pivot.rotation.y;
        pivot.rotation.y += d * 0.18;
        if (Math.abs(d) < 0.002) {
          pivot.rotation.y = target;
          target = null;
        } else again = true;
      } else if (Math.abs(velocity) > 0.0005) {
        pivot.rotation.y += velocity;
        velocity *= 0.92;
        again = true;
      }
      render();
      if (again) requestRender();
    }

    function resize() {
      // 바깥 칸에는 버튼 자리 여백이 있어서, 실제로 그려지는 캔버스 크기를 잰다
      const w = canvas!.clientWidth;
      const h = canvas!.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      requestRender();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    api.current = {
      setEquipped(e) {
        if (avatar) {
          pivot.remove(avatar);
          disposeAvatar(avatar);
        }
        avatar = buildAvatar(e);
        pivot.add(avatar);
        requestRender();
      },
      turn(deg) {
        velocity = 0;
        const base = target ?? pivot.rotation.y;
        target = base + (deg * Math.PI) / 180;
        if (reduceMotion()) {
          pivot.rotation.y = target;
          target = null;
        }
        requestRender();
      },
    };

    // 끌어서 돌리기
    let dragging = false;
    let lastX = 0;
    const onDown = (e: PointerEvent) => {
      if (!rotatable) return;
      dragging = true;
      lastX = e.clientX;
      velocity = 0;
      target = null;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      const step = dx * 0.012;
      pivot.rotation.y += step;
      velocity = step;
      requestRender();
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      if (reduceMotion()) velocity = 0;
      requestRender();
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      if (avatar) disposeAvatar(avatar);
      if (backdrop) disposeAvatar(backdrop);
      ground.geometry.dispose();
      renderer.dispose();
      api.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotatable, room]);

  // 입힌 것이 바뀌면 다시 만든다
  const eqKey = JSON.stringify(equipped);
  useEffect(() => {
    api.current?.setEquipped(equipped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eqKey, rotatable]);

  return (
    <div
      ref={wrapRef}
      className={`avatar3d${rotatable ? ' is-rotatable' : ''}${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={title ?? '아바타'}
    >
      <canvas ref={canvasRef} />
      {rotatable ? (
        <div className="avatar3d-turn">
          <button type="button" aria-label="왼쪽으로 돌리기" onClick={() => api.current?.turn(-45)}>
            ‹
          </button>
          <span className="avatar3d-hint">좌우로 끌어 돌려 보세요</span>
          <button type="button" aria-label="오른쪽으로 돌리기" onClick={() => api.current?.turn(45)}>
            ›
          </button>
        </div>
      ) : null}
    </div>
  );
}
