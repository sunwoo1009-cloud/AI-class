import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: '회기 후 감압',
        short_name: '감압',
        description:
          '회기 직후 반응을 기록하고 조절 기법을 안내받는 앱. 데이터는 기기에만 저장됩니다.',
        lang: 'ko',
        start_url: '/',
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
