import { defineConfig } from 'vite';
import { resolve } from 'path';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  root: resolve(__dirname),
  plugins: [
    glsl({
      include: ['**/*.glsl', '**/*.vert', '**/*.frag'],
      compress: false,
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, '../../src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      // Allow serving files from the project root
      allow: [resolve(__dirname, '../..')],
    },
  },
  build: {
    outDir: resolve(__dirname, '../../dist-e2e'),
  },
});
