import { defineConfig } from 'vite';

// Страница открывается только в headless Chromium скрипта render.mjs — legacy-сборка не нужна.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
