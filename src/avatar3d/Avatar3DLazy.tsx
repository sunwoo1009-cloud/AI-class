import { lazy, Suspense, useState } from 'react';
import { AvatarSvg } from '../avatar/Avatar';
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
