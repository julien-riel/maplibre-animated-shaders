/**
 * Level of Detail (LOD) Manager
 *
 * Manages geometry complexity based on zoom level.
 * Reduces vertex count for distant/small features.
 *
 * @module rendering/LODManager
 */

/**
 * LOD level configuration
 */
export interface LODLevel {
  /** Minimum zoom for this level */
  minZoom: number;

  /** Maximum zoom for this level */
  maxZoom: number;

  /** Simplification factor (0-1, where 1 = full detail) */
  simplification: number;

  /** Maximum features to render at this level */
  maxFeatures: number;

  /** Minimum vertex count for line/polygon features */
  minVertices: number;
}

/**
 * LOD configuration
 */
export interface LODConfig {
  /** Enable LOD system */
  enabled: boolean;

  /** LOD levels (sorted by zoom) */
  levels: LODLevel[];

  /** Default simplification when no level matches */
  defaultSimplification: number;

  /** Default max features when no level matches */
  defaultMaxFeatures: number;
}

/**
 * Default LOD configuration
 */
export const DEFAULT_LOD_CONFIG: LODConfig = {
  enabled: true,
  levels: [
    { minZoom: 0, maxZoom: 5, simplification: 0.1, maxFeatures: 1000, minVertices: 3 },
    { minZoom: 5, maxZoom: 10, simplification: 0.3, maxFeatures: 5000, minVertices: 4 },
    { minZoom: 10, maxZoom: 14, simplification: 0.6, maxFeatures: 20000, minVertices: 6 },
    { minZoom: 14, maxZoom: 18, simplification: 0.9, maxFeatures: 50000, minVertices: 8 },
    { minZoom: 18, maxZoom: 24, simplification: 1.0, maxFeatures: 100000, minVertices: 10 },
  ],
  defaultSimplification: 1.0,
  defaultMaxFeatures: 10000,
};

/**
 * LOD Manager for controlling geometry detail.
 *
 * @example
 * ```typescript
 * const lodManager = new LODManager();
 *
 * // Get LOD level for current zoom
 * const level = lodManager.getLODLevel(map.getZoom());
 *
 * // Apply to features
 * const simplified = features.slice(0, level.maxFeatures)
 *   .map(f => lodManager.simplifyFeature(f, level));
 * ```
 */
export class LODManager {
  private config: LODConfig;

  /**
   * Create a LOD manager.
   *
   * @param config - LOD configuration (default: DEFAULT_LOD_CONFIG)
   */
  constructor(config: Partial<LODConfig> = {}) {
    this.config = {
      ...DEFAULT_LOD_CONFIG,
      ...config,
      levels: config.levels || DEFAULT_LOD_CONFIG.levels,
    };

    // Sort levels by minZoom
    this.config.levels.sort((a, b) => a.minZoom - b.minZoom);
  }

  /**
   * Check if LOD is enabled.
   *
   * @returns true if LOD is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Enable or disable LOD.
   *
   * @param enabled - Whether to enable LOD
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Get the LOD level for a given zoom.
   *
   * @param zoom - Current map zoom level
   * @returns LOD level configuration
   */
  getLODLevel(zoom: number): LODLevel {
    if (!this.config.enabled) {
      return {
        minZoom: 0,
        maxZoom: 24,
        simplification: 1.0,
        maxFeatures: Infinity,
        minVertices: 2,
      };
    }

    for (const level of this.config.levels) {
      if (zoom >= level.minZoom && zoom < level.maxZoom) {
        return level;
      }
    }

    // Return default for out-of-range zoom
    return {
      minZoom: 0,
      maxZoom: 24,
      simplification: this.config.defaultSimplification,
      maxFeatures: this.config.defaultMaxFeatures,
      minVertices: 4,
    };
  }

  /**
   * Get simplification factor for a zoom level.
   *
   * @param zoom - Current map zoom level
   * @returns Simplification factor (0-1)
   */
  getSimplification(zoom: number): number {
    return this.getLODLevel(zoom).simplification;
  }

  /**
   * Get maximum features for a zoom level.
   *
   * @param zoom - Current map zoom level
   * @returns Maximum number of features
   */
  getMaxFeatures(zoom: number): number {
    return this.getLODLevel(zoom).maxFeatures;
  }

  /**
   * Simplify a GeoJSON geometry using Douglas-Peucker algorithm.
   *
   * @param geometry - Input geometry
   * @param level - LOD level to use
   * @returns Simplified geometry
   */
  simplifyGeometry(geometry: GeoJSON.Geometry, level: LODLevel): GeoJSON.Geometry {
    if (level.simplification >= 1.0) {
      return geometry; // No simplification needed
    }

    const tolerance = this.calculateTolerance(level.simplification);

    switch (geometry.type) {
      case 'Point':
      case 'MultiPoint':
        return geometry; // Points can't be simplified

      case 'LineString':
        return {
          type: 'LineString',
          coordinates: this.simplifyCoords(
            geometry.coordinates,
            tolerance,
            level.minVertices,
            false
          ),
        };

      case 'MultiLineString':
        return {
          type: 'MultiLineString',
          coordinates: geometry.coordinates.map((line) =>
            this.simplifyCoords(line, tolerance, level.minVertices, false)
          ),
        };

      case 'Polygon':
        return {
          type: 'Polygon',
          coordinates: geometry.coordinates.map((ring, i) =>
            this.simplifyCoords(ring, tolerance, i === 0 ? level.minVertices : 4, true)
          ),
        };

      case 'MultiPolygon':
        return {
          type: 'MultiPolygon',
          coordinates: geometry.coordinates.map((polygon) =>
            polygon.map((ring, i) =>
              this.simplifyCoords(ring, tolerance, i === 0 ? level.minVertices : 4, true)
            )
          ),
        };

      case 'GeometryCollection':
        return {
          type: 'GeometryCollection',
          geometries: geometry.geometries.map((g) => this.simplifyGeometry(g, level)),
        };

      default:
        return geometry;
    }
  }

