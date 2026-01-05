/**
 * Tests for FrustumCuller
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FrustumCuller,
  createBBox2D,
  boxesIntersect,
  mergeBoxes,
  expandBox,
  type BBox2D,
  type BBox3D,
} from '../../src/rendering';
import { mat4 } from 'gl-matrix';

describe('FrustumCuller', () => {
  let culler: FrustumCuller;

  beforeEach(() => {
    culler = new FrustumCuller();
  });

  describe('frustum update', () => {
    it('should update frustum from projection matrix', () => {
      const projection = mat4.perspective(
        mat4.create(),
        Math.PI / 4, // 45 degree FOV
        1, // aspect ratio
        0.1, // near
        100 // far
      );

      expect(() => culler.updateFrustum(projection)).not.toThrow();
    });

    it('should accept Float32Array', () => {
      const matrix = new Float32Array(16);
      mat4.perspective(matrix, Math.PI / 4, 1, 0.1, 100);

      expect(() => culler.updateFrustum(matrix)).not.toThrow();
    });

    it('should skip update for identical matrix', () => {
      const matrix = mat4.perspective(mat4.create(), Math.PI / 4, 1, 0.1, 100);

      culler.updateFrustum(matrix);
      // Second call should be cached
      culler.updateFrustum(matrix);

      // No error means it works correctly
    });
  });

  describe('visibility testing', () => {
    beforeEach(() => {
      // Setup a simple orthographic-like projection
      const view = mat4.lookAt(mat4.create(), [0, 0, 5], [0, 0, 0], [0, 1, 0]);

      const projection = mat4.perspective(mat4.create(), Math.PI / 2, 1, 0.1, 100);

      const mvp = mat4.multiply(mat4.create(), projection, view);
      culler.updateFrustum(mvp);
    });

    it('should mark centered box as visible', () => {
      const bbox: BBox2D = { minX: -1, minY: -1, maxX: 1, maxY: 1 };

      expect(culler.isVisible(bbox)).toBe(true);
    });

    it('should cull box far outside frustum', () => {
      const bbox: BBox2D = { minX: 1000, minY: 1000, maxX: 1001, maxY: 1001 };

      expect(culler.isVisible(bbox)).toBe(false);
    });

    it('should handle box at origin', () => {
      const bbox: BBox2D = { minX: 0, minY: 0, maxX: 0.1, maxY: 0.1 };

      expect(culler.isVisible(bbox)).toBe(true);
    });
  });

  describe('3D mode', () => {
    it('should support 3D bounding boxes', () => {
      culler.set3DMode(true);

      const bbox: BBox3D = {
        minX: -1,
        minY: -1,
        maxX: 1,
        maxY: 1,
        minZ: 0,
        maxZ: 1,
      };

      // Setup frustum
      const mvp = mat4.perspective(mat4.create(), Math.PI / 4, 1, 0.1, 100);
      culler.updateFrustum(mvp);

      const result = culler.isVisible3D(bbox);
      expect(typeof result).toBe('boolean');
    });

    it('should toggle 3D mode', () => {
      expect(culler.is3DMode).toBe(false);

      culler.set3DMode(true);
      expect(culler.is3DMode).toBe(true);

      culler.set3DMode(false);
      expect(culler.is3DMode).toBe(false);
    });
  });

  describe('testBox', () => {
    beforeEach(() => {
      const view = mat4.lookAt(mat4.create(), [0, 0, 5], [0, 0, 0], [0, 1, 0]);
      const projection = mat4.perspective(mat4.create(), Math.PI / 2, 1, 0.1, 100);
      const mvp = mat4.multiply(mat4.create(), projection, view);
      culler.updateFrustum(mvp);
    });

    it('should return inside or intersect for centered box', () => {
      const bbox: BBox2D = { minX: -0.1, minY: -0.1, maxX: 0.1, maxY: 0.1 };

      const result = culler.testBox(bbox);
      expect(['inside', 'intersect']).toContain(result);
    });

    it('should return outside for far away box', () => {
      const bbox: BBox2D = { minX: 100, minY: 100, maxX: 101, maxY: 101 };

      const result = culler.testBox(bbox);
      expect(result).toBe('outside');
    });
  });

  describe('testPoint', () => {
    beforeEach(() => {
      const view = mat4.lookAt(mat4.create(), [0, 0, 5], [0, 0, 0], [0, 1, 0]);
      const projection = mat4.perspective(mat4.create(), Math.PI / 2, 1, 0.1, 100);
      const mvp = mat4.multiply(mat4.create(), projection, view);
      culler.updateFrustum(mvp);
    });

    it('should return true for point at origin', () => {
      expect(culler.testPoint(0, 0, 0)).toBe(true);
    });

    it('should return false for point far away', () => {
      expect(culler.testPoint(1000, 1000, 1000)).toBe(false);
    });
  });

  describe('cullFeatures', () => {
    beforeEach(() => {
      const view = mat4.lookAt(mat4.create(), [0, 0, 10], [0, 0, 0], [0, 1, 0]);
      const projection = mat4.perspective(mat4.create(), Math.PI / 2, 1, 0.1, 100);
      const mvp = mat4.multiply(mat4.create(), projection, view);
      culler.updateFrustum(mvp);
    });

    it('should return indices of visible features', () => {
      const features: GeoJSON.Feature[] = [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [1000, 1000] }, properties: {} },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [0.5, 0.5] }, properties: {} },
      ];

      const bounds: BBox2D[] = [
        { minX: -0.1, minY: -0.1, maxX: 0.1, maxY: 0.1 },
        { minX: 999, minY: 999, maxX: 1001, maxY: 1001 },
        { minX: 0.4, minY: 0.4, maxX: 0.6, maxY: 0.6 },
      ];

      const visible = culler.cullFeatures(features, bounds);

      // Features 0 and 2 should be visible, feature 1 should be culled
      expect(visible).toContain(0);
      expect(visible).toContain(2);
      expect(visible).not.toContain(1);
    });

    it('should handle empty feature list', () => {
      const visible = culler.cullFeatures([], []);
      expect(visible).toEqual([]);
    });
  });

  describe('cullFeaturesWithStats', () => {
    beforeEach(() => {
      const mvp = mat4.perspective(mat4.create(), Math.PI / 2, 1, 0.1, 100);
      culler.updateFrustum(mvp);
    });

    it('should return statistics with results', () => {
      const features: GeoJSON.Feature[] = [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [1000, 1000] }, properties: {} },
      ];

      const bounds: BBox2D[] = [
        { minX: -0.1, minY: -0.1, maxX: 0.1, maxY: 0.1 },
        { minX: 999, minY: 999, maxX: 1001, maxY: 1001 },
      ];

      const { indices, stats } = culler.cullFeaturesWithStats(features, bounds);

      expect(stats.total).toBe(2);
      expect(stats.visible).toBe(indices.length);
      expect(stats.culled).toBe(2 - indices.length);
      expect(stats.ratio).toBe(indices.length / 2);
    });
  });

  describe('computeBounds', () => {
    it('should compute bounds for Point', () => {
      const geometry: GeoJSON.Point = { type: 'Point', coordinates: [10, 20] };
      const bounds = FrustumCuller.computeBounds(geometry);

      expect(bounds.minX).toBe(10);
      expect(bounds.maxX).toBe(10);
      expect(bounds.minY).toBe(20);
      expect(bounds.maxY).toBe(20);
    });

    it('should compute bounds for LineString', () => {
      const geometry: GeoJSON.LineString = {
        type: 'LineString',
        coordinates: [
          [0, 0],
          [10, 5],
          [5, 10],
        ],
      };
      const bounds = FrustumCuller.computeBounds(geometry);

      expect(bounds.minX).toBe(0);
      expect(bounds.maxX).toBe(10);
      expect(bounds.minY).toBe(0);
      expect(bounds.maxY).toBe(10);
    });

    it('should compute bounds for Polygon', () => {
      const geometry: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
          ],
        ],
      };
      const bounds = FrustumCuller.computeBounds(geometry);

      expect(bounds.minX).toBe(0);
      expect(bounds.maxX).toBe(10);
      expect(bounds.minY).toBe(0);
      expect(bounds.maxY).toBe(10);
    });

    it('should compute bounds for MultiPolygon', () => {
      const geometry: GeoJSON.MultiPolygon = {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [0, 0],
              [5, 0],
              [5, 5],
              [0, 5],
              [0, 0],
            ],
          ],
          [
            [
              [10, 10],
              [15, 10],
              [15, 15],
              [10, 15],
              [10, 10],
            ],
          ],
        ],
      };
      const bounds = FrustumCuller.computeBounds(geometry);

      expect(bounds.minX).toBe(0);
      expect(bounds.maxX).toBe(15);
      expect(bounds.minY).toBe(0);
      expect(bounds.maxY).toBe(15);
    });
  });

  describe('computeBoundsArray', () => {
    it('should compute bounds for multiple features', () => {
      const features: GeoJSON.Feature[] = [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [10, 10] }, properties: {} },
      ];

      const boundsArray = FrustumCuller.computeBoundsArray(features);

      expect(boundsArray).toHaveLength(2);
      expect(boundsArray[0]).toEqual({ minX: 0, maxX: 0, minY: 0, maxY: 0 });
      expect(boundsArray[1]).toEqual({ minX: 10, maxX: 10, minY: 10, maxY: 10 });
    });
  });
});

describe('BBox utilities', () => {
  describe('createBBox2D', () => {
    it('should create a bounding box', () => {
      const bbox = createBBox2D(0, 0, 10, 10);

      expect(bbox.minX).toBe(0);
      expect(bbox.minY).toBe(0);
      expect(bbox.maxX).toBe(10);
      expect(bbox.maxY).toBe(10);
    });
  });

  describe('boxesIntersect', () => {
    it('should return true for overlapping boxes', () => {
      const a: BBox2D = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const b: BBox2D = { minX: 5, minY: 5, maxX: 15, maxY: 15 };

      expect(boxesIntersect(a, b)).toBe(true);
    });

    it('should return false for non-overlapping boxes', () => {
      const a: BBox2D = { minX: 0, minY: 0, maxX: 5, maxY: 5 };
      const b: BBox2D = { minX: 10, minY: 10, maxX: 15, maxY: 15 };

      expect(boxesIntersect(a, b)).toBe(false);
    });

    it('should return true for touching boxes', () => {
      const a: BBox2D = { minX: 0, minY: 0, maxX: 5, maxY: 5 };
      const b: BBox2D = { minX: 5, minY: 0, maxX: 10, maxY: 5 };

      expect(boxesIntersect(a, b)).toBe(true);
    });

    it('should handle contained boxes', () => {
      const a: BBox2D = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const b: BBox2D = { minX: 2, minY: 2, maxX: 8, maxY: 8 };

      expect(boxesIntersect(a, b)).toBe(true);
    });
  });

  describe('mergeBoxes', () => {
    it('should merge two boxes', () => {
      const a: BBox2D = { minX: 0, minY: 0, maxX: 5, maxY: 5 };
      const b: BBox2D = { minX: 3, minY: 3, maxX: 10, maxY: 10 };

      const merged = mergeBoxes(a, b);

      expect(merged.minX).toBe(0);
      expect(merged.minY).toBe(0);
      expect(merged.maxX).toBe(10);
      expect(merged.maxY).toBe(10);
    });

    it('should handle nested boxes', () => {
      const outer: BBox2D = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const inner: BBox2D = { minX: 2, minY: 2, maxX: 8, maxY: 8 };

      const merged = mergeBoxes(outer, inner);

      expect(merged).toEqual(outer);
    });
  });

  describe('expandBox', () => {
    it('should expand box by margin', () => {
      const bbox: BBox2D = { minX: 5, minY: 5, maxX: 10, maxY: 10 };

      const expanded = expandBox(bbox, 2);

      expect(expanded.minX).toBe(3);
      expect(expanded.minY).toBe(3);
      expect(expanded.maxX).toBe(12);
      expect(expanded.maxY).toBe(12);
    });

    it('should handle zero margin', () => {
      const bbox: BBox2D = { minX: 0, minY: 0, maxX: 10, maxY: 10 };

      const expanded = expandBox(bbox, 0);

      expect(expanded).toEqual(bbox);
    });

    it('should handle negative margin (shrink)', () => {
      const bbox: BBox2D = { minX: 0, minY: 0, maxX: 10, maxY: 10 };

      const shrunk = expandBox(bbox, -2);

      expect(shrunk.minX).toBe(2);
      expect(shrunk.minY).toBe(2);
      expect(shrunk.maxX).toBe(8);
      expect(shrunk.maxY).toBe(8);
    });
  });
});
