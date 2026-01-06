import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ShaderManager, createShaderManager } from '../src/ShaderManager';
import { ShaderRegistry, globalRegistry } from '../src/ShaderRegistry';
import type { ShaderDefinition, MapLibreMapInstance } from '../src/types';

const createMockShader = (
  name: string,
  geometry: 'point' | 'line' | 'polygon' | 'global' = 'point'
): ShaderDefinition => ({
  name,
  geometry,
  description: `Mock ${name} shader`,
  tags: ['test'],
  defaultConfig: { color: '#ff0000', speed: 1.0 },
  configSchema: {
    color: { type: 'color' },
    speed: { type: 'number', min: 0.1, max: 5.0 },
  },
  fragmentShader: 'void main() { gl_FragColor = vec4(1.0); }',
  getUniforms: (config, time) => ({
    u_color: [1, 0, 0],
    u_time: time * (config.speed ?? 1),
  }),
});

const createMockMap = (): MapLibreMapInstance => ({
  getLayer: vi.fn().mockReturnValue({ source: 'test-source' }),
  addLayer: vi.fn(),
  removeLayer: vi.fn(),
  setPaintProperty: vi.fn(),
  setLayoutProperty: vi.fn(),
  triggerRepaint: vi.fn(),
  getSource: vi.fn(),
  querySourceFeatures: vi.fn().mockReturnValue([]),
  getCanvas: vi.fn().mockReturnValue({
    width: 800,
    height: 600,
    getContext: vi.fn(),
  }),
  transform: {
    zoom: 10,
    center: { lng: 0, lat: 0 },
  },
  on: vi.fn(),
  off: vi.fn(),
} as unknown as MapLibreMapInstance);

