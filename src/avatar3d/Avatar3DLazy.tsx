import { lazy, Suspense, useEffect, useState } from 'react';
import { AvatarSvg, PREVIEW_VIEWBOX } from '../avatar/Avatar';
import type { Equipped } from '../avatar/Avatar';
import type { Slot } from '../lib/boutique';
import type { Avatar3DProps } from './Avatar3D';

const Avatar3D = lazy(() => import('./Avatar3D'));

/** WebGL 을 못 쓰는 기기면 2D 아바타로 */
function webglOk(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * 3D 아바타를 늦게 불러온다 (2026-11-27). three.js 가 커서(약 150KB) 옷장·마이페이지를 열 때만 받는다.
 * 받는 동안과 WebGL 이 없는 기기에서는 지금까지의 2D 아바타를 보여준다.
 */
export function Avatar3DLazy(props: Avatar3DProps & { fallbackClassName?: string }) {
  const [ok] = useState(webglOk);
  const fallback = (
    <AvatarSvg className={props.fallbackClassName} equipped={props.equipped} title={props.title} />
  );
  if (!ok) return fallback;
  return (
    <Suspense fallback={fallback}>
      <Avatar3D {...props} />
    </Suspense>
  );
}

/**
 * 옷장 아이템 칸 그림 (2026-11-27 3D). 보이지 않는 렌더러 하나가 그린 PNG 를 보여준다(avatar3d/thumbs.ts).
 * 그리기 전과 3D 를 못 쓰는 기기에서는 2D 그림.
 */
export function Thumb3D({ equipped, slot, className }: { equipped: Equipped; slot: Slot; className?: string }) {
  const [ok] = useState(webglOk);
  const [url, setUrl] = useState<string | null>(null);
  const key = JSON.stringify(equipped);
  useEffect(() => {
    if (!ok) return;
    let alive = true;
    void import('./thumbs')
      .then((m) => m.renderThumb(equipped, slot))
      .then((u) => {
        if (alive && u) setUrl(u);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok, key, slot]);
  if (url) return <img className={`${className ?? ''} thumb3d`} src={url} alt="" draggable={false} />;
  return <AvatarSvg className={className} viewBox={PREVIEW_VIEWBOX[slot]} equipped={equipped} mannequin />;
}
