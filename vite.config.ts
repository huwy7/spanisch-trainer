import { execSync } from 'node:child_process';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the app under /<repo>/
const BASE = '/spanisch-trainer/';

function appVersion(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      // 'prompt': an update never reloads the page in the middle of a session.
      registerType: 'prompt',
      // Icons and the manifest are already covered by globPatterns / added by the plugin.
      includeManifestIcons: false,
      manifest: {
        name: 'Spanisch-Trainer',
        short_name: 'Spanisch',
        description:
          'Persönlicher Spanisch-Trainer: Konjugation, Subjuntivo, Sätze, Vokabeln, Phrasen.',
        lang: 'de',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f6f5f2',
        theme_color: '#f6f5f2',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell + verb data (~0.7 MB). Larger chunks get lazy loading in M3.
        globPatterns: ['**/*.{js,css,html,svg,png}', 'data/verbs.json'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion()),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
