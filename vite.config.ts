import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative base so the build works from any host path (Cloudflare Pages, GitHub Pages, …).
  base: './',
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Атлетика',
        short_name: 'Атлетика',
        description: 'Личные тренировочные программы',
        lang: 'ru',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#070706',
        theme_color: '#070706',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,webp,png,svg}'],
        // Russian UI: Greek and Vietnamese font subsets are never needed offline.
        globIgnores: ['**/*-{greek,vietnamese}-*.woff2'],
      },
    }),
  ],
});
