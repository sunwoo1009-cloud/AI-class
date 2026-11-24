import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/global.css';

/**
 * 새로 배포하면, 열자마자(10초 안에) 새 버전이 자리 잡을 때 한 번 새로 고친다.
 * 오프라인용으로 저장해 둔 옛 화면이 계속 보이는 일을 막는다.
 * 10초가 지난 뒤(체크인 중일 수 있음)에는 새로 고치지 않고 다음에 열 때 바뀐다.
 */
const openedAt = Date.now();
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded || Date.now() - openedAt > 10_000) return;
    reloaded = true;
    window.location.reload();
  });
}

const container = document.getElementById('root');
if (!container) throw new Error('#root 를 찾을 수 없습니다');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
