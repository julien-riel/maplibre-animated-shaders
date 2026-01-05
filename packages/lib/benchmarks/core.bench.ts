/**
 * Core performance benchmarks
 *
 * Benchmarks for fundamental operations:
 * - Object pooling
 * - Animation loop
 * - Shader registry
 * - Config resolution
 */

import { bench, describe } from 'vitest';
import { PoolManager } from '../src/utils/object-pool';
import { AnimationLoop } from '../src/AnimationLoop';
import { ShaderRegistry } from '../src/ShaderRegistry';
import { ConfigResolver } from '../src/ConfigResolver';
import type { ShaderDefinition, ShaderConfig } from '../src/types';
import './setup';

// =============================================================================
// Object Pool Benchmarks
// =============================================================================

describe('ObjectPool', () => {
  const poolManager = PoolManager.getInstance();

  bench('acquire 1,000 points', () => {
    const points = [];
    for (let i = 0; i < 1000; i++) {
      points.push(poolManager.pointPool.acquire());
    }
    poolManager.pointPool.releaseAll(points);
  });

  bench('acquire 10,000 points', () => {
    const points = [];
    for (let i = 0; i < 10000; i++) {
      points.push(poolManager.pointPool.acquire());
    }
    poolManager.pointPool.releaseAll(points);
  });

  bench('acquire/release cycle 1,000 points', () => {
    for (let i = 0; i < 1000; i++) {
      const point = poolManager.pointPool.acquire();
      poolManager.pointPool.release(point);
    }
  });

  bench('acquire 1,000 segments', () => {
    const segments = [];
    for (let i = 0; i < 1000; i++) {
      segments.push(poolManager.segmentPool.acquire());
    }
    poolManager.segmentPool.releaseAll(segments);
  });

  bench('acquire 1,000 polygons', () => {
    const polygons = [];
    for (let i = 0; i < 1000; i++) {
      polygons.push(poolManager.polygonPool.acquire());
    }
    poolManager.polygonPool.releaseAll(polygons);
  });
});

// =============================================================================
// Animation Loop Benchmarks
// =============================================================================

describe('AnimationLoop', () => {
  bench('create and destroy', () => {
    const loop = new AnimationLoop();
    loop.destroy();
  });

  bench('add/remove 100 shaders', () => {
    const loop = new AnimationLoop();
    const callbacks: string[] = [];

    for (let i = 0; i < 100; i++) {
      const id = `shader-${i}`;
      callbacks.push(id);
      loop.addShader(id, () => {});
    }

    for (const id of callbacks) {
      loop.removeShader(id);
    }

    loop.destroy();
  });

  bench('tick with 50 shaders', () => {
    const loop = new AnimationLoop();
    let callCount = 0;

    for (let i = 0; i < 50; i++) {
      loop.addShader(`shader-${i}`, () => { callCount++; });
    }

    // Simulate 60 ticks
    for (let i = 0; i < 60; i++) {
      (loop as unknown as { tick: (time: number) => void }).tick(i * 16.67);
    }

    loop.destroy();
  });
});

// =============================================================================
// Shader Registry Benchmarks
// =============================================================================

describe('ShaderRegistry', () => {
  const createMockDefinition = (name: string): ShaderDefinition => ({
    name,
    displayName: name,
    description: `Test shader ${name}`,
    geometry: 'point',
    tags: ['test'],
    fragmentShader: 'void main() { gl_FragColor = vec4(1.0); }',
    defaultConfig: { color: '#ff0000', speed: 1, intensity: 0.8 },
    configSchema: {
      color: { type: 'color', default: '#ff0000' },
      speed: { type: 'number', min: 0.1, max: 10, default: 1 },
      intensity: { type: 'number', min: 0, max: 1, default: 0.8 },
    },
    getUniforms: (config: ShaderConfig) => ({
      u_color: [1, 0, 0, 1],
      u_speed: config.speed ?? 1,
      u_intensity: config.intensity ?? 0.8,
    }),
  });

  bench('register 100 shaders', () => {
    const registry = new ShaderRegistry();
    for (let i = 0; i < 100; i++) {
      registry.register(createMockDefinition(`shader-${i}`));
    }
  });

  bench('get shader by name (100 shaders)', () => {
    const registry = new ShaderRegistry();
    for (let i = 0; i < 100; i++) {
      registry.register(createMockDefinition(`shader-${i}`));
    }

    for (let i = 0; i < 100; i++) {
      registry.get(`shader-${i % 100}`);
    }
  });

  bench('list shaders by geometry', () => {
    const registry = new ShaderRegistry();
    const geometries = ['point', 'line', 'polygon', 'global'] as const;

    for (let i = 0; i < 100; i++) {
      const def = createMockDefinition(`shader-${i}`);
      def.geometry = geometries[i % 4];
      registry.register(def);
    }

    for (const geo of geometries) {
      registry.list(geo);
    }
  });
});

// =============================================================================
// Config Resolver Benchmarks
// =============================================================================

describe('ConfigResolver', () => {
  const resolver = new ConfigResolver();

  const schema = {
    color: { type: 'color' as const, default: '#ff0000' },
    speed: { type: 'number' as const, min: 0.1, max: 10, default: 1 },
    intensity: { type: 'number' as const, min: 0, max: 1, default: 0.8 },
    enabled: { type: 'boolean' as const, default: true },
    mode: { type: 'string' as const, default: 'normal' },
  };

  const defaults = {
    color: '#ff0000',
    speed: 1,
    intensity: 0.8,
    enabled: true,
    mode: 'normal',
  };

  bench('resolve config (simple)', () => {
    resolver.resolve(defaults, { color: '#00ff00' });
  });

  bench('resolve config (full override)', () => {
    resolver.resolve(defaults, {
      color: '#00ff00',
      speed: 2,
      intensity: 0.5,
      enabled: false,
      mode: 'alternate',
    });
  });

  bench('validate config', () => {
    resolver.validate({ color: '#00ff00', speed: 2, intensity: 0.5 }, schema);
  });

  bench('resolve + validate 1,000 configs', () => {
    for (let i = 0; i < 1000; i++) {
      const resolved = resolver.resolve(defaults, {
        color: `#${i.toString(16).padStart(6, '0')}`,
        speed: (i % 10) + 0.1,
        intensity: (i % 100) / 100,
      });
      resolver.validate(resolved, schema);
    }
  });
});
