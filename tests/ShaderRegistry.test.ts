import { describe, it, expect, beforeEach } from 'vitest';
import { ShaderRegistry } from '../src/ShaderRegistry';
import type { ShaderDefinition } from '../src/types';

const createMockShader = (
  name: string,
  geometry: 'point' | 'line' | 'polygon' | 'global' = 'point',
  tags: string[] = []
): ShaderDefinition => ({
  name,
  geometry,
  description: `Mock ${name} shader`,
  tags,
  defaultConfig: { color: '#ff0000' },
  configSchema: { color: { type: 'color' } },
  fragmentShader: 'void main() {}',
  getUniforms: () => ({}),
});

describe('ShaderRegistry', () => {
  let registry: ShaderRegistry;

  beforeEach(() => {
    registry = new ShaderRegistry();
  });

  describe('register', () => {
    it('should register a shader', () => {
      const shader = createMockShader('pulse');
      registry.register(shader);
      expect(registry.has('pulse')).toBe(true);
    });

    it('should overwrite existing shader with same name', () => {
      const shader1 = createMockShader('pulse', 'point');
      const shader2 = createMockShader('pulse', 'line');
      registry.register(shader1);
      registry.register(shader2);
      expect(registry.get('pulse')?.geometry).toBe('line');
    });

    it('should handle multiple shaders', () => {
      registry.register(createMockShader('pulse'));
      registry.register(createMockShader('glow'));
      registry.register(createMockShader('flow'));
      expect(registry.size).toBe(3);
    });
  });

  describe('get', () => {
    it('should return registered shader', () => {
      const shader = createMockShader('pulse');
      registry.register(shader);
      expect(registry.get('pulse')).toBe(shader);
    });

    it('should return undefined for non-existent shader', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for registered shader', () => {
      registry.register(createMockShader('pulse'));
      expect(registry.has('pulse')).toBe(true);
    });

    it('should return false for non-existent shader', () => {
      expect(registry.has('nonexistent')).toBe(false);
    });
  });

  describe('list', () => {
    beforeEach(() => {
      registry.register(createMockShader('pulse', 'point'));
      registry.register(createMockShader('glow', 'point'));
      registry.register(createMockShader('flow', 'line'));
      registry.register(createMockShader('ripple', 'polygon'));
    });

    it('should list all shader names without filter', () => {
      const names = registry.list();
      expect(names).toHaveLength(4);
      expect(names).toContain('pulse');
      expect(names).toContain('glow');
      expect(names).toContain('flow');
      expect(names).toContain('ripple');
    });

    it('should filter by geometry type', () => {
      expect(registry.list('point')).toEqual(['pulse', 'glow']);
      expect(registry.list('line')).toEqual(['flow']);
      expect(registry.list('polygon')).toEqual(['ripple']);
      expect(registry.list('global')).toEqual([]);
    });
  });

  describe('getAll', () => {
    it('should return all shader definitions', () => {
      registry.register(createMockShader('pulse'));
      registry.register(createMockShader('glow'));
      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all.map((s) => s.name)).toContain('pulse');
      expect(all.map((s) => s.name)).toContain('glow');
    });

    it('should return empty array when no shaders registered', () => {
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe('getByGeometry', () => {
    beforeEach(() => {
      registry.register(createMockShader('pulse', 'point'));
      registry.register(createMockShader('glow', 'point'));
      registry.register(createMockShader('flow', 'line'));
    });

    it('should return shaders matching geometry', () => {
      const points = registry.getByGeometry('point');
      expect(points).toHaveLength(2);
      expect(points.every((s) => s.geometry === 'point')).toBe(true);
    });

    it('should return empty array for no matches', () => {
      expect(registry.getByGeometry('global')).toEqual([]);
    });
  });

  describe('getByTag', () => {
    beforeEach(() => {
      registry.register(createMockShader('pulse', 'point', ['animation', 'pulse']));
      registry.register(createMockShader('glow', 'point', ['glow', 'effect']));
      registry.register(createMockShader('flow', 'line', ['animation', 'flow']));
    });

    it('should return shaders matching tag', () => {
      const animated = registry.getByTag('animation');
      expect(animated).toHaveLength(2);
      expect(animated.map((s) => s.name)).toContain('pulse');
      expect(animated.map((s) => s.name)).toContain('flow');
    });

    it('should return empty array for no matches', () => {
      expect(registry.getByTag('nonexistent')).toEqual([]);
    });
  });

  describe('unregister', () => {
    it('should remove registered shader', () => {
      registry.register(createMockShader('pulse'));
      expect(registry.unregister('pulse')).toBe(true);
      expect(registry.has('pulse')).toBe(false);
    });

    it('should return false for non-existent shader', () => {
      expect(registry.unregister('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all shaders', () => {
      registry.register(createMockShader('pulse'));
      registry.register(createMockShader('glow'));
      registry.clear();
      expect(registry.size).toBe(0);
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe('size', () => {
    it('should return correct count', () => {
      expect(registry.size).toBe(0);
      registry.register(createMockShader('pulse'));
      expect(registry.size).toBe(1);
      registry.register(createMockShader('glow'));
      expect(registry.size).toBe(2);
      registry.unregister('pulse');
      expect(registry.size).toBe(1);
    });
  });
});
