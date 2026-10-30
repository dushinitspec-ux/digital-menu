import legacy from '@vitejs/plugin-legacy';
import { defineConfig } from 'vite';

// Плеер должен запускаться в старых WebView дешёвых Android-приставок и в браузерах ТВ
// (webOS 4 — Chromium 53, Tizen 4 — Chromium 56), где нет ES-модулей: legacy-сборка с полифиллами.
export default defineConfig({
  base: '/player/',
  plugins: [
    legacy({
      targets: ['chrome >= 53', 'android >= 5', 'safari >= 11'],
      modernPolyfills: true,
    }),
  ],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: false },
      '/media': 'http://localhost:3000',
    },
  },
});
