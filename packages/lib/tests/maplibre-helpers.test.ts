/**
 * Tests for MapLibre helper utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getLayerCenter,
  layerExists,
  getLayerGeometryType,
  waitForMapLoad,
  waitForLayer,
  getZoom,
  getCanvasSize,
} from '../src/utils/maplibre-helpers';
import type { MapLibreMapInstance } from '../src/types';

/**
 * Create a mock MapLibre map instance
 */
function createMockMap(options: {
  loaded?: boolean;
  layers?: Record<string, { type: string }>;
  features?: Array<{ geometry: { type: string; coordinates: [number, number] } }>;
  zoom?: number;
  canvasWidth?: number;
  canvasHeight?: number;
} = {}): MapLibreMapInstance {
  const {
    loaded = true,
    layers = {},
    features = [],
    zoom = 10,
    canvasWidth = 800,
    canvasHeight = 600,
  } = options;

  const eventHandlers: Record<string, Array<() => void>> = {};

  return {
    loaded: vi.fn(() => loaded),
    getLayer: vi.fn((id: string) => layers[id]),
    queryRenderedFeatures: vi.fn(() => features),
    project: vi.fn((coords: [number, number]) => ({ x: coords[0] * 100, y: coords[1] * 100 })),
    getZoom: vi.fn(() => zoom),
    getCanvas: vi.fn(() => ({ width: canvasWidth, height: canvasHeight })),
    on: vi.fn((event: string, handler: () => void) => {
      if (!eventHandlers[event]) eventHandlers[event] = [];
      eventHandlers[event].push(handler);
    }),
    off: vi.fn((event: string, handler: () => void) => {
      if (eventHandlers[event]) {
        const idx = eventHandlers[event].indexOf(handler);
        if (idx !== -1) eventHandlers[event].splice(idx, 1);
      }
    }),
    // Helper to trigger events in tests
    _trigger: (event: string) => {
      if (eventHandlers[event]) {
        eventHandlers[event].forEach((h) => h());
      }
    },
  } as unknown as MapLibreMapInstance & { _trigger: (event: string) => void };
}

