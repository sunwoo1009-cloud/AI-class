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
        // 무늬 종이(paper-tile)도 체크인 화면 배경이라 같이 넣는다.
        globPatterns: [
          '**/*.{js,css,html}',
          'assets/*.woff2',
          'assets/*.otf', // 원주체 Regular·Bold — 오프라인에서도 같은 글씨로
          'images/stall-bg.png',
          'images/paper-tile.png',
        ],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: '퇴근길 붕어빵 한 입',
        short_name: '붕어빵 한 입',
        description:
          '회기 직후 반응을 기록하고 조절 기법을 안내받는 앱. 데이터는 기기에만 저장됩니다.',
        lang: 'ko',
        start_url: '/AI-class/',
        scope: '/AI-class/',
        display: 'standalone',
        background_color: '#f4ece0',
        theme_color: '#f4ece0',
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
