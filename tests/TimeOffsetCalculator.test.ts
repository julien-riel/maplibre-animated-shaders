/**
 * Tests for TimeOffsetCalculator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TimeOffsetCalculator, defaultTimeOffsetCalculator } from '../src/timing/TimeOffsetCalculator';
import type { AnimationTimingConfig } from '../src/types';

/**
 * Create test features
 */
function createTestFeatures(count: number): GeoJSON.Feature[] {
  return Array.from({ length: count }, (_, i) => ({
    type: 'Feature' as const,
    id: i,
    properties: { offset: i * 0.1, name: `Feature ${i}` },
    geometry: { type: 'Point' as const, coordinates: [i, i] },
  }));
}

describe('TimeOffsetCalculator', () => {
  let calculator: TimeOffsetCalculator;

  beforeEach(() => {
    calculator = new TimeOffsetCalculator();
  });

  describe('constructor', () => {
    it('should create with default seed', () => {
      const calc = new TimeOffsetCalculator();
      expect(calc).toBeDefined();
    });

    it('should create with numeric seed', () => {
      const calc = new TimeOffsetCalculator(42);
      expect(calc).toBeDefined();
    });

    it('should create with string seed', () => {
      const calc = new TimeOffsetCalculator('my-seed');
      expect(calc).toBeDefined();
    });
  });

  describe('calculateOffsets', () => {
    describe('no timeOffset', () => {
      it('should return all zeros when timeOffset is undefined', () => {
        const features = createTestFeatures(3);
        const config: AnimationTimingConfig = {};

        const offsets = calculator.calculateOffsets(features, config);

        expect(offsets.length).toBe(3);
        expect(offsets[0]).toBe(0);
        expect(offsets[1]).toBe(0);
        expect(offsets[2]).toBe(0);
      });
    });

    describe('fixed numeric offset', () => {
      it('should return same offset for all features', () => {
        const features = createTestFeatures(3);
        const config: AnimationTimingConfig = { timeOffset: 0.5 };

        const offsets = calculator.calculateOffsets(features, config);

        expect(offsets[0]).toBe(0.5);
        expect(offsets[1]).toBe(0.5);
        expect(offsets[2]).toBe(0.5);
      });
    });

    describe('random offset', () => {
      it('should return values within [0, period]', () => {
        const features = createTestFeatures(10);
        const config: AnimationTimingConfig = { timeOffset: 'random', period: 2 };

        const offsets = calculator.calculateOffsets(features, config);

        for (let i = 0; i < offsets.length; i++) {
          expect(offsets[i]).toBeGreaterThanOrEqual(0);
          expect(offsets[i]).toBeLessThanOrEqual(2);
        }
      });

      it('should be deterministic with same seed', () => {
        const features = createTestFeatures(5);
        const config: AnimationTimingConfig = { timeOffset: 'random', randomSeed: 12345 };

        const calc1 = new TimeOffsetCalculator(12345);
        const calc2 = new TimeOffsetCalculator(12345);

        const offsets1 = calc1.calculateOffsets(features, config);
        const offsets2 = calc2.calculateOffsets(features, config);

        for (let i = 0; i < offsets1.length; i++) {
          expect(offsets1[i]).toBe(offsets2[i]);
        }
      });

      it('should support string randomSeed', () => {
        const features = createTestFeatures(3);
        const config: AnimationTimingConfig = { timeOffset: 'random', randomSeed: 'my-seed' };

        const offsets = calculator.calculateOffsets(features, config);

        expect(offsets.length).toBe(3);
      });
    });

    describe('property-based offset ["get", propertyName]', () => {
      it('should use property value as offset', () => {
        const features = createTestFeatures(3);
        const config: AnimationTimingConfig = { timeOffset: ['get', 'offset'] };

        const offsets = calculator.calculateOffsets(features, config);

        expect(offsets[0]).toBe(0);
        expect(offsets[1]).toBeCloseTo(0.1);
        expect(offsets[2]).toBeCloseTo(0.2);
      });

      it('should return 0 for non-numeric property', () => {
        const features = createTestFeatures(1);
        const config: AnimationTimingConfig = { timeOffset: ['get', 'name'] };

        const offsets = calculator.calculateOffsets(features, config);

        expect(offsets[0]).toBe(0);
      });

      it('should return 0 for missing property', () => {
        const features = createTestFeatures(1);
        const config: AnimationTimingConfig = { timeOffset: ['get', 'nonexistent'] };

        const offsets = calculator.calculateOffsets(features, config);

        expect(offsets[0]).toBe(0);
      });
    });

    describe('hash-based offset ["hash", propertyName]', () => {
      it('should generate hash-based offset', () => {
        const features = createTestFeatures(3);
        const config: AnimationTimingConfig = { timeOffset: ['hash', 'name'], period: 1 };

        const offsets = calculator.calculateOffsets(features, config);

        // Hash should produce different values for different names
        expect(offsets[0]).not.toBe(offsets[1]);
        expect(offsets[1]).not.toBe(offsets[2]);
      });

      it('should be normalized to [0, period]', () => {
        const features = createTestFeatures(10);
        const config: AnimationTimingConfig = { timeOffset: ['hash', 'name'], period: 2 };

        const offsets = calculator.calculateOffsets(features, config);

        for (let i = 0; i < offsets.length; i++) {
          expect(offsets[i]).toBeGreaterThanOrEqual(0);
          expect(offsets[i]).toBeLessThanOrEqual(2);
        }
      });

      it('should use index as fallback for missing property', () => {
        const features = [
          { type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: [0, 0] } },
        ];
        const config: AnimationTimingConfig = { timeOffset: ['hash', 'missing'], period: 1 };

        const offsets = calculator.calculateOffsets(features, config);

        expect(offsets[0]).toBeGreaterThanOrEqual(0);
        expect(offsets[0]).toBeLessThanOrEqual(1);
      });
    });

    describe('range offset { min, max }', () => {
      it('should generate offsets within range', () => {
        const features = createTestFeatures(10);
        const config: AnimationTimingConfig = { timeOffset: { min: 0.5, max: 1.5 } };

        const offsets = calculator.calculateOffsets(features, config);

        for (let i = 0; i < offsets.length; i++) {
          expect(offsets[i]).toBeGreaterThanOrEqual(0.5);
          expect(offsets[i]).toBeLessThanOrEqual(1.5);
        }
      });

      it('should be deterministic with same seed', () => {
        const features = createTestFeatures(5);
        const config: AnimationTimingConfig = { timeOffset: { min: 0, max: 1 }, randomSeed: 42 };

        const calc1 = new TimeOffsetCalculator(42);
        const calc2 = new TimeOffsetCalculator(42);

        const offsets1 = calc1.calculateOffsets(features, config);
        const offsets2 = calc2.calculateOffsets(features, config);

        for (let i = 0; i < offsets1.length; i++) {
          expect(offsets1[i]).toBe(offsets2[i]);
        }
      });
    });

    describe('period', () => {
      it('should use default period of 1', () => {
        const features = createTestFeatures(3);
        const config: AnimationTimingConfig = { timeOffset: 'random' };

        const offsets = calculator.calculateOffsets(features, config);

        for (let i = 0; i < offsets.length; i++) {
          expect(offsets[i]).toBeGreaterThanOrEqual(0);
          expect(offsets[i]).toBeLessThanOrEqual(1);
        }
      });

      it('should scale random offsets by period', () => {
        const features = createTestFeatures(10);
        const config: AnimationTimingConfig = { timeOffset: 'random', period: 5 };

        const offsets = calculator.calculateOffsets(features, config);

        let hasLargeOffset = false;
        for (let i = 0; i < offsets.length; i++) {
          if (offsets[i] > 1) hasLargeOffset = true;
          expect(offsets[i]).toBeLessThanOrEqual(5);
        }
        expect(hasLargeOffset).toBe(true);
      });
    });
  });

  describe('calculateOffsetsExpanded', () => {
    it('should expand offsets for multi-vertex features', () => {
      const features = createTestFeatures(2);
      const config: AnimationTimingConfig = { timeOffset: 0.5 };

      const offsets = calculator.calculateOffsetsExpanded(features, config, 4);

      expect(offsets.length).toBe(8); // 2 features * 4 vertices

      // All vertices of first feature should have same offset
      expect(offsets[0]).toBe(0.5);
      expect(offsets[1]).toBe(0.5);
      expect(offsets[2]).toBe(0.5);
      expect(offsets[3]).toBe(0.5);

      // All vertices of second feature should have same offset
      expect(offsets[4]).toBe(0.5);
      expect(offsets[5]).toBe(0.5);
      expect(offsets[6]).toBe(0.5);
      expect(offsets[7]).toBe(0.5);
    });

    it('should preserve per-feature offset variation', () => {
      const features = createTestFeatures(2);
      const config: AnimationTimingConfig = { timeOffset: ['get', 'offset'] };

      const offsets = calculator.calculateOffsetsExpanded(features, config, 2);

      // Feature 0 has offset 0
      expect(offsets[0]).toBe(0);
      expect(offsets[1]).toBe(0);

      // Feature 1 has offset 0.1
      expect(offsets[2]).toBeCloseTo(0.1);
      expect(offsets[3]).toBeCloseTo(0.1);
    });
  });

  describe('defaultTimeOffsetCalculator', () => {
    it('should be a valid TimeOffsetCalculator instance', () => {
      expect(defaultTimeOffsetCalculator).toBeInstanceOf(TimeOffsetCalculator);
    });

    it('should work correctly', () => {
      const features = createTestFeatures(3);
      const config: AnimationTimingConfig = { timeOffset: 1.0 };

      const offsets = defaultTimeOffsetCalculator.calculateOffsets(features, config);

      expect(offsets.length).toBe(3);
    });
  });
});