describe('maplibre-helpers', () => {
  describe('getLayerCenter', () => {
    it('should return null when no features found', () => {
      const map = createMockMap({ features: [] });
      const result = getLayerCenter(map, 'test-layer');

      expect(result).toBeNull();
      expect(map.queryRenderedFeatures).toHaveBeenCalledWith(undefined, { layers: ['test-layer'] });
    });

    it('should calculate center from single point feature', () => {
      const map = createMockMap({
        features: [{ geometry: { type: 'Point', coordinates: [10, 20] } }],
      });

      const result = getLayerCenter(map, 'test-layer');

      expect(result).toEqual([1000, 2000]); // 10*100, 20*100 from mock project
    });

    it('should calculate centroid from multiple point features', () => {
      const map = createMockMap({
        features: [
          { geometry: { type: 'Point', coordinates: [0, 0] } },
          { geometry: { type: 'Point', coordinates: [10, 20] } },
        ],
      });

      const result = getLayerCenter(map, 'test-layer');

      // Average of (0,0) and (1000,2000)
      expect(result).toEqual([500, 1000]);
    });

    it('should ignore non-point geometries', () => {
      const map = createMockMap({
        features: [
          { geometry: { type: 'LineString', coordinates: [[0, 0], [10, 10]] } },
          { geometry: { type: 'Point', coordinates: [5, 5] } },
        ],
      });

      const result = getLayerCenter(map, 'test-layer');

      expect(result).toEqual([500, 500]); // Only the point feature
    });

    it('should return null when only non-point features exist', () => {
      const map = createMockMap({
        features: [{ geometry: { type: 'LineString', coordinates: [[0, 0], [10, 10]] } }],
      });

      const result = getLayerCenter(map, 'test-layer');

      expect(result).toBeNull();
    });
  });

  describe('layerExists', () => {
    it('should return true when layer exists', () => {
      const map = createMockMap({
        layers: { 'my-layer': { type: 'circle' } },
      });

      expect(layerExists(map, 'my-layer')).toBe(true);
    });

    it('should return false when layer does not exist', () => {
      const map = createMockMap({ layers: {} });

      expect(layerExists(map, 'nonexistent')).toBe(false);
    });
  });

  describe('getLayerGeometryType', () => {
    it('should return "point" for circle layers', () => {
      const map = createMockMap({
        layers: { 'test': { type: 'circle' } },
      });

      expect(getLayerGeometryType(map, 'test')).toBe('point');
    });

    it('should return "point" for symbol layers', () => {
      const map = createMockMap({
        layers: { 'test': { type: 'symbol' } },
      });

      expect(getLayerGeometryType(map, 'test')).toBe('point');
    });

    it('should return "line" for line layers', () => {
      const map = createMockMap({
        layers: { 'test': { type: 'line' } },
      });

      expect(getLayerGeometryType(map, 'test')).toBe('line');
    });

    it('should return "polygon" for fill layers', () => {
      const map = createMockMap({
        layers: { 'test': { type: 'fill' } },
      });

      expect(getLayerGeometryType(map, 'test')).toBe('polygon');
    });

    it('should return "polygon" for fill-extrusion layers', () => {
      const map = createMockMap({
        layers: { 'test': { type: 'fill-extrusion' } },
      });

      expect(getLayerGeometryType(map, 'test')).toBe('polygon');
    });

    it('should return "unknown" for non-existent layer', () => {
      const map = createMockMap({ layers: {} });

      expect(getLayerGeometryType(map, 'nonexistent')).toBe('unknown');
    });

    it('should return "unknown" for unsupported layer types', () => {
      const map = createMockMap({
        layers: { 'test': { type: 'raster' } },
      });

      expect(getLayerGeometryType(map, 'test')).toBe('unknown');
    });
  });

  describe('waitForMapLoad', () => {
    it('should resolve immediately if map is already loaded', async () => {
      const map = createMockMap({ loaded: true });

      await waitForMapLoad(map);

      expect(map.loaded).toHaveBeenCalled();
      expect(map.on).not.toHaveBeenCalled();
    });

    it('should wait for load event if map is not loaded', async () => {
      const map = createMockMap({ loaded: false }) as ReturnType<typeof createMockMap> & {
        _trigger: (event: string) => void;
      };

      const promise = waitForMapLoad(map);

      expect(map.on).toHaveBeenCalledWith('load', expect.any(Function));

      // Trigger the load event
      map._trigger('load');

      await promise;
    });
  });

  describe('waitForLayer', () => {
    it('should resolve immediately if layer already exists', async () => {
      const map = createMockMap({
        layers: { 'my-layer': { type: 'circle' } },
      });

      await waitForLayer(map, 'my-layer');

      expect(map.getLayer).toHaveBeenCalledWith('my-layer');
      expect(map.on).not.toHaveBeenCalled();
    });

    it('should wait for styledata event if layer does not exist', async () => {
      let getLayerCalls = 0;
      const map = createMockMap({ layers: {} }) as ReturnType<typeof createMockMap> & {
        _trigger: (event: string) => void;
      };

      // Override getLayer to return the layer after first call
      map.getLayer = vi.fn(() => {
        getLayerCalls++;
        if (getLayerCalls > 1) {
          return { type: 'circle' };
        }
        return undefined;
      }) as unknown as typeof map.getLayer;

      const promise = waitForLayer(map, 'my-layer');

      expect(map.on).toHaveBeenCalledWith('styledata', expect.any(Function));

      // Trigger styledata event
      map._trigger('styledata');

      await promise;

      expect(map.off).toHaveBeenCalledWith('styledata', expect.any(Function));
    });
  });

  describe('getZoom', () => {
    it('should return current zoom level', () => {
      const map = createMockMap({ zoom: 15 });

      expect(getZoom(map)).toBe(15);
      expect(map.getZoom).toHaveBeenCalled();
    });
  });

  describe('getCanvasSize', () => {
    it('should return canvas width and height', () => {
      const map = createMockMap({ canvasWidth: 1920, canvasHeight: 1080 });

      const [width, height] = getCanvasSize(map);

      expect(width).toBe(1920);
      expect(height).toBe(1080);
      expect(map.getCanvas).toHaveBeenCalled();
    });
  });
});
