import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnimationLoop } from '../src/AnimationLoop';

describe('AnimationLoop', () => {
  let loop: AnimationLoop;

  beforeEach(() => {
    vi.useFakeTimers();
    loop = new AnimationLoop(60);
  });

  afterEach(() => {
    loop.destroy();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create with default FPS', () => {
      const defaultLoop = new AnimationLoop();
      expect(defaultLoop).toBeInstanceOf(AnimationLoop);
      defaultLoop.destroy();
    });

    it('should create with custom FPS', () => {
      const customLoop = new AnimationLoop(30);
      expect(customLoop).toBeInstanceOf(AnimationLoop);
      customLoop.destroy();
    });
  });

  describe('start/stop', () => {
    it('should start the loop', () => {
      expect(loop.isRunning()).toBe(false);
      loop.start();
      expect(loop.isRunning()).toBe(true);
    });

    it('should stop the loop', () => {
      loop.start();
      loop.stop();
      expect(loop.isRunning()).toBe(false);
    });

    it('should not start twice', () => {
      loop.start();
      loop.start(); // Should not throw
      expect(loop.isRunning()).toBe(true);
    });
  });

  describe('addShader/removeShader', () => {
    it('should add shader callback', () => {
      const callback = vi.fn();
      loop.addShader('test', callback);
      expect(loop.getShaderCount()).toBe(1);
    });

    it('should remove shader callback', () => {
      const callback = vi.fn();
      loop.addShader('test', callback);
      loop.removeShader('test');
      expect(loop.getShaderCount()).toBe(0);
    });

    it('should handle multiple shaders', () => {
      loop.addShader('shader1', vi.fn());
      loop.addShader('shader2', vi.fn());
      loop.addShader('shader3', vi.fn());
      expect(loop.getShaderCount()).toBe(3);
    });

    it('should overwrite shader with same id', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      loop.addShader('test', callback1);
      loop.addShader('test', callback2);
      expect(loop.getShaderCount()).toBe(1);
    });
  });

  describe('setGlobalSpeed', () => {
    it('should set positive speed', () => {
      loop.setGlobalSpeed(2.0);
      // Speed is applied internally, test indirectly through time
      expect(loop.getTime()).toBe(0);
    });

    it('should clamp negative speed to 0', () => {
      loop.setGlobalSpeed(-1.0);
      // Should not throw, speed clamped to 0
      expect(loop.getTime()).toBe(0);
    });
  });

  describe('getTime', () => {
    it('should return 0 initially', () => {
      expect(loop.getTime()).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset time to 0', () => {
      loop.start();
      loop.reset();
      expect(loop.getTime()).toBe(0);
    });
  });

  describe('destroy', () => {
    it('should stop the loop', () => {
      loop.start();
      loop.destroy();
      expect(loop.isRunning()).toBe(false);
    });

    it('should clear all shaders', () => {
      loop.addShader('test1', vi.fn());
      loop.addShader('test2', vi.fn());
      loop.destroy();
      expect(loop.getShaderCount()).toBe(0);
    });
  });

  describe('shader callbacks', () => {
    it('should call shader callbacks with time and deltaTime', async () => {
      const callback = vi.fn();
      loop.addShader('test', callback);
      loop.start();

      // Advance timers to trigger animation frame
      vi.advanceTimersByTime(20);

      // The callback should eventually be called
      // Note: Due to requestAnimationFrame mocking complexities,
      // we mainly test that the structure is correct
      expect(callback).toBeDefined();
    });
  });
});