describe('ShaderManager', () => {
  let manager: ShaderManager;
  let mockMap: MapLibreMapInstance;

  beforeEach(() => {
    vi.useFakeTimers();
    mockMap = createMockMap();
    globalRegistry.clear();
    globalRegistry.register(createMockShader('pulse', 'point'));
    globalRegistry.register(createMockShader('flow', 'line'));
    globalRegistry.register(createMockShader('ripple', 'polygon'));
    manager = new ShaderManager(mockMap, { autoStart: false, debug: false });
  });

  afterEach(() => {
    manager.destroy();
    globalRegistry.clear();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create with default options', () => {
      const mgr = new ShaderManager(mockMap);
      expect(mgr).toBeInstanceOf(ShaderManager);
      mgr.destroy();
    });

    it('should create with custom options', () => {
      const mgr = new ShaderManager(mockMap, {
        targetFPS: 30,
        autoStart: false,
        debug: true,
      });
      expect(mgr).toBeInstanceOf(ShaderManager);
      mgr.destroy();
    });
  });

  describe('createShaderManager', () => {
    it('should create a ShaderManager instance', () => {
      const mgr = createShaderManager(mockMap);
      expect(mgr).toBeInstanceOf(ShaderManager);
      mgr.destroy();
    });
  });

  describe('register', () => {
    it('should register a shader on a layer', () => {
      manager.register('test-layer', 'pulse');
      expect(manager.getRegisteredLayers()).toContain('test-layer');
    });

    it('should throw for unknown shader', () => {
      expect(() => manager.register('test-layer', 'nonexistent')).toThrow(
        'not found'
      );
    });

    it('should throw for non-existent layer', () => {
      const noLayerMap = createMockMap();
      (noLayerMap.getLayer as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
      const mgr = new ShaderManager(noLayerMap, { autoStart: false });
      expect(() => mgr.register('missing-layer', 'pulse')).toThrow(
        'not found on map'
      );
      mgr.destroy();
    });

    it('should apply custom config', () => {
      manager.register('test-layer', 'pulse', { speed: 2.0 });
      const instance = manager.getInstance('test-layer');
      expect(instance?.config.speed).toBe(2.0);
    });

    it('should replace existing shader on same layer', () => {
      manager.register('test-layer', 'pulse');
      manager.register('test-layer', 'pulse', { speed: 3.0 });
      expect(manager.getRegisteredLayers()).toHaveLength(1);
      expect(manager.getInstance('test-layer')?.config.speed).toBe(3.0);
    });
  });

  describe('unregister', () => {
    it('should remove shader from layer', () => {
      manager.register('test-layer', 'pulse');
      manager.unregister('test-layer');
      expect(manager.getRegisteredLayers()).not.toContain('test-layer');
    });

    it('should handle unregistering non-existent layer', () => {
      // Should not throw
      manager.unregister('nonexistent');
      expect(manager.getRegisteredLayers()).toHaveLength(0);
    });
  });

  describe('play/pause', () => {
    beforeEach(() => {
      manager.register('test-layer', 'pulse');
    });

    it('should pause a specific layer', () => {
      manager.pause('test-layer');
      const instance = manager.getInstance('test-layer');
      expect(instance?.isPlaying).toBe(false);
    });

    it('should play a specific layer', () => {
      manager.pause('test-layer');
      manager.play('test-layer');
      const instance = manager.getInstance('test-layer');
      expect(instance?.isPlaying).toBe(true);
    });

    it('should pause all layers', () => {
      manager.register('test-layer-2', 'pulse');
      manager.pause();
      expect(manager.getInstance('test-layer')?.isPlaying).toBe(false);
      expect(manager.getInstance('test-layer-2')?.isPlaying).toBe(false);
    });

    it('should play all layers', () => {
      manager.register('test-layer-2', 'pulse');
      manager.pause();
      manager.play();
      expect(manager.getInstance('test-layer')?.isPlaying).toBe(true);
      expect(manager.getInstance('test-layer-2')?.isPlaying).toBe(true);
    });
  });

  describe('setSpeed', () => {
    it('should set speed for a layer', () => {
      manager.register('test-layer', 'pulse');
      manager.setSpeed('test-layer', 2.5);
      expect(manager.getInstance('test-layer')?.speed).toBe(2.5);
    });

    it('should clamp negative speed to 0', () => {
      manager.register('test-layer', 'pulse');
      manager.setSpeed('test-layer', -1);
      expect(manager.getInstance('test-layer')?.speed).toBe(0);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      manager.register('test-layer', 'pulse');
      manager.updateConfig('test-layer', { color: '#00ff00' });
      expect(manager.getInstance('test-layer')?.config.color).toBe('#00ff00');
    });

    it('should throw for non-registered layer', () => {
      expect(() => manager.updateConfig('nonexistent', {})).toThrow(
        'No shader registered'
      );
    });

    it('should update speed through config', () => {
      manager.register('test-layer', 'pulse');
      manager.updateConfig('test-layer', { speed: 4.0 });
      expect(manager.getInstance('test-layer')?.speed).toBe(4.0);
    });

    it('should update enabled through config', () => {
      manager.register('test-layer', 'pulse');
      manager.updateConfig('test-layer', { enabled: false });
      expect(manager.getInstance('test-layer')?.isPlaying).toBe(false);
    });
  });

  describe('getRegisteredLayers', () => {
    it('should return empty array when no shaders registered', () => {
      expect(manager.getRegisteredLayers()).toEqual([]);
    });

    it('should return all registered layer IDs', () => {
      manager.register('layer-1', 'pulse');
      manager.register('layer-2', 'pulse');
      const layers = manager.getRegisteredLayers();
      expect(layers).toContain('layer-1');
      expect(layers).toContain('layer-2');
      expect(layers).toHaveLength(2);
    });
  });

  describe('getInstance', () => {
    it('should return instance for registered layer', () => {
      manager.register('test-layer', 'pulse');
      const instance = manager.getInstance('test-layer');
      expect(instance).toBeDefined();
      expect(instance?.layerId).toBe('test-layer');
    });

    it('should return undefined for non-registered layer', () => {
      expect(manager.getInstance('nonexistent')).toBeUndefined();
    });
  });

  describe('setGlobalSpeed', () => {
    it('should set global animation speed', () => {
      manager.setGlobalSpeed(2.0);
      // Speed is applied internally, mainly test it doesn't throw
      expect(manager.getTime()).toBe(0);
    });
  });

  describe('getTime', () => {
    it('should return animation time', () => {
      expect(manager.getTime()).toBe(0);
    });
  });

  describe('destroy', () => {
    it('should clean up all resources', () => {
      manager.register('layer-1', 'pulse');
      manager.register('layer-2', 'pulse');
      manager.destroy();
      expect(manager.getRegisteredLayers()).toHaveLength(0);
    });
  });
});
