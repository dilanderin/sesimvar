import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pictos/*', 'icon.svg'],
      manifest: {
        name: 'Sesim Var',
        short_name: 'Sesim Var',
        description: 'Resimlerle konuşma tahtası',
        lang: 'tr',
        start_url: '/',
        scope: '/',
        display: 'fullscreen',
        orientation: 'any',
        background_color: '#FFE9DA',
        theme_color: '#FFE9DA',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,mp3}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(api|static)\.arasaac\.org\//,
            handler: 'CacheFirst',
            options: { cacheName: 'arasaac', expiration: { maxEntries: 500 } },
          },
        ],
      },
    }),
  ],
  define: { __APP_VERSION__: JSON.stringify(new Date().toISOString().slice(0, 10)) },
  test: { environment: 'node' },
});
