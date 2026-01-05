/**
 * Frustum Culler
 *
 * Provides view frustum culling to skip rendering features
 * that are outside the visible area.
 *
 * @module rendering/FrustumCuller
 */

import type { mat4 } from 'gl-matrix';

/**
 * Bounding box in 2D (lon/lat or Mercator)
 */
export interface BBox2D {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Bounding box in 3D (Mercator + height)
 */
export interface BBox3D extends BBox2D {
  minZ: number;
  maxZ: number;
}

/**
 * Frustum plane representation
 */
interface FrustumPlane {
  a: number;
  b: number;
  c: number;
  d: number;
}

/**
 * Culling result for a feature
 */
export type CullResult = 'inside' | 'outside' | 'intersect';

/**
 * Statistics from culling operation
 */
export interface CullStats {
  total: number;
  visible: number;
  culled: number;
  ratio: number;
}

/**
 * Frustum culler for efficient visibility testing.
 *
 * Extracts frustum planes from the projection matrix and tests
 * bounding boxes against them to determine visibility.
 *
 * @example
 * ```typescript
 * const culler = new FrustumCuller();
 *
 * // Update frustum from camera matrix
 * culler.updateFrustum(projectionMatrix);
 *
 * // Test individual bounds
 * if (culler.isVisible({ minX: 0, minY: 0, maxX: 1, maxY: 1 })) {
 *   // Render feature
 * }
 *
 * // Bulk cull features
 * const visibleIndices = culler.cullFeatures(features, boundsList);
 * ```
 */
export class FrustumCuller {
  /** The 6 frustum planes (left, right, bottom, top, near, far) */
  private planes: FrustumPlane[] = [];

  /** Cached matrix for dirty checking */
  private cachedMatrix: Float32Array | null = null;

  /**
   * Whether 3D culling is enabled.
   * Reserved for future 3D frustum culling implementation.
   */
  private _use3D: boolean = false;

  /**
   * Get whether 3D mode is enabled.
   * @returns true if 3D culling is active
   */
  get is3DMode(): boolean {
    return this._use3D;
  }

  /**
   * Create a frustum culler.
   *
   * @param use3D - Whether to use 3D bounding boxes (default: false)
   */
  constructor(use3D: boolean = false) {
    this._use3D = use3D;
    // Initialize 6 planes
    for (let i = 0; i < 6; i++) {
      this.planes.push({ a: 0, b: 0, c: 0, d: 0 });
    }
  }

  /**
   * Enable or disable 3D culling.
   *
   * @param enabled - Whether to use 3D bounding boxes
   */
  set3DMode(enabled: boolean): void {
    this._use3D = enabled;
  }

  /**
   * Update frustum planes from projection-view matrix.
   *
   * @param matrix - Combined projection-view matrix (MVP)
   */
  updateFrustum(matrix: mat4 | Float32Array): void {
    // Check if matrix has changed
    const matrixArray = matrix instanceof Float32Array ? matrix : new Float32Array(matrix);

    if (this.cachedMatrix && this.matricesEqual(this.cachedMatrix, matrixArray)) {
      return; // No change
    }

    this.cachedMatrix = new Float32Array(matrixArray);

    // Extract frustum planes from matrix
    // Using the Gribb/Hartmann method
    const m = matrixArray;

    // Left plane
    this.planes[0].a = m[3] + m[0];
    this.planes[0].b = m[7] + m[4];
    this.planes[0].c = m[11] + m[8];
    this.planes[0].d = m[15] + m[12];
    this.normalizePlane(this.planes[0]);

    // Right plane
    this.planes[1].a = m[3] - m[0];
    this.planes[1].b = m[7] - m[4];
    this.planes[1].c = m[11] - m[8];
    this.planes[1].d = m[15] - m[12];
    this.normalizePlane(this.planes[1]);

    // Bottom plane
    this.planes[2].a = m[3] + m[1];
    this.planes[2].b = m[7] + m[5];
    this.planes[2].c = m[11] + m[9];
    this.planes[2].d = m[15] + m[13];
    this.normalizePlane(this.planes[2]);

    // Top plane
    this.planes[3].a = m[3] - m[1];
    this.planes[3].b = m[7] - m[5];
    this.planes[3].c = m[11] - m[9];
    this.planes[3].d = m[15] - m[13];
    this.normalizePlane(this.planes[3]);

    // Near plane
    this.planes[4].a = m[3] + m[2];
    this.planes[4].b = m[7] + m[6];
    this.planes[4].c = m[11] + m[10];
    this.planes[4].d = m[15] + m[14];
    this.normalizePlane(this.planes[4]);

    // Far plane
    this.planes[5].a = m[3] - m[2];
    this.planes[5].b = m[7] - m[6];
    this.planes[5].c = m[11] - m[10];
    this.planes[5].d = m[15] - m[14];
    this.normalizePlane(this.planes[5]);
  }

