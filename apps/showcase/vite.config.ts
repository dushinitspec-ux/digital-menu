import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Одна IIFE-сборка: панель (React), рендерер, шрифты; build-html.mjs кладёт всё в один HTML-файл.
export default defineConfig({
  plugins: [react()],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  resolve: { dedupe: ['react', 'react-dom'] },
  build: {
    outDir: 'dist',
    cssCodeSplit: false,
    lib: {
      entry: 'src/main.tsx',
      formats: ['iife'],
      name: 'DigitalMenuShowcase',
      fileName: () => 'showcase.js',
    },
  },
});
