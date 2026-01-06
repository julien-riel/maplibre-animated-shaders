/**
 * Time Offset Calculator
 *
 * Calculates per-feature time offsets for animation desynchronization.
 * Provides various strategies for creating visual variety:
 *
 * - **Fixed**: Same offset for all features
 * - **Random**: Random offset within a configurable range
 * - **Hash**: Deterministic offset based on feature property hash
 * - **Property**: Offset directly from feature property value
 *
 * @module timing/TimeOffsetCalculator
 *
 * @example
 * ```typescript
 * import { TimeOffsetCalculator } from 'maplibre-animated-shaders';
 *
 * const calculator = new TimeOffsetCalculator('my-seed');
 *
 * // Random offsets within animation period
 * const offsets = calculator.calculateOffsets(features, {
 *   timeOffset: 'random',
 *   period: 2.0
 * });
 *
 * // Hash-based offsets (deterministic)
 * const hashOffsets = calculator.calculateOffsets(features, {
 *   timeOffset: ['hash', 'id'],
 *   period: 1.5
 * });
 *
 * // Property-based offsets
 * const propOffsets = calculator.calculateOffsets(features, {
 *   timeOffset: ['get', 'animationDelay']
 * });
 * ```
 */

import type { AnimationTimingConfig, TimeOffsetValue } from '../types';

/**
 * Calculates time offsets for features based on various strategies.
 *
 * This class provides reproducible, seeded random number generation
 * for consistent animation offsets across page loads. Supports:
 * - Fixed numeric offsets
 * - Seeded random offsets
 * - Hash-based offsets for deterministic variety
 * - Property-based offsets from feature data
 *
 * @example
 * ```typescript
 * const calculator = new TimeOffsetCalculator(12345);
 *
 * // Calculate offsets for point features
 * const offsets = calculator.calculateOffsets(features, {
 *   timeOffset: 'random',
 *   period: 1.0,
 *   randomSeed: 42
 * });
 *
 * // Expand for multi-vertex geometries
 * const expanded = calculator.calculateOffsetsExpanded(features, config, 4);
 * ```
 */
export class TimeOffsetCalculator {
  private seed: number;

  /**
   * Create a new time offset calculator.
   *
   * @param seed - Seed for random number generation (number or string)
   *
   * @example
   * ```typescript
   * // Numeric seed
   * const calc1 = new TimeOffsetCalculator(12345);
   *
   * // String seed (hashed to number)
   * const calc2 = new TimeOffsetCalculator('my-layer-seed');
   * ```
   */
  constructor(seed: number | string = 12345) {
    this.seed = typeof seed === 'string' ? this.hashString(seed) : seed;
  }

  /**
   * Calculate time offsets for an array of features.
   *
   * @param features - Array of GeoJSON features
   * @param config - Animation timing configuration
   * @returns Float32Array of time offsets, one per feature
   *
   * @example
   * ```typescript
   * const offsets = calculator.calculateOffsets(features, {
   *   timeOffset: 'random',
   *   period: 2.0,
   *   randomSeed: 42
   * });
   *
   * // Use in shader
   * const time = u_time + a_timeOffset;
   * ```
   */
  calculateOffsets(features: GeoJSON.Feature[], config: AnimationTimingConfig): Float32Array {
    const offsets = new Float32Array(features.length);
    const period = config.period ?? 1;
    const randomSeed =
      config.randomSeed !== undefined
        ? typeof config.randomSeed === 'string'
          ? this.hashString(config.randomSeed)
          : config.randomSeed
        : this.seed;

    for (let i = 0; i < features.length; i++) {
      offsets[i] = this.calculateSingleOffset(
        features[i],
        config.timeOffset,
        period,
        randomSeed,
        i
      );
    }

    return offsets;
  }

  /**
   * Calculate offset for a single feature
   */
  private calculateSingleOffset(
    feature: GeoJSON.Feature,
    timeOffset: TimeOffsetValue | undefined,
    period: number,
    randomSeed: number,
    index: number
  ): number {
    // No offset configured
    if (timeOffset === undefined) {
      return 0;
    }

    // Fixed numeric offset
    if (typeof timeOffset === 'number') {
      return timeOffset;
    }

    // Random offset within [0, period]
    if (timeOffset === 'random') {
      return this.seededRandom(randomSeed, index) * period;
    }

    // Array expression: ['get', 'propertyName'] or ['hash', 'propertyName']
    if (Array.isArray(timeOffset)) {
      const [operation, propertyName] = timeOffset;

      if (operation === 'get') {
        // Get value directly from feature property
        const value = feature.properties?.[propertyName];
        return typeof value === 'number' ? value : 0;
      }

      if (operation === 'hash') {
        // Hash the property value for a stable offset
        const prop = feature.properties?.[propertyName] ?? index;
        return this.hashString(String(prop)) * period;
      }
    }

    // Range object: { min, max }
    if (typeof timeOffset === 'object' && 'min' in timeOffset && 'max' in timeOffset) {
      const { min, max } = timeOffset;
      return min + this.seededRandom(randomSeed, index) * (max - min);
    }

    return 0;
  }

  /**
   * Generate a stable hash from a string (normalized to [0, 1])
   * Uses MurmurHash3-like mixing for better distribution
   */
  private hashString(str: string): number {
    let h = 0x811c9dc5; // FNV offset basis
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193); // FNV prime
    }
    // Additional mixing for better distribution
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return (h >>> 0) / 0xffffffff;
  }

  /**
   * Generate a seeded random number (normalized to [0, 1])
   * Uses a combination of seed and index for reproducible randomness
   */
  private seededRandom(seed: number, index: number): number {
    // Mix seed and index together for better distribution
    let h = seed ^ (index * 0x9e3779b9);
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return (h >>> 0) / 0xffffffff;
  }

  /**
   * Create offsets for features that expand to multiple vertices.
   *
   * Use this for instanced rendering where each feature maps to multiple
   * vertices (e.g., point sprites with 4 vertices per quad).
   *
   * @param features - Array of GeoJSON features
   * @param config - Animation timing configuration
   * @param verticesPerFeature - Number of vertices per feature (e.g., 4 for quads)
   * @returns Float32Array with offsets repeated for each vertex
   *
   * @example
   * ```typescript
   * // Point sprites with 4 vertices each
   * const expanded = calculator.calculateOffsetsExpanded(features, {
   *   timeOffset: 'random',
   *   period: 1.0
   * }, 4);
   *
   * // expanded.length === features.length * 4
   * ```
   */
  calculateOffsetsExpanded(
    features: GeoJSON.Feature[],
    config: AnimationTimingConfig,
    verticesPerFeature: number
  ): Float32Array {
    const featureOffsets = this.calculateOffsets(features, config);
    const expanded = new Float32Array(features.length * verticesPerFeature);

    for (let i = 0; i < features.length; i++) {
      const offset = featureOffsets[i];
      const baseIndex = i * verticesPerFeature;
      for (let j = 0; j < verticesPerFeature; j++) {
        expanded[baseIndex + j] = offset;
      }
    }

    return expanded;
  }
}

/**
 * Default TimeOffsetCalculator instance
 */
export const defaultTimeOffsetCalculator = new TimeOffsetCalculator();

export default TimeOffsetCalculator;