  /**
   * Normalize a frustum plane.
   */
  private normalizePlane(plane: FrustumPlane): void {
    const length = Math.sqrt(plane.a * plane.a + plane.b * plane.b + plane.c * plane.c);
    if (length > 0) {
      plane.a /= length;
      plane.b /= length;
      plane.c /= length;
      plane.d /= length;
    }
  }

  /**
   * Check if two matrices are equal.
   */
  private matricesEqual(a: Float32Array, b: Float32Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (Math.abs(a[i] - b[i]) > 1e-6) return false;
    }
    return true;
  }

  /**
   * Test if a 2D bounding box is visible.
   *
   * @param bbox - 2D bounding box
   * @returns true if any part of the box is potentially visible
   */
  isVisible(bbox: BBox2D): boolean {
    return this.testBox(bbox) !== 'outside';
  }

  /**
   * Test if a 3D bounding box is visible.
   *
   * @param bbox - 3D bounding box
   * @returns true if any part of the box is potentially visible
   */
  isVisible3D(bbox: BBox3D): boolean {
    return this.testBox3D(bbox) !== 'outside';
  }

  /**
   * Test a 2D bounding box against the frustum.
   *
   * @param bbox - 2D bounding box
   * @returns Culling result
   */
  testBox(bbox: BBox2D): CullResult {
    // For 2D, treat as bbox with z = 0
    return this.testBox3D({
      minX: bbox.minX,
      minY: bbox.minY,
      maxX: bbox.maxX,
      maxY: bbox.maxY,
      minZ: 0,
      maxZ: 0,
    });
  }

  /**
   * Test a 3D bounding box against the frustum.
   *
   * @param bbox - 3D bounding box
   * @returns Culling result
   */
  testBox3D(bbox: BBox3D): CullResult {
    let result: CullResult = 'inside';

    for (const plane of this.planes) {
      // Find the corner most aligned with plane normal
      const px = plane.a >= 0 ? bbox.maxX : bbox.minX;
      const py = plane.b >= 0 ? bbox.maxY : bbox.minY;
      const pz = plane.c >= 0 ? bbox.maxZ : bbox.minZ;

      // If this corner is outside, the box is outside
      const d = plane.a * px + plane.b * py + plane.c * pz + plane.d;
      if (d < 0) {
        // Check opposite corner to see if box straddles the plane
        const nx = plane.a >= 0 ? bbox.minX : bbox.maxX;
        const ny = plane.b >= 0 ? bbox.minY : bbox.maxY;
        const nz = plane.c >= 0 ? bbox.minZ : bbox.maxZ;
        const nd = plane.a * nx + plane.b * ny + plane.c * nz + plane.d;

        if (nd < 0) {
          return 'outside';
        }
        result = 'intersect';
      }
    }

    return result;
  }

