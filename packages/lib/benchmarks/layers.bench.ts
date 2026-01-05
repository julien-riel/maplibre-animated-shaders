/**
 * Layer performance benchmarks
 *
 * Benchmarks for shader layer operations:
 * - Layer creation
 * - Data processing (feature → vertex data)
 * - Buffer building
 * - Render cycles
 */

import { bench, describe } from 'vitest';
import { PointShaderLayer } from '../src/layers/PointShaderLayer';
import { LineShaderLayer } from '../src/layers/LineShaderLayer';
import { PolygonShaderLayer } from '../src/layers/PolygonShaderLayer';
import type { ShaderDefinition } from '../src/types';
import {
  generatePointFeatures,
  generateLineFeatures,
  generatePolygonFeatures,
  createMockWebGLContext,
  createMockMap,
} from './setup';

// =============================================================================
// Mock Shader Definition
// =============================================================================

const createMockShaderDefinition = (geometry: 'point' | 'line' | 'polygon'): ShaderDefinition => ({
  name: `test-${geometry}`,
  displayName: `Test ${geometry}`,
  description: `Test shader for ${geometry}`,
  geometry,
  tags: ['test'],
  fragmentShader: `
    precision mediump float;
    varying vec2 v_pos;
    uniform float u_time;
    uniform vec4 u_color;
    void main() {
      gl_FragColor = u_color;
    }
  `,
  defaultConfig: {
    color: '#ff0000',
    speed: 1,
    intensity: 0.8,
  },
  configSchema: {
    color: { type: 'color', default: '#ff0000' },
    speed: { type: 'number', min: 0.1, max: 10, default: 1 },
    intensity: { type: 'number', min: 0, max: 1, default: 0.8 },
  },
  getUniforms: (config) => ({
    u_color: [1, 0, 0, 1],
    u_color_vec4: [1, 0, 0, 1],
    u_speed: config.speed ?? 1,
    u_intensity: config.intensity ?? 0.8,
  }),
});

// =============================================================================
// Point Layer Benchmarks
// =============================================================================

describe('PointShaderLayer', () => {
  const definition = createMockShaderDefinition('point');
  const gl = createMockWebGLContext();

  bench('create layer', () => {
    new PointShaderLayer('test-layer', 'test-source', definition, {});
  });

  bench('onAdd with 100 points', () => {
    const features = generatePointFeatures(100);
    const map = createMockMap(features);
    const layer = new PointShaderLayer('test-layer', 'test-source', definition, {});

    layer.onAdd(map as unknown as maplibregl.Map, gl);
    layer.onRemove(map as unknown as maplibregl.Map, gl);
  });

  bench('onAdd with 1,000 points', () => {
    const features = generatePointFeatures(1000);
    const map = createMockMap(features);
    const layer = new PointShaderLayer('test-layer', 'test-source', definition, {});

    layer.onAdd(map as unknown as maplibregl.Map, gl);
    layer.onRemove(map as unknown as maplibregl.Map, gl);
  });

  bench('onAdd with 10,000 points', () => {
    const features = generatePointFeatures(10000);
    const map = createMockMap(features);
    const layer = new PointShaderLayer('test-layer', 'test-source', definition, {});

    layer.onAdd(map as unknown as maplibregl.Map, gl);
    layer.onRemove(map as unknown as maplibregl.Map, gl);
  });

  bench('render cycle (1,000 points)', () => {
    const features = generatePointFeatures(1000);
    const map = createMockMap(features);
    const layer = new PointShaderLayer('test-layer', 'test-source', definition, {});
    const matrix = new Float32Array(16);

    layer.onAdd(map as unknown as maplibregl.Map, gl);

    // Simulate 60 render cycles
    for (let i = 0; i < 60; i++) {
      layer.render(gl, matrix);
    }

    layer.onRemove(map as unknown as maplibregl.Map, gl);
  });

  bench('updateConfig (1,000 points)', () => {
    const features = generatePointFeatures(1000);
    const map = createMockMap(features);
    const layer = new PointShaderLayer('test-layer', 'test-source', definition, {});

    layer.onAdd(map as unknown as maplibregl.Map, gl);

    for (let i = 0; i < 100; i++) {
      layer.updateConfig({ color: `#${(i * 1000).toString(16).padStart(6, '0')}` });
    }

    layer.onRemove(map as unknown as maplibregl.Map, gl);
  });
});

// =============================================================================
// Line Layer Benchmarks
// =============================================================================

