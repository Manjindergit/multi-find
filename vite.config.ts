import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest';

const alias = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [crx({ manifest })],
  resolve: {
    alias: {
      '@core': alias('./src/core'),
      '@content': alias('./src/content'),
      '@ui': alias('./src/ui'),
      '@background': alias('./src/background'),
      '@storage': alias('./src/storage'),
      '@types': alias('./src/types'),
      '@utils': alias('./src/utils'),
    },
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    emptyOutDir: true,
  },
});