  /**
   * Simplify a feature.
   *
   * @param feature - Input feature
   * @param level - LOD level to use
   * @returns Simplified feature
   */
  simplifyFeature(feature: GeoJSON.Feature, level: LODLevel): GeoJSON.Feature {
    return {
      ...feature,
      geometry: this.simplifyGeometry(feature.geometry, level),
    };
  }

  /**
   * Apply LOD to a feature collection.
   *
   * @param features - Input features
   * @param zoom - Current zoom level
   * @returns Processed features (limited and simplified)
   */
  applyLOD(features: GeoJSON.Feature[], zoom: number): GeoJSON.Feature[] {
    const level = this.getLODLevel(zoom);

    // Limit feature count
    const limited = features.slice(0, level.maxFeatures);

    // Simplify geometries
    if (level.simplification < 1.0) {
      return limited.map((f) => this.simplifyFeature(f, level));
    }

    return limited;
  }

  /**
   * Calculate tolerance from simplification factor.
   */
  private calculateTolerance(simplification: number): number {
    // Convert 0-1 simplification to tolerance
    // Lower simplification = higher tolerance (more aggressive simplification)
    return (1 - simplification) * 0.001; // Adjust multiplier as needed
  }

  /**
   * Simplify coordinates using Douglas-Peucker algorithm.
   */
  private simplifyCoords(
    coords: GeoJSON.Position[],
    tolerance: number,
    minPoints: number,
    isRing: boolean
  ): GeoJSON.Position[] {
    if (coords.length <= minPoints) {
      return coords;
    }

    const simplified = this.douglasPeucker(coords, tolerance);

    // Ensure minimum points
    if (simplified.length < minPoints) {
      return this.uniformSample(coords, minPoints, isRing);
    }

    // Ensure ring is closed
    if (isRing && simplified.length >= 3) {
      const first = simplified[0];
      const last = simplified[simplified.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        simplified.push([...first]);
      }
    }

    return simplified;
  }

  /**
   * Douglas-Peucker line simplification.
   */
  private douglasPeucker(coords: GeoJSON.Position[], tolerance: number): GeoJSON.Position[] {
    if (coords.length <= 2) {
      return coords;
    }

    // Find point with maximum distance from line segment
    let maxDist = 0;
    let maxIndex = 0;
    const start = coords[0];
    const end = coords[coords.length - 1];

    for (let i = 1; i < coords.length - 1; i++) {
      const dist = this.perpendicularDistance(coords[i], start, end);
      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }

    // If max distance is greater than tolerance, recursively simplify
    if (maxDist > tolerance) {
      const left = this.douglasPeucker(coords.slice(0, maxIndex + 1), tolerance);
      const right = this.douglasPeucker(coords.slice(maxIndex), tolerance);

      // Combine results, avoiding duplicate point
      return [...left.slice(0, -1), ...right];
    }

    // Below tolerance, keep only endpoints
    return [start, end];
  }

  /**
   * Calculate perpendicular distance from point to line segment.
   */
  private perpendicularDistance(
    point: GeoJSON.Position,
    lineStart: GeoJSON.Position,
    lineEnd: GeoJSON.Position
  ): number {
    const dx = lineEnd[0] - lineStart[0];
    const dy = lineEnd[1] - lineStart[1];

    if (dx === 0 && dy === 0) {
      // Line is a point
      return Math.sqrt((point[0] - lineStart[0]) ** 2 + (point[1] - lineStart[1]) ** 2);
    }

    const t = Math.max(
      0,
      Math.min(
        1,
        ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / (dx * dx + dy * dy)
      )
    );

    const nearestX = lineStart[0] + t * dx;
    const nearestY = lineStart[1] + t * dy;

    return Math.sqrt((point[0] - nearestX) ** 2 + (point[1] - nearestY) ** 2);
  }

  /**
   * Uniformly sample points from coordinates.
   */
  private uniformSample(
    coords: GeoJSON.Position[],
    count: number,
    isRing: boolean
  ): GeoJSON.Position[] {
    if (coords.length <= count) {
      return coords;
    }

    // Protect against division by zero when count is 1
    if (count <= 1) {
      return coords.length > 0 ? [[...coords[0]]] : [];
    }

    const result: GeoJSON.Position[] = [];
    const step = (coords.length - 1) / (count - 1);

    for (let i = 0; i < count; i++) {
      const index = Math.min(Math.floor(i * step), coords.length - 1);
      result.push([...coords[index]]);
    }

    // Ensure ring is closed
    if (isRing && result.length >= 3) {
      const first = result[0];
      const last = result[result.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        result[result.length - 1] = [...first];
      }
    }

    return result;
  }

  /**
   * Update LOD configuration.
   *
   * @param config - Partial configuration to merge
   */
  updateConfig(config: Partial<LODConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      levels: config.levels || this.config.levels,
    };

    this.config.levels.sort((a, b) => a.minZoom - b.minZoom);
  }

  /**
   * Get current LOD configuration.
   *
   * @returns Current configuration
   */
  getConfig(): Readonly<LODConfig> {
    return this.config;
  }
}
