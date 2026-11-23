import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // GitHub Pages 는 /<저장소이름>/ 아래로 서비스된다.
  // 다른 곳(Vercel 등)에 올릴 때는 '/' 로 바꾸면 된다.
  base: '/AI-class/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // 기본값은 js/css/html 뿐이라 글꼴과 노점 사진이 빠졌다.
        // 둘 다 없으면 오프라인에서 간판 글씨와 홈 배경이 사라진다.
        globPatterns: ['**/*.{js,css,html}', 'assets/*.woff2', 'images/stall-bg.png'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: '회기 후 감압',
        short_name: '감압',
        description:
          '회기 직후 반응을 기록하고 조절 기법을 안내받는 앱. 데이터는 기기에만 저장됩니다.',
        lang: 'ko',
        start_url: '/AI-class/',
        scope: '/AI-class/',
        display: 'standalone',
        background_color: '#f7f5f2',
        theme_color: '#f7f5f2',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
  },
});
