import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/migrate.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  // Общий пакет — исходники на TypeScript, поэтому вшиваем его в сборку.
  noExternal: ['@dm/shared'],
});
