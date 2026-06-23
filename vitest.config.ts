import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

const alias = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Standalone Vitest config (no crx plugin) so unit tests run against the
// DOM-free core and storage layers without the extension build pipeline.
export default defineConfig({
  resolve: {
    alias: {
      '@core': alias('./src/core'),
      '@storage': alias('./src/storage'),
      '@types': alias('./src/types'),
      '@utils': alias('./src/utils'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
