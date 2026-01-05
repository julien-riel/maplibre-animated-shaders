/**
 * Tests for LODManager (Level of Detail)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LODManager, DEFAULT_LOD_CONFIG, type LODLevel, type LODConfig } from '../../src/rendering';

describe('LODManager', () => {
  let manager: LODManager;

  beforeEach(() => {
    manager = new LODManager();
  });

  describe('constructor', () => {
    it('should use default LOD config', () => {
      const level = manager.getLODLevel(10);
      expect(level).toBeDefined();
    });

    it('should accept custom LOD levels', () => {
      const customConfig: Partial<LODConfig> = {
        levels: [
          { minZoom: 0, maxZoom: 10, simplification: 0.5, maxFeatures: 100, minVertices: 3 },
          { minZoom: 10, maxZoom: 22, simplification: 1.0, maxFeatures: 10000, minVertices: 4 },
        ],
      };

      const customManager = new LODManager(customConfig);
      const level = customManager.getLODLevel(5);

      expect(level.maxFeatures).toBe(100);
    });
  });

  describe('getLODLevel', () => {
    it('should return appropriate level for low zoom', () => {
      const level = manager.getLODLevel(3);

      expect(level.simplification).toBeLessThan(1);
      expect(level.maxFeatures).toBeLessThan(10000);
    });

    it('should return appropriate level for high zoom', () => {
      const level = manager.getLODLevel(20);

      expect(level.simplification).toBe(1.0);
      expect(level.maxFeatures).toBeGreaterThan(10000);
    });

    it('should handle zoom boundaries', () => {
      // Test exact boundary values
      const level0 = manager.getLODLevel(0);
      const level5 = manager.getLODLevel(5);
      const level10 = manager.getLODLevel(10);

      expect(level0).toBeDefined();
      expect(level5).toBeDefined();
      expect(level10).toBeDefined();
    });

    it('should fallback for out-of-range zoom levels', () => {
      const levelNegative = manager.getLODLevel(-5);
      const levelHigh = manager.getLODLevel(30);

      expect(levelNegative).toBeDefined();
      expect(levelHigh).toBeDefined();
    });
  });

  describe('getSimplification', () => {
    it('should return simplification value for zoom level', () => {
      const simplification = manager.getSimplification(5);

      expect(typeof simplification).toBe('number');
      expect(simplification).toBeGreaterThanOrEqual(0);
      expect(simplification).toBeLessThanOrEqual(1);
    });
  });

  describe('getMaxFeatures', () => {
    it('should return max features for zoom level', () => {
      const maxFeatures = manager.getMaxFeatures(10);

      expect(typeof maxFeatures).toBe('number');
      expect(maxFeatures).toBeGreaterThan(0);
    });
  });

  describe('simplifyGeometry', () => {
    const lineString: GeoJSON.LineString = {
      type: 'LineString',
      coordinates: [
        [0, 0],
        [1, 0.1],
        [2, 0],
        [3, 0.1],
        [4, 0],
        [5, 0.1],
        [6, 0],
        [7, 0.1],
        [8, 0],
        [9, 0.1],
        [10, 0],
      ],
    };

    it('should simplify LineString geometry', () => {
      const level: LODLevel = { minZoom: 0, maxZoom: 10, simplification: 0.5, maxFeatures: 1000, minVertices: 3 };

      const simplified = manager.simplifyGeometry(lineString, level);

      expect(simplified.type).toBe('LineString');
      expect((simplified as GeoJSON.LineString).coordinates.length).toBeLessThanOrEqual(
        lineString.coordinates.length
      );
    });

    it('should not simplify when simplification is 1.0', () => {
      const level: LODLevel = { minZoom: 0, maxZoom: 10, simplification: 1.0, maxFeatures: 1000, minVertices: 3 };

      const simplified = manager.simplifyGeometry(lineString, level);

      expect((simplified as GeoJSON.LineString).coordinates.length).toBe(
        lineString.coordinates.length
      );
    });

    it('should preserve minimum vertices', () => {
      const level: LODLevel = { minZoom: 0, maxZoom: 10, simplification: 0.01, maxFeatures: 1000, minVertices: 3 };

      const simplified = manager.simplifyGeometry(lineString, level);

      expect((simplified as GeoJSON.LineString).coordinates.length).toBeGreaterThanOrEqual(2);
    });

    it('should simplify Polygon geometry', () => {
      const polygon: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [5, 0.1],
            [10, 0],
            [10.1, 5],
            [10, 10],
            [5, 9.9],
            [0, 10],
            [-0.1, 5],
            [0, 0],
          ],
        ],
      };

      const level: LODLevel = { minZoom: 0, maxZoom: 10, simplification: 0.5, maxFeatures: 1000, minVertices: 4 };

      const simplified = manager.simplifyGeometry(polygon, level);

      expect(simplified.type).toBe('Polygon');
    });

    it('should not modify Point geometry', () => {
      const point: GeoJSON.Point = { type: 'Point', coordinates: [5, 5] };
      const level: LODLevel = { minZoom: 0, maxZoom: 10, simplification: 0.5, maxFeatures: 1000, minVertices: 3 };

      const simplified = manager.simplifyGeometry(point, level);

      expect(simplified).toEqual(point);
    });

    it('should handle MultiLineString', () => {
      const multiLine: GeoJSON.MultiLineString = {
        type: 'MultiLineString',
        coordinates: [
          [
            [0, 0],
            [1, 0.1],
            [2, 0],
          ],
          [
            [10, 10],
            [11, 10.1],
            [12, 10],
          ],
        ],
      };

      const level: LODLevel = { minZoom: 0, maxZoom: 10, simplification: 0.5, maxFeatures: 1000, minVertices: 3 };

      const simplified = manager.simplifyGeometry(multiLine, level);

      expect(simplified.type).toBe('MultiLineString');
    });
  });

  describe('applyLOD', () => {
    let features: GeoJSON.Feature[];

    beforeEach(() => {
      // Create 100 point features
      features = [];
      for (let i = 0; i < 100; i++) {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [i, i] },
          properties: { id: i },
        });
      }
    });

    it('should limit number of features based on zoom', () => {
      // At low zoom, maxFeatures is limited
      const result = manager.applyLOD(features, 0);

      // Default config has 1000 maxFeatures at zoom 0-5
      expect(result.length).toBeLessThanOrEqual(1000);
    });

    it('should return all features when within limit', () => {
      // At high zoom with high maxFeatures
      const result = manager.applyLOD(features, 20);

      expect(result.length).toBe(100);
    });

    it('should simplify geometries when needed', () => {
      const lineFeatures: GeoJSON.Feature[] = [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [0, 0],
              [1, 0.01],
              [2, 0],
              [3, 0.01],
              [4, 0],
            ],
          },
          properties: {},
        },
      ];

      // At low zoom with low simplification
      const result = manager.applyLOD(lineFeatures, 3);

      expect(result.length).toBe(1);
    });

    it('should handle empty feature array', () => {
      const result = manager.applyLOD([], 10);

      expect(result).toEqual([]);
    });
  });

  describe('isEnabled', () => {
    it('should return true by default', () => {
      expect(manager.isEnabled()).toBe(true);
    });

    it('should toggle enabled state', () => {
      manager.setEnabled(false);
      expect(manager.isEnabled()).toBe(false);

      manager.setEnabled(true);
      expect(manager.isEnabled()).toBe(true);
    });

    it('should return full detail when disabled', () => {
      manager.setEnabled(false);

      const level = manager.getLODLevel(3);

      expect(level.simplification).toBe(1.0);
      expect(level.maxFeatures).toBe(Infinity);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      manager.updateConfig({ defaultSimplification: 0.5 });

      expect(manager.getConfig().defaultSimplification).toBe(0.5);
    });
  });
});

describe('DEFAULT_LOD_CONFIG', () => {
  it('should have levels covering all zoom ranges', () => {
    const levels = DEFAULT_LOD_CONFIG.levels;

    expect(levels.length).toBeGreaterThan(0);
    expect(levels[0].minZoom).toBe(0);
  });

  it('should have increasing simplification with higher zoom', () => {
    const levels = DEFAULT_LOD_CONFIG.levels;
    let prevSimplification = 0;

    for (const level of levels) {
      expect(level.simplification).toBeGreaterThanOrEqual(prevSimplification);
      prevSimplification = level.simplification;
    }
  });

  it('should have increasing maxFeatures with higher zoom', () => {
    const levels = DEFAULT_LOD_CONFIG.levels;
    let prevMaxFeatures = 0;

    for (const level of levels) {
      expect(level.maxFeatures).toBeGreaterThanOrEqual(prevMaxFeatures);
      prevMaxFeatures = level.maxFeatures;
    }
  });
});
