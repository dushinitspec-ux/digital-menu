import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  build: { outDir: 'dist' },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/media': 'http://localhost:3000',
      '/player': 'http://localhost:3000',
    },
  },
});
