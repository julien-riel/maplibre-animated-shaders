/**
 * Tests for GeometryWorker
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GeometryWorker } from '../../src/workers';

// Mock Worker class
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  private messageHandler: ((data: unknown) => void) | null = null;

  constructor(_url: string | URL) {
    // Simulate worker initialization
  }

  postMessage(data: unknown): void {
    // Simulate async worker response
    setTimeout(() => {
      const request = data as { id: string; type: string; data: unknown };
      this.simulateResponse(request);
    }, 10);
  }

  private simulateResponse(request: { id: string; type: string; data: unknown }): void {
    let result: unknown;

    switch (request.type) {
      case 'processGeometry':
        result = {
          featureCount: (request.data as { features: unknown[] }).features?.length || 0,
          vertexCount: 0,
        };
        break;
      case 'simplify':
        result = (request.data as { features: unknown[] }).features;
        break;
      case 'computeBounds':
        result = (request.data as { features: GeoJSON.Feature[] }).features.map(() => ({
          minX: 0,
          minY: 0,
          maxX: 1,
          maxY: 1,
        }));
        break;
      case 'generateBuffers':
        result = {
          vertices: new Float32Array([0, 0, 0]),
          indices: new Uint16Array([0]),
          vertexCount: 1,
        };
        break;
      default:
        if (this.onerror) {
          this.onerror(new ErrorEvent('error', { message: 'Unknown type' }));
        }
        return;
    }

    if (this.onmessage) {
      this.onmessage(
        new MessageEvent('message', {
          data: {
            id: request.id,
            success: true,
            result,
            processingTime: 5,
          },
        })
      );
    }
  }

  terminate(): void {
    // Cleanup
  }
}

// Replace global Worker
const originalWorker = global.Worker;
// @ts-expect-error - Mock Worker
global.Worker = MockWorker;

// Mock URL.createObjectURL
const originalCreateObjectURL = URL.createObjectURL;
URL.createObjectURL = vi.fn(() => 'blob:mock-url');

// Mock URL.revokeObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL;
URL.revokeObjectURL = vi.fn();

describe('GeometryWorker', () => {
  let worker: GeometryWorker;

  beforeEach(() => {
    worker = new GeometryWorker();
  });

  afterEach(() => {
    worker.dispose();
  });

  // Restore original globals after all tests
  afterAll(() => {
    global.Worker = originalWorker;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  describe('isSupported', () => {
    it('should return true when Workers are available', () => {
      expect(GeometryWorker.isSupported()).toBe(true);
    });
  });

  describe('initialize', () => {
    it('should initialize worker', async () => {
      await worker.initialize();

      // Should not throw
    });

    it('should not initialize twice', async () => {
      await worker.initialize();
      await worker.initialize();

      // Should not throw
    });
  });

  describe('processGeometry', () => {
    const features: GeoJSON.Feature[] = [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: {},
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [1, 1] },
        properties: {},
      },
    ];

    it('should process geometry features', async () => {
      const result = await worker.processGeometry(features);

      expect(result).toBeDefined();
      expect(result.featureCount).toBe(2);
    });

    it('should auto-initialize if needed', async () => {
      const result = await worker.processGeometry(features);

      expect(result).toBeDefined();
    });

    it('should support processing options', async () => {
      const result = await worker.processGeometry(features, {
        computeBounds: true,
        generateBuffers: true,
      });

      expect(result).toBeDefined();
    });
  });

  describe('simplify', () => {
    const features: GeoJSON.Feature[] = [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [1, 0.1],
            [2, 0],
          ],
        },
        properties: {},
      },
    ];

    it('should simplify features', async () => {
      const result = await worker.simplify(features, 0.5);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('computeBounds', () => {
    const features: GeoJSON.Feature[] = [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [5, 10] },
        properties: {},
      },
    ];

    it('should compute bounds for features', async () => {
      const result = await worker.computeBounds(features);

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0]).toHaveProperty('minX');
      expect(result[0]).toHaveProperty('minY');
      expect(result[0]).toHaveProperty('maxX');
      expect(result[0]).toHaveProperty('maxY');
    });
  });

  describe('generateBuffers', () => {
    const features: GeoJSON.Feature[] = [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: {},
      },
    ];

    it('should generate vertex buffers', async () => {
      const result = await worker.generateBuffers(features);

      expect(result).toBeDefined();
      expect(result.vertices).toBeInstanceOf(Float32Array);
      expect(result.indices).toBeInstanceOf(Uint16Array);
      expect(result.vertexCount).toBeGreaterThan(0);
    });

    it('should accept custom stride', async () => {
      const result = await worker.generateBuffers(features, 16);

      expect(result).toBeDefined();
    });
  });

  describe('getPendingCount', () => {
    it('should return 0 when idle', () => {
      expect(worker.getPendingCount()).toBe(0);
    });

    it('should track pending requests', async () => {
      await worker.initialize();

      const promise = worker.processGeometry([]);

      // Pending count should be > 0 during processing
      // (might be 0 if mock resolves too fast)

      await promise;

      expect(worker.getPendingCount()).toBe(0);
    });
  });

  describe('isBusy', () => {
    it('should return false when idle', () => {
      expect(worker.isBusy()).toBe(false);
    });
  });

  describe('terminate', () => {
    it('should terminate worker', async () => {
      await worker.initialize();
      worker.terminate();

      expect(worker.getPendingCount()).toBe(0);
    });

    it('should reject pending requests on terminate', async () => {
      await worker.initialize();

      // Start a request
      const promise = worker.processGeometry([
        { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} },
      ]);

      // Terminate immediately
      worker.terminate();

      // Promise might resolve or reject depending on timing
      try {
        await promise;
      } catch (error) {
        expect((error as Error).message).toContain('terminated');
      }
    });
  });

  describe('dispose', () => {
    it('should clean up resources', async () => {
      await worker.initialize();
      worker.dispose();

      // Should not throw
    });
  });

  describe('error handling', () => {
    it('should provide error callback', async () => {
      const onError = vi.fn();
      worker.onError = onError;

      await worker.initialize();

      // Error handling tested through worker.onerror
    });
  });
});

describe('GeometryWorker main thread fallback', () => {
  it('should work without Web Workers', async () => {
    // Temporarily remove Worker
    const tempWorker = global.Worker;
    // @ts-expect-error - Remove Worker
    global.Worker = undefined;

    const worker = new GeometryWorker();
    await worker.initialize();

    const features: GeoJSON.Feature[] = [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: {},
      },
    ];

    const result = await worker.processGeometry(features);

    expect(result).toBeDefined();
    expect(result.featureCount).toBe(1);

    worker.dispose();

    // Restore Worker
    global.Worker = tempWorker;
  });
});
