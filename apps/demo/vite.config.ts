import { defineConfig } from 'vite';

// Библиотечная сборка в IIFE: шрифты и стили инлайнятся, а build-html.mjs
// собирает всё в один HTML-файл, который открывается без сервера.
export default defineConfig({
  build: {
    outDir: 'dist',
    cssCodeSplit: false,
    lib: {
      entry: 'src/main.ts',
      formats: ['iife'],
      name: 'DigitalMenuDemo',
      fileName: () => 'demo.js',
    },
  },
});
