import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // Windows worker isolation has been unstable in this repo; a shared single thread keeps runs deterministic.
    pool: 'threads',
    isolate: false,
    fileParallelism: false,
    maxWorkers: 1,
    vmMemoryLimit: '4096MB',
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