  /**
   * Test a point against the frustum.
   *
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param z - Z coordinate (default: 0)
   * @returns true if the point is inside the frustum
   */
  testPoint(x: number, y: number, z: number = 0): boolean {
    for (const plane of this.planes) {
      const d = plane.a * x + plane.b * y + plane.c * z + plane.d;
      if (d < 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Cull a list of features by their bounding boxes.
   *
   * @param features - Array of GeoJSON features
   * @param bounds - Array of bounding boxes (same order as features)
   * @returns Array of indices of visible features
   *
   * @example
   * ```typescript
   * const bounds = features.map(f => computeBounds(f.geometry));
   * const visibleIndices = culler.cullFeatures(features, bounds);
   *
   * for (const i of visibleIndices) {
   *   renderFeature(features[i]);
   * }
   * ```
   */
  cullFeatures(features: GeoJSON.Feature[], bounds: BBox2D[]): number[] {
    const visible: number[] = [];

    for (let i = 0; i < features.length; i++) {
      if (i < bounds.length && this.isVisible(bounds[i])) {
        visible.push(i);
      }
    }

    return visible;
  }

  /**
   * Cull features and return statistics.
   *
   * @param features - Array of GeoJSON features
   * @param bounds - Array of bounding boxes
   * @returns Visible indices and statistics
   */
  cullFeaturesWithStats(
    features: GeoJSON.Feature[],
    bounds: BBox2D[]
  ): { indices: number[]; stats: CullStats } {
    const indices = this.cullFeatures(features, bounds);

    return {
      indices,
      stats: {
        total: features.length,
        visible: indices.length,
        culled: features.length - indices.length,
        ratio: features.length > 0 ? indices.length / features.length : 1,
      },
    };
  }

  /**
   * Compute bounding box for a GeoJSON geometry.
   *
   * @param geometry - GeoJSON geometry
   * @returns 2D bounding box
   */
  static computeBounds(geometry: GeoJSON.Geometry): BBox2D {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const processCoord = (coord: GeoJSON.Position) => {
      minX = Math.min(minX, coord[0]);
      minY = Math.min(minY, coord[1]);
      maxX = Math.max(maxX, coord[0]);
      maxY = Math.max(maxY, coord[1]);
    };

    const processCoords = (coords: GeoJSON.Position[]) => {
      for (const coord of coords) {
        processCoord(coord);
      }
    };

    switch (geometry.type) {
      case 'Point':
        processCoord(geometry.coordinates);
        break;
      case 'MultiPoint':
      case 'LineString':
        processCoords(geometry.coordinates);
        break;
      case 'MultiLineString':
      case 'Polygon':
        for (const ring of geometry.coordinates) {
          processCoords(ring);
        }
        break;
      case 'MultiPolygon':
        for (const polygon of geometry.coordinates) {
          for (const ring of polygon) {
            processCoords(ring);
          }
        }
        break;
      case 'GeometryCollection':
        for (const geom of geometry.geometries) {
          const bounds = FrustumCuller.computeBounds(geom);
          minX = Math.min(minX, bounds.minX);
          minY = Math.min(minY, bounds.minY);
          maxX = Math.max(maxX, bounds.maxX);
          maxY = Math.max(maxY, bounds.maxY);
        }
        break;
    }

    return { minX, minY, maxX, maxY };
  }

  /**
   * Compute bounding boxes for multiple features.
   *
   * @param features - Array of GeoJSON features
   * @returns Array of bounding boxes
   */
  static computeBoundsArray(features: GeoJSON.Feature[]): BBox2D[] {
    return features.map((f) => FrustumCuller.computeBounds(f.geometry));
  }
}

/**
 * Create a simple 2D bounding box.
 *
 * @param minX - Minimum X
 * @param minY - Minimum Y
 * @param maxX - Maximum X
 * @param maxY - Maximum Y
 * @returns BBox2D object
 */
export function createBBox2D(minX: number, minY: number, maxX: number, maxY: number): BBox2D {
  return { minX, minY, maxX, maxY };
}

/**
 * Check if two bounding boxes intersect.
 *
 * @param a - First bounding box
 * @param b - Second bounding box
 * @returns true if they intersect
 */
export function boxesIntersect(a: BBox2D, b: BBox2D): boolean {
  return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
}

/**
 * Merge two bounding boxes.
 *
 * @param a - First bounding box
 * @param b - Second bounding box
 * @returns Merged bounding box containing both
 */
export function mergeBoxes(a: BBox2D, b: BBox2D): BBox2D {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

/**
 * Expand a bounding box by a margin.
 *
 * @param bbox - The bounding box
 * @param margin - Margin to add on all sides
 * @returns Expanded bounding box
 */
export function expandBox(bbox: BBox2D, margin: number): BBox2D {
  return {
    minX: bbox.minX - margin,
    minY: bbox.minY - margin,
    maxX: bbox.maxX + margin,
    maxY: bbox.maxY + margin,
  };
}
