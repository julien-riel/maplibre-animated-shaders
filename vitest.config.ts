import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/lib/tests/**/*.test.ts'],
    setupFiles: ['./packages/lib/tests/setup.ts'],
    exclude: ['node_modules', 'dist', 'dist-demo'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/lib/src/**/*.ts'],
      exclude: [
        'packages/lib/src/**/*.test.ts',
        'packages/lib/src/**/index.ts',
        'packages/lib/src/types/**',
        'packages/lib/src/glsl/**/*.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 70,
        branches: 70,
        statements: 80,
      },
    },
    // Benchmark configuration
    benchmark: {
      include: ['packages/lib/benchmarks/**/*.bench.ts'],
      exclude: ['node_modules', 'dist'],
      reporters: ['default'],
      outputJson: 'benchmark-results.json',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './packages/lib/src'),
      'maplibre-animated-shaders': resolve(__dirname, './packages/lib/src'),
    },
  },
});
