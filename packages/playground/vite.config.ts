import { defineConfig } from 'vite';
import { resolve } from 'path';
import monacoEditorPlugin from 'vite-plugin-monaco-editor';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  root: resolve(__dirname),
  base: '/playground/',
  resolve: {
    alias: {
      'maplibre-animated-shaders/types': resolve(__dirname, '../lib/src/types'),
      'maplibre-animated-shaders/plugins': resolve(__dirname, '../lib/src/plugins'),
      'maplibre-animated-shaders': resolve(__dirname, '../lib/src'),
    },
  },
  server: {
    port: 3001,
    open: true,
    fs: {
      // Allow serving files from workspace root and node_modules
      allow: ['../..'],
    },
  },
  build: {
    outDir: resolve(__dirname, '../../dist-playground'),
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  plugins: [
    glsl(),
    (monacoEditorPlugin as unknown as { default: typeof monacoEditorPlugin }).default({
      languageWorkers: ['editorWorkerService'],
      customWorkers: [],
    }),
  ],
});
