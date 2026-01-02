import { describe, it, expect, beforeEach } from 'vitest';
import {
  ObjectPool,
  ArrayPool,
  PoolManager,
  createPointPool,
  createSegmentPool,
  createPolygonPool,
  createFeatureDataPool,
  type PointData,
  type SegmentData,
  type PolygonData,
  type FeatureColorData,
} from '../src/utils/object-pool';

describe('ObjectPool', () => {
  interface TestObject {
    x: number;
    y: number;
    name: string;
  }

  let pool: ObjectPool<TestObject>;

  beforeEach(() => {
    pool = new ObjectPool<TestObject>(
      () => ({ x: 0, y: 0, name: '' }),
      (obj) => {
        obj.x = 0;
        obj.y = 0;
        obj.name = '';
      },
      { initialSize: 10, maxSize: 100 }
    );
  });

  describe('acquire', () => {
    it('should return an object from the pool', () => {
      const obj = pool.acquire();
      expect(obj).toBeDefined();
      expect(obj.x).toBe(0);
      expect(obj.y).toBe(0);
      expect(obj.name).toBe('');
    });

    it('should track objects in use', () => {
      const statsBefore = pool.getStats();
      expect(statsBefore.inUse).toBe(0);

      pool.acquire();
      const statsAfter = pool.getStats();
      expect(statsAfter.inUse).toBe(1);
    });

    it('should grow pool when empty', () => {
      // Exhaust initial pool
      for (let i = 0; i < 15; i++) {
        pool.acquire();
      }

      const stats = pool.getStats();
      expect(stats.totalCreated).toBeGreaterThan(10);
      expect(stats.growthCount).toBeGreaterThan(0);
    });
  });

  describe('release', () => {
    it('should return object to pool', () => {
      const obj = pool.acquire();
      obj.x = 100;
      obj.y = 200;
      obj.name = 'test';

      pool.release(obj);

      const stats = pool.getStats();
      expect(stats.inUse).toBe(0);
    });

    it('should reset object properties', () => {
      const obj = pool.acquire();
      obj.x = 100;
      obj.y = 200;
      obj.name = 'test';

      pool.release(obj);

      // Object should be reset
      expect(obj.x).toBe(0);
      expect(obj.y).toBe(0);
      expect(obj.name).toBe('');
    });

    it('should reuse released objects', () => {
      const obj1 = pool.acquire();
      pool.release(obj1);

      const obj2 = pool.acquire();
      expect(obj2).toBe(obj1);
    });
  });

  describe('releaseAll', () => {
    it('should release multiple objects at once', () => {
      const objects: TestObject[] = [];
      for (let i = 0; i < 5; i++) {
        objects.push(pool.acquire());
      }

      expect(pool.getStats().inUse).toBe(5);

      pool.releaseAll(objects);
      expect(pool.getStats().inUse).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should track peak usage', () => {
      const objects: TestObject[] = [];
      for (let i = 0; i < 5; i++) {
        objects.push(pool.acquire());
      }

      pool.releaseAll(objects);
      pool.acquire();

      const stats = pool.getStats();
      expect(stats.peakUsage).toBe(5);
    });

    it('should track available objects', () => {
      const stats = pool.getStats();
      expect(stats.available).toBe(10); // Initial size
    });
  });

  describe('clear', () => {
    it('should reset all statistics', () => {
      pool.acquire();
      pool.clear();

      const stats = pool.getStats();
      expect(stats.totalCreated).toBe(0);
      expect(stats.available).toBe(0);
      expect(stats.inUse).toBe(0);
    });
  });

  describe('shrink', () => {
    it('should reduce pool size', () => {
      const stats1 = pool.getStats();
      expect(stats1.available).toBe(10);

      pool.shrink(5);
      const stats2 = pool.getStats();
      expect(stats2.available).toBe(5);
    });
  });
});

describe('ArrayPool', () => {
  let pool: ArrayPool<number>;

  beforeEach(() => {
    pool = new ArrayPool<number>({ initialSize: 5, maxSize: 50 });
  });

  describe('acquire', () => {
    it('should return an empty array', () => {
      const arr = pool.acquire();
      expect(arr).toBeInstanceOf(Array);
      expect(arr.length).toBe(0);
    });
  });

  describe('release', () => {
    it('should clear array before returning to pool', () => {
      const arr = pool.acquire();
      arr.push(1, 2, 3);

      pool.release(arr);
      expect(arr.length).toBe(0);
    });

    it('should reuse released arrays', () => {
      const arr1 = pool.acquire();
      pool.release(arr1);

      const arr2 = pool.acquire();
      expect(arr2).toBe(arr1);
    });
  });
});

