import { defineConfig } from 'vite';
import { resolve } from 'path';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  root: resolve(__dirname),
  resolve: {
    alias: {
      '@lib': resolve(__dirname, '../src'),
    },
  },
  json: {
    stringify: false,
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: resolve(__dirname, '../dist-demo'),
    emptyOutDir: true,
  },
  plugins: [
    // Handle GLSL shader files
    glsl(),
    // Handle .geojson files as JSON
    {
      name: 'geojson-loader',
      transform(code, id) {
        if (id.endsWith('.geojson')) {
          return {
            code: `export default ${code}`,
            map: null,
          };
        }
      },
    },
  ],
});
