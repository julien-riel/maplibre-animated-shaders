/**
 * Tests for AdaptiveFrameRate
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AdaptiveFrameRate,
  DEFAULT_QUALITY_LEVELS,
  DEFAULT_ADAPTIVE_CONFIG,
  type QualityLevel,
} from '../../src/performance';

describe('AdaptiveFrameRate', () => {
  let afr: AdaptiveFrameRate;

  beforeEach(() => {
    afr = new AdaptiveFrameRate();
  });

  describe('constructor', () => {
    it('should initialize with default settings', () => {
      expect(afr.getCurrentFPS()).toBe(60); // Default target FPS
      expect(afr.getCurrentQuality().name).toBe('Ultra'); // Starts at highest
    });

    it('should accept custom target FPS', () => {
      const customAfr = new AdaptiveFrameRate({ targetFPS: 30 });
      expect(customAfr.getConfig().targetFPS).toBe(30);
    });

    it('should accept custom quality levels', () => {
      const customLevels: QualityLevel[] = [
        {
          name: 'Custom',
          quality: 0.5,
          lodSimplification: 0.5,
          maxFeatures: 100,
          enablePostProcessing: false,
          shadowQuality: 0,
        },
      ];

      const customAfr = new AdaptiveFrameRate({ qualityLevels: customLevels });
      expect(customAfr.getCurrentQuality().maxFeatures).toBe(100);
    });
  });

  describe('recordFrame', () => {
    it('should record frame times', () => {
      afr.recordFrame(16.67); // 60 FPS
      afr.recordFrame(16.67);
      afr.recordFrame(16.67);

      const stats = afr.getStats();
      expect(stats.avgFrameTime).toBeCloseTo(16.67, 1);
    });

    it('should calculate average FPS', () => {
      // Record multiple frames at 60 FPS
      for (let i = 0; i < 30; i++) {
        afr.recordFrame(16.67);
      }

      const stats = afr.getStats();
      expect(stats.fps).toBeCloseTo(60, 0);
    });

    it('should track min and max frame times', () => {
      afr.recordFrame(10); // Fast frame
      afr.recordFrame(50); // Slow frame
      afr.recordFrame(16.67);

      const stats = afr.getStats();
      expect(stats.minFrameTime).toBe(10);
      expect(stats.maxFrameTime).toBe(50);
    });
  });

  describe('quality adjustment', () => {
    it('should lower quality when FPS drops', () => {
      // Start at highest quality
      expect(afr.getCurrentQualityIndex()).toBe(DEFAULT_QUALITY_LEVELS.length - 1);

      // Simulate poor performance (20 FPS) over many frames
      for (let i = 0; i < 60; i++) {
        afr.recordFrame(50); // 20 FPS
      }

      // Quality should have decreased
      expect(afr.getCurrentQualityIndex()).toBeLessThan(DEFAULT_QUALITY_LEVELS.length - 1);
    });

    it('should not adjust when disabled', () => {
      afr.setEnabled(false);
      const initialIndex = afr.getCurrentQualityIndex();

      // Simulate poor performance
      for (let i = 0; i < 60; i++) {
        afr.recordFrame(50);
      }

      // Quality should not have changed
      expect(afr.getCurrentQualityIndex()).toBe(initialIndex);
    });

    it('should manually set quality level', () => {
      afr.setQualityLevel(0); // Lowest
      expect(afr.getCurrentQuality().name).toBe('Minimal');

      afr.setQualityLevel(2); // Medium
      expect(afr.getCurrentQuality().name).toBe('Medium');
    });

    it('should clamp quality level to valid range', () => {
      afr.setQualityLevel(-10);
      expect(afr.getCurrentQualityIndex()).toBe(0);

      afr.setQualityLevel(100);
      expect(afr.getCurrentQualityIndex()).toBe(DEFAULT_QUALITY_LEVELS.length - 1);
    });
  });

  describe('shouldSkipFrame', () => {
    it('should not skip frames at target FPS', () => {
      // Record good performance
      for (let i = 0; i < 10; i++) {
        afr.recordFrame(16.67);
      }

      expect(afr.shouldSkipFrame()).toBe(false);
    });

    it('should suggest skipping frames under extreme load', () => {
      // Record very poor performance (very high frame time)
      for (let i = 0; i < 10; i++) {
        afr.recordFrame(200); // 5 FPS, > 3x target
      }

      expect(afr.shouldSkipFrame()).toBe(true);
    });
  });

  describe('getRecommendedQuality', () => {
    it('should return quality factor based on current level', () => {
      afr.setQualityLevel(0); // Minimal
      expect(afr.getRecommendedQuality()).toBe(0.1);

      afr.setQualityLevel(4); // Ultra
      expect(afr.getRecommendedQuality()).toBe(1.0);
    });
  });

  describe('quality levels', () => {
    it('should return correct settings for each quality level', () => {
      for (let i = 0; i < DEFAULT_QUALITY_LEVELS.length; i++) {
        afr.setQualityLevel(i);
        const quality = afr.getCurrentQuality();

        expect(quality.quality).toBeDefined();
        expect(quality.maxFeatures).toBeDefined();
        expect(quality.lodSimplification).toBeDefined();
        expect(quality.enablePostProcessing).toBeDefined();
      }
    });

    it('should have increasing quality with higher levels', () => {
      let prevQuality = 0;

      for (let i = 0; i < DEFAULT_QUALITY_LEVELS.length; i++) {
        afr.setQualityLevel(i);
        const quality = afr.getCurrentQuality().quality;

        expect(quality).toBeGreaterThanOrEqual(prevQuality);
        prevQuality = quality;
      }
    });
  });

  describe('stats', () => {
    it('should provide comprehensive stats', () => {
      for (let i = 0; i < 30; i++) {
        afr.recordFrame(16.67);
      }

      const stats = afr.getStats();

      expect(stats).toHaveProperty('fps');
      expect(stats).toHaveProperty('avgFrameTime');
      expect(stats).toHaveProperty('minFrameTime');
      expect(stats).toHaveProperty('maxFrameTime');
      expect(stats).toHaveProperty('stdDev');
      expect(stats).toHaveProperty('qualityLevel');
      expect(stats).toHaveProperty('droppedFrames');
    });

    it('should count dropped frames', () => {
      // Record mix of good and bad frames
      for (let i = 0; i < 10; i++) {
        afr.recordFrame(16.67); // Good
        afr.recordFrame(50); // Dropped (> 2x target)
      }

      const stats = afr.getStats();
      expect(stats.droppedFrames).toBeGreaterThan(0);
    });

    it('should reset stats on demand', () => {
      for (let i = 0; i < 30; i++) {
        afr.recordFrame(16.67);
      }

      afr.reset();

      const stats = afr.getStats();
      expect(stats.droppedFrames).toBe(0);
    });
  });

  describe('callbacks', () => {
    it('should call onQualityChange when quality changes', () => {
      const callback = vi.fn();
      afr.onQualityChange = callback;

      afr.setQualityLevel(0);

      expect(callback).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(expect.any(Object), 0);
    });
  });

  describe('configuration', () => {
    it('should allow updating configuration', () => {
      afr.updateConfig({ targetFPS: 30 });
      expect(afr.getConfig().targetFPS).toBe(30);
    });

    it('should return readonly configuration', () => {
      const config = afr.getConfig();
      expect(config.targetFPS).toBe(60);
    });
  });

  describe('enable/disable', () => {
    it('should toggle enabled state', () => {
      expect(afr.isEnabled()).toBe(true);

      afr.setEnabled(false);
      expect(afr.isEnabled()).toBe(false);

      afr.setEnabled(true);
      expect(afr.isEnabled()).toBe(true);
    });

    it('should reset to highest quality when disabled', () => {
      afr.setQualityLevel(0);
      afr.setEnabled(false);

      expect(afr.getCurrentQualityIndex()).toBe(DEFAULT_QUALITY_LEVELS.length - 1);
    });
  });
});

describe('DEFAULT_QUALITY_LEVELS', () => {
  it('should have all expected quality levels', () => {
    expect(DEFAULT_QUALITY_LEVELS).toHaveLength(5);
    expect(DEFAULT_QUALITY_LEVELS[0].name).toBe('Minimal');
    expect(DEFAULT_QUALITY_LEVELS[4].name).toBe('Ultra');
  });

  it('should have valid settings for each preset', () => {
    for (const level of DEFAULT_QUALITY_LEVELS) {
      expect(level.quality).toBeGreaterThan(0);
      expect(level.quality).toBeLessThanOrEqual(1);
      expect(level.maxFeatures).toBeGreaterThan(0);
      expect(level.lodSimplification).toBeGreaterThanOrEqual(0);
      expect(typeof level.enablePostProcessing).toBe('boolean');
    }
  });
});

describe('DEFAULT_ADAPTIVE_CONFIG', () => {
  it('should have sensible defaults', () => {
    expect(DEFAULT_ADAPTIVE_CONFIG.targetFPS).toBe(60);
    expect(DEFAULT_ADAPTIVE_CONFIG.minFPS).toBe(30);
    expect(DEFAULT_ADAPTIVE_CONFIG.sampleSize).toBeGreaterThan(0);
  });
});