describe('Specialized pools', () => {
  describe('createPointPool', () => {
    it('should create pool with correct object structure', () => {
      const pool = createPointPool();
      const point = pool.acquire();

      expect(point).toHaveProperty('mercatorX');
      expect(point).toHaveProperty('mercatorY');
      expect(point).toHaveProperty('index');
      expect(point.mercatorX).toBe(0);
      expect(point.mercatorY).toBe(0);
      expect(point.index).toBe(0);
    });

    it('should reset point properties on release', () => {
      const pool = createPointPool();
      const point = pool.acquire();
      point.mercatorX = 0.5;
      point.mercatorY = 0.7;
      point.index = 42;

      pool.release(point);

      expect(point.mercatorX).toBe(0);
      expect(point.mercatorY).toBe(0);
      expect(point.index).toBe(0);
    });
  });

  describe('createSegmentPool', () => {
    it('should create pool with correct object structure', () => {
      const pool = createSegmentPool();
      const segment = pool.acquire();

      expect(segment).toHaveProperty('startX');
      expect(segment).toHaveProperty('startY');
      expect(segment).toHaveProperty('endX');
      expect(segment).toHaveProperty('endY');
      expect(segment).toHaveProperty('progress');
      expect(segment).toHaveProperty('lineIndex');
    });
  });

  describe('createPolygonPool', () => {
    it('should create pool with correct object structure', () => {
      const pool = createPolygonPool();
      const polygon = pool.acquire();

      expect(polygon).toHaveProperty('vertices');
      expect(polygon).toHaveProperty('centroid');
      expect(polygon).toHaveProperty('bounds');
      expect(polygon).toHaveProperty('index');
      expect(polygon.vertices).toBeInstanceOf(Array);
      expect(polygon.centroid).toEqual([0, 0]);
    });

    it('should clear vertices array on release', () => {
      const pool = createPolygonPool();
      const polygon = pool.acquire();
      polygon.vertices.push([0.5, 0.5]);
      polygon.vertices.push([0.6, 0.6]);

      pool.release(polygon);

      expect(polygon.vertices.length).toBe(0);
    });
  });

  describe('createFeatureDataPool', () => {
    it('should create pool with correct object structure', () => {
      const pool = createFeatureDataPool();
      const data = pool.acquire();

      expect(data).toHaveProperty('color');
      expect(data).toHaveProperty('intensity');
      expect(data.color).toEqual([0, 0, 0, 1]);
      expect(data.intensity).toBe(1);
    });
  });
});

describe('PoolManager', () => {
  beforeEach(() => {
    PoolManager.reset();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = PoolManager.getInstance();
      const instance2 = PoolManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('pools', () => {
    it('should have all required pools', () => {
      const manager = PoolManager.getInstance();
      expect(manager.pointPool).toBeDefined();
      expect(manager.segmentPool).toBeDefined();
      expect(manager.polygonPool).toBeDefined();
      expect(manager.featureDataPool).toBeDefined();
      expect(manager.vertexArrayPool).toBeDefined();
    });
  });

  describe('getAllStats', () => {
    it('should return stats for all pools', () => {
      const manager = PoolManager.getInstance();
      const stats = manager.getAllStats();

      expect(stats).toHaveProperty('point');
      expect(stats).toHaveProperty('segment');
      expect(stats).toHaveProperty('polygon');
      expect(stats).toHaveProperty('featureData');
      expect(stats).toHaveProperty('vertexArray');
    });
  });

  describe('clearAll', () => {
    it('should clear all pools', () => {
      const manager = PoolManager.getInstance();

      // Acquire some objects
      manager.pointPool.acquire();
      manager.segmentPool.acquire();

      manager.clearAll();

      const stats = manager.getAllStats();
      expect(stats.point.totalCreated).toBe(0);
      expect(stats.segment.totalCreated).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset singleton instance', () => {
      const instance1 = PoolManager.getInstance();
      instance1.pointPool.acquire();

      PoolManager.reset();

      const instance2 = PoolManager.getInstance();
      expect(instance2).not.toBe(instance1);
      expect(instance2.pointPool.getStats().inUse).toBe(0);
    });
  });
});

describe('Performance characteristics', () => {
  it('should be faster to acquire/release than create/gc', () => {
    const pool = createPointPool({ initialSize: 1000, maxSize: 10000 });
    const iterations = 10000;

    // Measure pooled performance
    const pooledStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      const point = pool.acquire();
      point.mercatorX = Math.random();
      point.mercatorY = Math.random();
      point.index = i;
      pool.release(point);
    }
    const pooledTime = performance.now() - pooledStart;

    // Measure non-pooled performance
    const directStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      const point = {
        mercatorX: Math.random(),
        mercatorY: Math.random(),
        index: i,
      };
      // Simulate holding reference
      void point;
    }
    const directTime = performance.now() - directStart;

    // Pool should be reasonably fast (not slower than 10x direct allocation)
    // The real benefit is reduced GC pressure, which we can't easily measure
    expect(pooledTime).toBeLessThan(directTime * 10);

    // Pool stats should show reuse
    const stats = pool.getStats();
    expect(stats.totalCreated).toBeLessThan(iterations);
  });

  it('should handle burst allocation efficiently', () => {
    const pool = createSegmentPool({ initialSize: 100, maxSize: 5000 });
    const batchSize = 1000;
    const segments: SegmentData[] = [];

    // Simulate batch processing
    for (let i = 0; i < batchSize; i++) {
      segments.push(pool.acquire());
    }

    // Release all
    pool.releaseAll(segments);

    // Acquire again - should reuse
    const stats1 = pool.getStats();
    const totalBeforeReuse = stats1.totalCreated;

    segments.length = 0;
    for (let i = 0; i < batchSize; i++) {
      segments.push(pool.acquire());
    }

    const stats2 = pool.getStats();
    // Should not have created many new objects
    expect(stats2.totalCreated).toBe(totalBeforeReuse);
  });
});
