/**
 * Tests for ShaderTransition
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShaderTransition, Easing, chainTransitions, type TransitionConfig } from '../../src/transitions';
import type { ShaderConfig } from '../../src/types';

describe('ShaderTransition', () => {
  let transition: ShaderTransition;

  beforeEach(() => {
    transition = new ShaderTransition();
  });

  describe('start', () => {
    it('should initialize transition', () => {
      const from: ShaderConfig = { color: '#ff0000', speed: 1.0 };
      const to: ShaderConfig = { color: '#00ff00', speed: 2.0 };

      transition.start(from, to, { duration: 1000 });

      expect(transition.isActive()).toBe(true);
      expect(transition.getProgress()).toBe(0);
    });

    it('should set correct duration', () => {
      const from: ShaderConfig = { value: 0 };
      const to: ShaderConfig = { value: 100 };

      transition.start(from, to, { duration: 500 });

      const state = transition.getState();
      expect(state.duration).toBe(500);
    });
  });

  describe('update', () => {
    it('should advance progress', () => {
      const from: ShaderConfig = { value: 0 };
      const to: ShaderConfig = { value: 100 };

      transition.start(from, to, { duration: 1000 });
      transition.update(500); // 50%

      expect(transition.getProgress()).toBeCloseTo(0.5, 1);
    });

    it('should complete at end of duration', () => {
      const from: ShaderConfig = { value: 0 };
      const to: ShaderConfig = { value: 100 };

      transition.start(from, to, { duration: 1000 });
      transition.update(1000);

      expect(transition.isActive()).toBe(false);
      expect(transition.getProgress()).toBe(1);
    });

    it('should call onComplete callback', () => {
      const onComplete = vi.fn();
      const from: ShaderConfig = { value: 0 };
      const to: ShaderConfig = { value: 100 };

      transition.start(from, to, { duration: 500, onComplete });
      transition.update(500);

      expect(onComplete).toHaveBeenCalled();
    });

    it('should call onUpdate callback with progress', () => {
      const onUpdate = vi.fn();
      const from: ShaderConfig = { value: 0 };
      const to: ShaderConfig = { value: 100 };

      transition.start(from, to, { duration: 1000, onUpdate });
      transition.update(500);

      expect(onUpdate).toHaveBeenCalled();
    });

    it('should not update when not active', () => {
      transition.update(100);

      expect(transition.getProgress()).toBe(0);
    });
  });

  describe('getCurrentConfig', () => {
    it('should interpolate numeric values', () => {
      const from: ShaderConfig = { value: 0 };
      const to: ShaderConfig = { value: 100 };

      transition.start(from, to, { duration: 1000, easing: Easing.linear });
      transition.update(500); // 50%

      const current = transition.getCurrentConfig();
      expect(current.value).toBeCloseTo(50, 1);
    });

    it('should interpolate colors', () => {
      const from: ShaderConfig = { color: '#ff0000' };
      const to: ShaderConfig = { color: '#00ff00' };

      transition.start(from, to, { duration: 1000, easing: Easing.linear });
      transition.update(500); // 50%

      const current = transition.getCurrentConfig();
      // Should be somewhere between red and green
      expect(current.color).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should snap boolean values at 50%', () => {
      const from: ShaderConfig = { enabled: true };
      const to: ShaderConfig = { enabled: false };

      transition.start(from, to, { duration: 1000, easing: Easing.linear });

      transition.update(400); // 40%
      expect(transition.getCurrentConfig().enabled).toBe(true);

      transition.update(200); // 60%
      expect(transition.getCurrentConfig().enabled).toBe(false);
    });

    it('should interpolate array values', () => {
      const from: ShaderConfig = { position: [0, 0, 0] };
      const to: ShaderConfig = { position: [10, 20, 30] };

      transition.start(from, to, { duration: 1000, easing: Easing.linear });
      transition.update(500); // 50%

      const current = transition.getCurrentConfig();
      expect(current.position).toEqual([5, 10, 15]);
    });

    it('should handle missing values', () => {
      const from: ShaderConfig = { a: 1 };
      const to: ShaderConfig = { b: 2 };

      transition.start(from, to, { duration: 1000 });
      transition.update(500);

      const current = transition.getCurrentConfig();
      expect(current.a).toBe(1);
      expect(current.b).toBe(2);
    });
  });

  describe('easing functions', () => {
    it('should apply linear easing', () => {
      const result = Easing.linear(0.5);
      expect(result).toBe(0.5);
    });

    it('should apply easeIn', () => {
      const result = Easing.easeIn(0.5);
      expect(result).toBe(0.25); // t * t
    });

    it('should apply easeOut', () => {
      const result = Easing.easeOut(0.5);
      expect(result).toBe(0.75); // t * (2 - t)
    });

    it('should apply easeInOut', () => {
      expect(Easing.easeInOut(0)).toBe(0);
      expect(Easing.easeInOut(1)).toBe(1);
      expect(Easing.easeInOut(0.5)).toBe(0.5);
    });

    it('should apply easeInCubic', () => {
      const result = Easing.easeInCubic(0.5);
      expect(result).toBe(0.125); // t * t * t
    });

    it('should apply easeOutCubic', () => {
      expect(Easing.easeOutCubic(0)).toBe(0);
      expect(Easing.easeOutCubic(1)).toBe(1);
    });

    it('should apply easeInElastic', () => {
      expect(Easing.easeInElastic(0)).toBe(0);
      expect(Easing.easeInElastic(1)).toBe(1);
    });

    it('should apply easeOutElastic', () => {
      expect(Easing.easeOutElastic(0)).toBe(0);
      expect(Easing.easeOutElastic(1)).toBe(1);
    });

    it('should apply easeOutBounce', () => {
      expect(Easing.easeOutBounce(0)).toBe(0);
      expect(Easing.easeOutBounce(1)).toBe(1);
    });
  });

  describe('cancel', () => {
    it('should cancel active transition', () => {
      const from: ShaderConfig = { value: 0 };
      const to: ShaderConfig = { value: 100 };

      transition.start(from, to, { duration: 1000 });
      transition.cancel();

      expect(transition.isActive()).toBe(false);
    });
  });

  describe('complete', () => {
    it('should skip to end of transition', () => {
      const onComplete = vi.fn();
      const from: ShaderConfig = { value: 0 };
      const to: ShaderConfig = { value: 100 };

      transition.start(from, to, { duration: 1000, onComplete });
      transition.complete();

      expect(transition.isActive()).toBe(false);
      expect(transition.getProgress()).toBe(1);
      expect(transition.getCurrentConfig().value).toBe(100);
      expect(onComplete).toHaveBeenCalled();
    });

    it('should do nothing when not active', () => {
      transition.complete();

      expect(transition.getProgress()).toBe(0);
    });
  });

  describe('getBlendFactor', () => {
    it('should return progress for crossfade', () => {
      const from: ShaderConfig = { value: 0 };
      const to: ShaderConfig = { value: 100 };

      transition.start(from, to, { duration: 1000, type: 'crossfade' });
      transition.update(500);

      expect(transition.getBlendFactor()).toBeCloseTo(0.5, 1);
    });

    it('should return 0 when not active', () => {
      expect(transition.getBlendFactor()).toBe(0);
    });
  });

  describe('getWipePosition', () => {
    it('should return position based on progress and direction', () => {
      const from: ShaderConfig = { value: 0 };
      const to: ShaderConfig = { value: 100 };

      transition.start(from, to, { duration: 1000, type: 'wipe', direction: 0 });
      transition.update(500);

      const [x, y] = transition.getWipePosition();
      expect(typeof x).toBe('number');
      expect(typeof y).toBe('number');
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      const from: ShaderConfig = { value: 0 };
      const to: ShaderConfig = { value: 100 };

      transition.start(from, to, { duration: 1000, type: 'morph' });
      transition.update(250);

      const state = transition.getState();

      expect(state.active).toBe(true);
      expect(state.progress).toBeGreaterThan(0);
      expect(state.elapsed).toBe(250);
      expect(state.duration).toBe(1000);
      expect(state.type).toBe('morph');
    });
  });

  describe('startUniforms', () => {
    it('should transition uniform values', () => {
      const from = { u_time: 0, u_color: [1, 0, 0, 1] };
      const to = { u_time: 1, u_color: [0, 1, 0, 1] };

      transition.startUniforms(from, to, { duration: 1000 });

      expect(transition.isActive()).toBe(true);
    });
  });
});

describe('chainTransitions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should execute transitions in sequence', async () => {
    const updates: ShaderConfig[] = [];

    const transitions = [
      { from: { value: 0 }, to: { value: 50 }, duration: 100 },
      { from: { value: 50 }, to: { value: 100 }, duration: 100 },
    ];

    // Mock requestAnimationFrame using fake timers
    vi.spyOn(global, 'requestAnimationFrame').mockImplementation((cb) => {
      return setTimeout(() => cb(performance.now()), 16) as unknown as number;
    });

    const promise = chainTransitions(transitions, (config) => {
      updates.push({ ...config });
    });

    // Run all timers to complete transitions
    // Each transition takes ~100ms at 16ms per frame = ~7 frames each
    for (let i = 0; i < 30; i++) {
      vi.advanceTimersByTime(16);
      await Promise.resolve(); // Allow microtasks to run
    }

    await vi.runAllTimersAsync();

    // Check that the promise resolves
    await expect(promise).resolves.toBeUndefined();
    expect(updates.length).toBeGreaterThan(0);
  });
});