describe('LineShaderLayer', () => {
  const definition = createMockShaderDefinition('line');
  const gl = createMockWebGLContext();

  bench('create layer', () => {
    new LineShaderLayer('test-layer', 'test-source', definition, {});
  });

  bench('onAdd with 100 lines (10 pts each)', () => {
    const features = generateLineFeatures(100, 10);
    const map = createMockMap(features);
    const layer = new LineShaderLayer('test-layer', 'test-source', definition, {});

    layer.onAdd(map as unknown as maplibregl.Map, gl);
    layer.onRemove(map as unknown as maplibregl.Map, gl);
  });

  bench('onAdd with 1,000 lines (10 pts each)', () => {
    const features = generateLineFeatures(1000, 10);
    const map = createMockMap(features);
    const layer = new LineShaderLayer('test-layer', 'test-source', definition, {});

    layer.onAdd(map as unknown as maplibregl.Map, gl);
    layer.onRemove(map as unknown as maplibregl.Map, gl);
  });

  bench('onAdd with 100 lines (100 pts each)', () => {
    const features = generateLineFeatures(100, 100);
    const map = createMockMap(features);
    const layer = new LineShaderLayer('test-layer', 'test-source', definition, {});

    layer.onAdd(map as unknown as maplibregl.Map, gl);
    layer.onRemove(map as unknown as maplibregl.Map, gl);
  });

  bench('render cycle (1,000 lines)', () => {
    const features = generateLineFeatures(1000, 10);
    const map = createMockMap(features);
    const layer = new LineShaderLayer('test-layer', 'test-source', definition, {});
    const matrix = new Float32Array(16);

    layer.onAdd(map as unknown as maplibregl.Map, gl);

    for (let i = 0; i < 60; i++) {
      layer.render(gl, matrix);
    }

    layer.onRemove(map as unknown as maplibregl.Map, gl);
  });
});

// =============================================================================
// Polygon Layer Benchmarks
// =============================================================================

describe('PolygonShaderLayer', () => {
  const definition = createMockShaderDefinition('polygon');
  const gl = createMockWebGLContext();

  bench('create layer', () => {
    new PolygonShaderLayer('test-layer', 'test-source', definition, {});
  });

  bench('onAdd with 100 polygons (6 vertices)', () => {
    const features = generatePolygonFeatures(100, 6);
    const map = createMockMap(features);
    const layer = new PolygonShaderLayer('test-layer', 'test-source', definition, {});

    layer.onAdd(map as unknown as maplibregl.Map, gl);
    layer.onRemove(map as unknown as maplibregl.Map, gl);
  });

  bench('onAdd with 1,000 polygons (6 vertices)', () => {
    const features = generatePolygonFeatures(1000, 6);
    const map = createMockMap(features);
    const layer = new PolygonShaderLayer('test-layer', 'test-source', definition, {});

    layer.onAdd(map as unknown as maplibregl.Map, gl);
    layer.onRemove(map as unknown as maplibregl.Map, gl);
  });

  bench('onAdd with 100 polygons (20 vertices)', () => {
    const features = generatePolygonFeatures(100, 20);
    const map = createMockMap(features);
    const layer = new PolygonShaderLayer('test-layer', 'test-source', definition, {});

    layer.onAdd(map as unknown as maplibregl.Map, gl);
    layer.onRemove(map as unknown as maplibregl.Map, gl);
  });

  bench('render cycle (1,000 polygons)', () => {
    const features = generatePolygonFeatures(1000, 6);
    const map = createMockMap(features);
    const layer = new PolygonShaderLayer('test-layer', 'test-source', definition, {});
    const matrix = new Float32Array(16);

    layer.onAdd(map as unknown as maplibregl.Map, gl);

    for (let i = 0; i < 60; i++) {
      layer.render(gl, matrix);
    }

    layer.onRemove(map as unknown as maplibregl.Map, gl);
  });

  bench('triangulation (complex polygon 50 vertices)', () => {
    const features = generatePolygonFeatures(100, 50);
    const map = createMockMap(features);
    const layer = new PolygonShaderLayer('test-layer', 'test-source', definition, {});

    layer.onAdd(map as unknown as maplibregl.Map, gl);
    layer.onRemove(map as unknown as maplibregl.Map, gl);
  });
});

// =============================================================================
// Comparison Benchmarks
// =============================================================================

describe('Layer Comparison', () => {
  const gl = createMockWebGLContext();
  const matrix = new Float32Array(16);

  bench('1,000 points - full lifecycle', () => {
    const features = generatePointFeatures(1000);
    const map = createMockMap(features);
    const definition = createMockShaderDefinition('point');
    const layer = new PointShaderLayer('test-layer', 'test-source', definition, {});

    layer.onAdd(map as unknown as maplibregl.Map, gl);
    for (let i = 0; i < 10; i++) {
      layer.render(gl, matrix);
    }
    layer.onRemove(map as unknown as maplibregl.Map, gl);
  });

  bench('1,000 lines - full lifecycle', () => {
    const features = generateLineFeatures(1000, 10);
    const map = createMockMap(features);
    const definition = createMockShaderDefinition('line');
    const layer = new LineShaderLayer('test-layer', 'test-source', definition, {});

    layer.onAdd(map as unknown as maplibregl.Map, gl);
    for (let i = 0; i < 10; i++) {
      layer.render(gl, matrix);
    }
    layer.onRemove(map as unknown as maplibregl.Map, gl);
  });

  bench('1,000 polygons - full lifecycle', () => {
    const features = generatePolygonFeatures(1000, 6);
    const map = createMockMap(features);
    const definition = createMockShaderDefinition('polygon');
    const layer = new PolygonShaderLayer('test-layer', 'test-source', definition, {});

    layer.onAdd(map as unknown as maplibregl.Map, gl);
    for (let i = 0; i < 10; i++) {
      layer.render(gl, matrix);
    }
    layer.onRemove(map as unknown as maplibregl.Map, gl);
  });
});
