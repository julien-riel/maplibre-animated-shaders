/**
 * Tests for FeatureAnimationStateManager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FeatureAnimationStateManager } from '../src/interaction/FeatureAnimationStateManager';
import type { InteractivityConfig } from '../src/types';

/**
 * Create test features
 */
function createTestFeatures(count: number): GeoJSON.Feature[] {
  return Array.from({ length: count }, (_, i) => ({
    type: 'Feature' as const,
    id: i,
    properties: { name: `Feature ${i}`, customId: `custom-${i}` },
    geometry: { type: 'Point' as const, coordinates: [i, i] },
  }));
}

describe('FeatureAnimationStateManager', () => {
  let manager: FeatureAnimationStateManager;

  beforeEach(() => {
    manager = new FeatureAnimationStateManager();
  });

  describe('constructor', () => {
    it('should create with default playing state', () => {
      const features = createTestFeatures(2);
      manager.initializeFromFeatures(features);

      const state = manager.getState(0);
      expect(state?.isPlaying).toBe(true);
    });

    it('should create with paused initial state', () => {
      const pausedManager = new FeatureAnimationStateManager({ initialState: 'paused' });
      pausedManager.initializeFromFeatures(createTestFeatures(1));

      const state = pausedManager.getState(0);
      expect(state?.isPlaying).toBe(false);
    });

    it('should create with stopped initial state', () => {
      const stoppedManager = new FeatureAnimationStateManager({ initialState: 'stopped' });
      stoppedManager.initializeFromFeatures(createTestFeatures(1));

      const state = stoppedManager.getState(0);
      expect(state?.isPlaying).toBe(false);
    });

    it('should use custom featureIdProperty', () => {
      const config: InteractivityConfig = { featureIdProperty: 'customId' };
      const customManager = new FeatureAnimationStateManager(config);
      customManager.initializeFromFeatures(createTestFeatures(1));

      const state = customManager.getState('custom-0');
      expect(state).toBeDefined();
      expect(state?.featureId).toBe('custom-0');
    });
  });

  describe('initializeFromFeatures', () => {
    it('should initialize states for all features', () => {
      const features = createTestFeatures(5);
      manager.initializeFromFeatures(features);

      expect(manager.getFeatureCount()).toBe(5);
      for (let i = 0; i < 5; i++) {
        expect(manager.getState(i)).toBeDefined();
      }
    });

    it('should clear previous states on re-initialization', () => {
      manager.initializeFromFeatures(createTestFeatures(3));
      expect(manager.getFeatureCount()).toBe(3);

      manager.initializeFromFeatures(createTestFeatures(2));
      expect(manager.getFeatureCount()).toBe(2);
      expect(manager.getState(2)).toBeUndefined();
    });

    it('should use feature.id when available', () => {
      const features = [
        { type: 'Feature' as const, id: 'feat-a', properties: {}, geometry: { type: 'Point' as const, coordinates: [0, 0] } },
      ];
      manager.initializeFromFeatures(features);

      expect(manager.getState('feat-a')).toBeDefined();
    });

    it('should fall back to index when no id', () => {
      const features = [
        { type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: [0, 0] } },
      ];
      manager.initializeFromFeatures(features);

      expect(manager.getState(0)).toBeDefined();
    });

    it('should mark as dirty after initialization', () => {
      manager.initializeFromFeatures(createTestFeatures(1));
      expect(manager.isDirty()).toBe(true);
    });
  });

  describe('getFeatureIdFromMapLibreFeature', () => {
    it('should return feature.id by default', () => {
      const feature = { id: 42, properties: {} };
      expect(manager.getFeatureIdFromMapLibreFeature(feature)).toBe(42);
    });

    it('should return fallbackIndex when no id', () => {
      const feature = { properties: {} };
      expect(manager.getFeatureIdFromMapLibreFeature(feature, 5)).toBe(5);
    });

    it('should use featureIdProperty when configured', () => {
      const customManager = new FeatureAnimationStateManager({ featureIdProperty: 'myId' });
      const feature = { id: 1, properties: { myId: 'custom-id' } };
      expect(customManager.getFeatureIdFromMapLibreFeature(feature)).toBe('custom-id');
    });
  });

  describe('playFeature', () => {
    beforeEach(() => {
      manager.initializeFromFeatures(createTestFeatures(3));
      manager.pauseAll();
    });

    it('should set isPlaying to true', () => {
      manager.playFeature(1);
      expect(manager.getState(1)?.isPlaying).toBe(true);
    });

    it('should mark as dirty', () => {
      manager.clearDirty();
      manager.playFeature(1);
      expect(manager.isDirty()).toBe(true);
    });

    it('should not mark dirty if already playing', () => {
      manager.playFeature(1);
      manager.clearDirty();
      manager.playFeature(1); // Already playing
      expect(manager.isDirty()).toBe(false);
    });

    it('should do nothing for non-existent feature', () => {
      manager.clearDirty();
      manager.playFeature(999);
      expect(manager.isDirty()).toBe(false);
    });
  });

  describe('pauseFeature', () => {
    beforeEach(() => {
      manager.initializeFromFeatures(createTestFeatures(3));
    });

    it('should set isPlaying to false', () => {
      manager.pauseFeature(1);
      expect(manager.getState(1)?.isPlaying).toBe(false);
    });

    it('should store localTime when pausing', () => {
      manager.tick(5.0, 0.016);
      manager.pauseFeature(1);
      expect(manager.getState(1)?.localTime).toBe(5.0);
    });

    it('should mark as dirty', () => {
      manager.clearDirty();
      manager.pauseFeature(1);
      expect(manager.isDirty()).toBe(true);
    });

    it('should not mark dirty if already paused', () => {
      manager.pauseFeature(1);
      manager.clearDirty();
      manager.pauseFeature(1); // Already paused
      expect(manager.isDirty()).toBe(false);
    });
  });

  describe('resetFeature', () => {
    beforeEach(() => {
      manager.initializeFromFeatures(createTestFeatures(2));
      manager.tick(5.0, 0.016);
      manager.pauseFeature(0);
    });

    it('should reset localTime to 0', () => {
      manager.resetFeature(0);
      expect(manager.getState(0)?.localTime).toBe(0);
    });

    it('should reset playCount to 0', () => {
      manager.setState(0, { playCount: 5 });
      manager.resetFeature(0);
      expect(manager.getState(0)?.playCount).toBe(0);
    });

    it('should mark as dirty', () => {
      manager.clearDirty();
      manager.resetFeature(0);
      expect(manager.isDirty()).toBe(true);
    });
  });

  describe('toggleFeature', () => {
    beforeEach(() => {
      manager.initializeFromFeatures(createTestFeatures(2));
    });

    it('should pause when playing', () => {
      expect(manager.getState(0)?.isPlaying).toBe(true);
      manager.toggleFeature(0);
      expect(manager.getState(0)?.isPlaying).toBe(false);
    });

    it('should play when paused', () => {
      manager.pauseFeature(0);
      manager.toggleFeature(0);
      expect(manager.getState(0)?.isPlaying).toBe(true);
    });
  });

  describe('playOnce', () => {
    it('should call playFeature', () => {
      manager.initializeFromFeatures(createTestFeatures(1));
      manager.pauseFeature(0);
      manager.playOnce(0);
      expect(manager.getState(0)?.isPlaying).toBe(true);
    });
  });

  describe('playAll', () => {
    beforeEach(() => {
      manager.initializeFromFeatures(createTestFeatures(3));
      manager.pauseAll();
    });

    it('should play all features', () => {
      manager.playAll();
      for (let i = 0; i < 3; i++) {
        expect(manager.getState(i)?.isPlaying).toBe(true);
      }
    });

    it('should mark as dirty', () => {
      manager.clearDirty();
      manager.playAll();
      expect(manager.isDirty()).toBe(true);
    });
  });

  describe('pauseAll', () => {
    beforeEach(() => {
      manager.initializeFromFeatures(createTestFeatures(3));
    });

    it('should pause all features', () => {
      manager.pauseAll();
      for (let i = 0; i < 3; i++) {
        expect(manager.getState(i)?.isPlaying).toBe(false);
      }
    });

    it('should store localTime for all features', () => {
      manager.tick(10.0, 0.016);
      manager.pauseAll();
      for (let i = 0; i < 3; i++) {
        expect(manager.getState(i)?.localTime).toBe(10.0);
      }
    });
  });

  describe('resetAll', () => {
    beforeEach(() => {
      manager.initializeFromFeatures(createTestFeatures(2));
      manager.tick(5.0, 0.016);
      manager.pauseAll();
    });

    it('should reset all features', () => {
      manager.resetAll();
      for (let i = 0; i < 2; i++) {
        expect(manager.getState(i)?.localTime).toBe(0);
        expect(manager.getState(i)?.playCount).toBe(0);
      }
    });
  });

  describe('getState / getFeatureState', () => {
    it('should return state for existing feature', () => {
      manager.initializeFromFeatures(createTestFeatures(1));
      expect(manager.getState(0)).toBeDefined();
      expect(manager.getFeatureState(0)).toBeDefined();
    });

    it('should return undefined for non-existent feature', () => {
      manager.initializeFromFeatures(createTestFeatures(1));
      expect(manager.getState(999)).toBeUndefined();
    });
  });

  describe('getAllStates', () => {
    it('should return a copy of all states', () => {
      manager.initializeFromFeatures(createTestFeatures(3));
      const states = manager.getAllStates();

      expect(states.size).toBe(3);
      expect(states.get(0)).toBeDefined();
      expect(states.get(1)).toBeDefined();
      expect(states.get(2)).toBeDefined();
    });

    it('should return a copy, not the original', () => {
      manager.initializeFromFeatures(createTestFeatures(1));
      const states = manager.getAllStates();
      states.delete(0);

      expect(manager.getState(0)).toBeDefined();
    });
  });

  describe('setState', () => {
    beforeEach(() => {
      manager.initializeFromFeatures(createTestFeatures(1));
    });

    it('should update isPlaying', () => {
      manager.setState(0, { isPlaying: false });
      expect(manager.getState(0)?.isPlaying).toBe(false);
    });

    it('should update localTime', () => {
      manager.setState(0, { localTime: 42 });
      expect(manager.getState(0)?.localTime).toBe(42);
    });

    it('should update playCount', () => {
      manager.setState(0, { playCount: 10 });
      expect(manager.getState(0)?.playCount).toBe(10);
    });

    it('should mark as dirty', () => {
      manager.clearDirty();
      manager.setState(0, { isPlaying: false });
      expect(manager.isDirty()).toBe(true);
    });
  });

  describe('tick', () => {
    it('should store global time', () => {
      manager.initializeFromFeatures(createTestFeatures(1));
      manager.tick(3.5, 0.016);
      manager.pauseFeature(0);

      expect(manager.getState(0)?.localTime).toBe(3.5);
    });
  });

  describe('generateBufferData', () => {
    beforeEach(() => {
      manager.initializeFromFeatures(createTestFeatures(3));
    });

    it('should generate buffer data with correct size', () => {
      const { isPlayingData, localTimeData } = manager.generateBufferData(1);

      expect(isPlayingData.length).toBe(3);
      expect(localTimeData.length).toBe(3);
    });

    it('should expand data for multiple vertices per feature', () => {
      const { isPlayingData, localTimeData } = manager.generateBufferData(4);

      expect(isPlayingData.length).toBe(12); // 3 features * 4 vertices
      expect(localTimeData.length).toBe(12);
    });

    it('should set correct isPlaying values', () => {
      manager.pauseFeature(1);
      const { isPlayingData } = manager.generateBufferData(1);

      expect(isPlayingData[0]).toBe(1.0); // playing
      expect(isPlayingData[1]).toBe(0.0); // paused
      expect(isPlayingData[2]).toBe(1.0); // playing
    });

    it('should set correct localTime values', () => {
      manager.tick(5.0, 0.016);
      manager.pauseFeature(1);

      const { localTimeData } = manager.generateBufferData(1);

      expect(localTimeData[0]).toBe(0);
      expect(localTimeData[1]).toBe(5.0);
      expect(localTimeData[2]).toBe(0);
    });
  });

  describe('isDirty / clearDirty', () => {
    it('should be dirty after initialization', () => {
      manager.initializeFromFeatures(createTestFeatures(1));
      expect(manager.isDirty()).toBe(true);
    });

    it('should not be dirty after clearDirty', () => {
      manager.initializeFromFeatures(createTestFeatures(1));
      manager.clearDirty();
      expect(manager.isDirty()).toBe(false);
    });
  });

  describe('getFeatureCount', () => {
    it('should return correct count', () => {
      manager.initializeFromFeatures(createTestFeatures(5));
      expect(manager.getFeatureCount()).toBe(5);
    });

    it('should return 0 before initialization', () => {
      expect(manager.getFeatureCount()).toBe(0);
    });
  });
});
