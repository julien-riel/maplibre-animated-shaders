/**
 * Tests for ProductionPerformanceMonitor
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ProductionPerformanceMonitor,
  getPerformanceMonitor,
  resetPerformanceMonitor,
  type PerformanceMetrics,
} from '../../src/utils/performance-monitor';

/**
 * Create a mock canvas element for testing
 */
function createMockCanvas(): HTMLCanvasElement {
  const listeners: Record<string, Set<EventListener>> = {};

  return {
    addEventListener: vi.fn((event: string, listener: EventListener) => {
      if (!listeners[event]) {
        listeners[event] = new Set();
      }
      listeners[event].add(listener);
    }),
    removeEventListener: vi.fn((event: string, listener: EventListener) => {
      listeners[event]?.delete(listener);
    }),
    dispatchEvent: vi.fn((event: Event) => {
      const eventListeners = listeners[event.type];
      if (eventListeners) {
        eventListeners.forEach((listener) => listener(event));
      }
      return true;
    }),
  } as unknown as HTMLCanvasElement;
}

describe('ProductionPerformanceMonitor', () => {
  let monitor: ProductionPerformanceMonitor;

  beforeEach(() => {
    monitor = new ProductionPerformanceMonitor();
  });

  afterEach(() => {
    monitor.destroy();
    resetPerformanceMonitor();
  });

  describe('initialization', () => {
    it('should create with default options', () => {
      expect(monitor).toBeInstanceOf(ProductionPerformanceMonitor);
    });

    it('should accept custom options', () => {
      const customMonitor = new ProductionPerformanceMonitor({
        sampleSize: 120,
        updateInterval: 2000,
        thresholds: {
          fpsWarning: 45,
          fpsCritical: 20,
        },
      });

      expect(customMonitor).toBeInstanceOf(ProductionPerformanceMonitor);
      customMonitor.destroy();
    });
  });

  describe('start/stop', () => {
    it('should start monitoring', () => {
      monitor.start();
      expect(monitor.getMetrics().timestamp).toBeGreaterThan(0);
      monitor.stop();
    });

    it('should stop monitoring', () => {
      monitor.start();
      monitor.stop();
      // Should not throw
      expect(() => monitor.getMetrics()).not.toThrow();
    });

    it('should handle multiple start calls', () => {
      monitor.start();
      monitor.start();
      monitor.start();
      // Should not throw or create multiple loops
      expect(() => monitor.stop()).not.toThrow();
    });
  });

  describe('metrics collection', () => {
    it('should return metrics structure', () => {
      const metrics = monitor.getMetrics();

      expect(metrics).toHaveProperty('fps');
      expect(metrics).toHaveProperty('avgFps');
      expect(metrics).toHaveProperty('minFps');
      expect(metrics).toHaveProperty('maxFps');
      expect(metrics).toHaveProperty('frameTime');
      expect(metrics).toHaveProperty('frameTime95th');
      expect(metrics).toHaveProperty('frameTime99th');
      expect(metrics).toHaveProperty('droppedFrames');
      expect(metrics).toHaveProperty('contextLossCount');
      expect(metrics).toHaveProperty('timestamp');
    });

    it('should return zero values when not started', () => {
      const metrics = monitor.getMetrics();
      expect(metrics.fps).toBe(0);
      expect(metrics.avgFps).toBe(0);
    });

    it('should reset metrics', () => {
      monitor.start();
      monitor.reset();
      const metrics = monitor.getMetrics();
      expect(metrics.droppedFrames).toBe(0);
      monitor.stop();
    });
  });

  describe('event handling', () => {
    it('should register event handlers', () => {
      const handler = vi.fn();
      expect(() => monitor.on('fps-warning', handler)).not.toThrow();
    });

    it('should remove event handlers', () => {
      const handler = vi.fn();
      monitor.on('fps-warning', handler);
      expect(() => monitor.off('fps-warning', handler)).not.toThrow();
    });

    it('should handle multiple handlers for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      monitor.on('metrics-report', handler1);
      monitor.on('metrics-report', handler2);

      // Both handlers should be registered without error
      expect(() => monitor.off('metrics-report', handler1)).not.toThrow();
      expect(() => monitor.off('metrics-report', handler2)).not.toThrow();
    });

    it('should handle removing handler that was never registered', () => {
      const handler = vi.fn();
      expect(() => monitor.off('fps-warning', handler)).not.toThrow();
    });
  });

  describe('canvas attachment', () => {
    it('should attach to canvas', () => {
      const canvas = createMockCanvas();
      expect(() => monitor.attachCanvas(canvas)).not.toThrow();
      expect(canvas.addEventListener).toHaveBeenCalledWith(
        'webglcontextlost',
        expect.any(Function)
      );
      expect(canvas.addEventListener).toHaveBeenCalledWith(
        'webglcontextrestored',
        expect.any(Function)
      );
    });

    it('should detach from canvas', () => {
      const canvas = createMockCanvas();
      monitor.attachCanvas(canvas);
      expect(() => monitor.detachCanvas()).not.toThrow();
      expect(canvas.removeEventListener).toHaveBeenCalledWith(
        'webglcontextlost',
        expect.any(Function)
      );
    });

    it('should handle detach when no canvas attached', () => {
      expect(() => monitor.detachCanvas()).not.toThrow();
    });

    it('should track context loss events', () => {
      const canvas = createMockCanvas();
      const handler = vi.fn();

      monitor.on('context-lost', handler);
      monitor.attachCanvas(canvas);

      // Simulate context loss
      const event = { type: 'webglcontextlost' } as Event;
      canvas.dispatchEvent(event);

      expect(handler).toHaveBeenCalled();
      const metrics = monitor.getMetrics();
      expect(metrics.contextLossCount).toBe(1);
    });

    it('should track context restored events', () => {
      const canvas = createMockCanvas();
      const handler = vi.fn();

      monitor.on('context-restored', handler);
      monitor.attachCanvas(canvas);

      // Simulate context restore
      const event = { type: 'webglcontextrestored' } as Event;
      canvas.dispatchEvent(event);

      expect(handler).toHaveBeenCalled();
    });

    it('should increment context loss count on multiple losses', () => {
      const canvas = createMockCanvas();
      monitor.attachCanvas(canvas);

      canvas.dispatchEvent({ type: 'webglcontextlost' } as Event);
      canvas.dispatchEvent({ type: 'webglcontextlost' } as Event);
      canvas.dispatchEvent({ type: 'webglcontextlost' } as Event);

      const metrics = monitor.getMetrics();
      expect(metrics.contextLossCount).toBe(3);
    });
  });

  describe('telemetry', () => {
    it('should call custom telemetry reporter', async () => {
      const reporter = vi.fn();
      const telemetryMonitor = new ProductionPerformanceMonitor({
        enableTelemetry: true,
        telemetryInterval: 50,
        telemetryReporter: reporter,
      });

      telemetryMonitor.start();

      // Wait for telemetry interval
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(reporter).toHaveBeenCalled();
      const call = reporter.mock.calls[0][0] as PerformanceMetrics;
      expect(call).toHaveProperty('fps');
      expect(call).toHaveProperty('timestamp');

      telemetryMonitor.destroy();
    });

    it('should send to telemetry endpoint', async () => {
      const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(new Response());

      const telemetryMonitor = new ProductionPerformanceMonitor({
        enableTelemetry: true,
        telemetryInterval: 50,
        telemetryEndpoint: 'https://example.com/metrics',
      });

      telemetryMonitor.start();

      // Wait for telemetry interval
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(fetchMock).toHaveBeenCalledWith(
        'https://example.com/metrics',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      fetchMock.mockRestore();
      telemetryMonitor.destroy();
    });

    it('should handle telemetry errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const reporter = vi.fn().mockRejectedValue(new Error('Network error'));

      const telemetryMonitor = new ProductionPerformanceMonitor({
        enableTelemetry: true,
        telemetryInterval: 50,
        telemetryReporter: reporter,
      });

      telemetryMonitor.start();

      // Wait for telemetry interval
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
      telemetryMonitor.destroy();
    });

    it('should emit metrics-report event on telemetry', async () => {
      const handler = vi.fn();

      const telemetryMonitor = new ProductionPerformanceMonitor({
        enableTelemetry: true,
        telemetryInterval: 50,
      });

      telemetryMonitor.on('metrics-report', handler);
      telemetryMonitor.start();

      // Wait for telemetry interval
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(handler).toHaveBeenCalled();
      telemetryMonitor.destroy();
    });
  });

  describe('threshold events', () => {
    it('should have thresholds accessible', () => {
      const customMonitor = new ProductionPerformanceMonitor({
        thresholds: {
          fpsWarning: 45,
          fpsCritical: 20,
          frameTimeWarning: 25,
          frameTimeCritical: 50,
          droppedFrameWarning: 0.05,
        },
      });

      // Monitor should be created with custom thresholds
      expect(customMonitor).toBeInstanceOf(ProductionPerformanceMonitor);
      customMonitor.destroy();
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance from getPerformanceMonitor', () => {
      const monitor1 = getPerformanceMonitor();
      const monitor2 = getPerformanceMonitor();

      expect(monitor1).toBe(monitor2);
      monitor1.destroy();
    });

    it('should create new instance after reset', () => {
      const monitor1 = getPerformanceMonitor();
      resetPerformanceMonitor();
      const monitor2 = getPerformanceMonitor();

      expect(monitor1).not.toBe(monitor2);
      monitor2.destroy();
    });

    it('should accept options on first call', () => {
      resetPerformanceMonitor();
      const monitor1 = getPerformanceMonitor({
        sampleSize: 100,
      });

      expect(monitor1).toBeInstanceOf(ProductionPerformanceMonitor);
      monitor1.destroy();
    });
  });

  describe('destroy', () => {
    it('should clean up all resources', () => {
      const canvas = createMockCanvas();
      monitor.attachCanvas(canvas);
      monitor.start();

      expect(() => monitor.destroy()).not.toThrow();

      // Should be safe to call destroy multiple times
      expect(() => monitor.destroy()).not.toThrow();
    });

    it('should stop monitoring on destroy', () => {
      monitor.start();
      monitor.destroy();

      // After destroy, getMetrics should still work
      expect(() => monitor.getMetrics()).not.toThrow();
    });

    it('should remove canvas listeners on destroy', () => {
      const canvas = createMockCanvas();

      monitor.attachCanvas(canvas);
      monitor.destroy();

      expect(canvas.removeEventListener).toHaveBeenCalledWith(
        'webglcontextlost',
        expect.any(Function)
      );
      expect(canvas.removeEventListener).toHaveBeenCalledWith(
        'webglcontextrestored',
        expect.any(Function)
      );
    });
  });

  describe('percentile calculations', () => {
    it('should handle empty frame times gracefully', () => {
      const metrics = monitor.getMetrics();
      expect(metrics.frameTime95th).toBe(0);
      expect(metrics.frameTime99th).toBe(0);
    });
  });
});
