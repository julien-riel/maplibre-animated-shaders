import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import glsl from 'vite-plugin-glsl';

export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib';

  return {
    plugins: [
      glsl({
        include: ['**/*.glsl', '**/*.vert', '**/*.frag'],
        defaultExtension: 'glsl',
        compress: true,
      }),
      ...(isLib
        ? [
            dts({
              insertTypesEntry: true,
              include: ['src/**/*.ts'],
              exclude: ['src/**/*.test.ts', 'demo/**/*'],
            }),
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    build: isLib
      ? {
          lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'MapLibreGLShaders',
            formats: ['es', 'cjs'],
            fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
          },
          rollupOptions: {
            external: ['maplibre-gl'],
            output: {
              globals: {
                'maplibre-gl': 'maplibregl',
              },
            },
          },
          sourcemap: true,
          minify: 'esbuild',
        }
      : {
          outDir: 'dist-demo',
        },
    server: {
      port: 3000,
      open: true,
    },
  };
});
