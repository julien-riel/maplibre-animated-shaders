/**
 * Object Pool
 *
 * Generic object pooling for reduced garbage collection pressure.
 * Reuses objects instead of creating new ones, significantly improving
 * performance on large datasets (10k+ features).
 *
 * @module utils/object-pool
 *
 * @example
 * ```typescript
 * import { ObjectPool, createFloat32ArrayPool, createVertexPool } from 'maplibre-animated-shaders';
 *
 * // Create a custom object pool
 * interface MyVertex { x: number; y: number; z: number; }
 *
 * const vertexPool = new ObjectPool<MyVertex>(
 *   () => ({ x: 0, y: 0, z: 0 }),           // Factory
 *   (v) => { v.x = 0; v.y = 0; v.z = 0; },  // Resetter
 *   { initialSize: 1000, maxSize: 100000 }  // Config
 * );
 *
 * // Use the pool
 * const vertex = vertexPool.acquire();
 * vertex.x = 10;
 * vertex.y = 20;
 * // ... use vertex ...
 * vertexPool.release(vertex);
 *
 * // Use pre-built Float32Array pool
 * const arrayPool = createFloat32ArrayPool(16); // 16 floats per array
 * const arr = arrayPool.acquire();
 * // ... fill array ...
 * arrayPool.release(arr);
 * ```
 */

/**
 * Factory function type for creating new pool objects
 */
export type ObjectFactory<T> = () => T;

/**
 * Reset function type for preparing objects for reuse
 */
export type ObjectResetter<T> = (obj: T) => void;

/**
 * Configuration for ObjectPool
 */
export interface ObjectPoolConfig {
  /** Initial pool size (default: 100) */
  initialSize?: number;
  /** Maximum pool size (default: 10000) */
  maxSize?: number;
  /** Growth factor when pool is exhausted (default: 2) */
  growthFactor?: number;
}

/**
 * Statistics for monitoring pool performance
 */
export interface PoolStats {
  /** Total objects created */
  totalCreated: number;
  /** Objects currently in the pool (available) */
  available: number;
  /** Objects currently in use */
  inUse: number;
  /** Number of times pool was grown */
  growthCount: number;
  /** Peak concurrent usage */
  peakUsage: number;
}

/**
 * Generic object pool for reusing objects
 *
 * @example
 * ```typescript
 * interface Point { x: number; y: number; index: number; }
 *
 * const pointPool = new ObjectPool<Point>(
 *   () => ({ x: 0, y: 0, index: 0 }),
 *   (p) => { p.x = 0; p.y = 0; p.index = 0; }
 * );
 *
 * const point = pointPool.acquire();
 * point.x = 10;
 * point.y = 20;
 *
 * pointPool.release(point);
 * ```
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: ObjectFactory<T>;
  private resetter: ObjectResetter<T>;
  private config: Required<ObjectPoolConfig>;
  private stats: PoolStats = {
    totalCreated: 0,
    available: 0,
    inUse: 0,
    growthCount: 0,
    peakUsage: 0,
  };

  constructor(
    factory: ObjectFactory<T>,
    resetter: ObjectResetter<T>,
    config: ObjectPoolConfig = {}
  ) {
    this.factory = factory;
    this.resetter = resetter;
    this.config = {
      initialSize: config.initialSize ?? 100,
      maxSize: config.maxSize ?? 10000,
      growthFactor: config.growthFactor ?? 2,
    };

    this.preallocate(this.config.initialSize);
  }

  /**
   * Preallocate objects to the pool
   */
  private preallocate(count: number): void {
    const actualCount = Math.min(count, this.config.maxSize - this.stats.totalCreated);
    for (let i = 0; i < actualCount; i++) {
      this.pool.push(this.factory());
      this.stats.totalCreated++;
    }
    this.stats.available = this.pool.length;
  }

  /**
   * Acquire an object from the pool
   * Creates a new object if pool is empty
   */
  acquire(): T {
    let obj: T;

    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else if (this.stats.totalCreated < this.config.maxSize) {
      // Grow pool
      const growSize = Math.min(
        Math.floor(this.stats.totalCreated * (this.config.growthFactor - 1)) || 1,
        this.config.maxSize - this.stats.totalCreated
      );
      this.preallocate(growSize);
      this.stats.growthCount++;

      if (this.pool.length > 0) {
        obj = this.pool.pop()!;
      } else {
        obj = this.factory();
        this.stats.totalCreated++;
      }
    } else {
      // Max size reached, create without pooling
      obj = this.factory();
    }

    this.stats.available = this.pool.length;
    this.stats.inUse++;
    this.stats.peakUsage = Math.max(this.stats.peakUsage, this.stats.inUse);

    return obj;
  }

  /**
   * Release an object back to the pool
   */
  release(obj: T): void {
    if (this.pool.length < this.config.maxSize) {
      this.resetter(obj);
      this.pool.push(obj);
      this.stats.available = this.pool.length;
    }
    this.stats.inUse = Math.max(0, this.stats.inUse - 1);
  }

  /**
   * Release multiple objects back to the pool
   */
  releaseAll(objects: T[]): void {
    for (const obj of objects) {
      this.release(obj);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): Readonly<PoolStats> {
    return { ...this.stats };
  }

  /**
   * Clear the pool and reset statistics
   */
  clear(): void {
    this.pool = [];
    this.stats = {
      totalCreated: 0,
      available: 0,
      inUse: 0,
      growthCount: 0,
      peakUsage: 0,
    };
  }

  /**
   * Shrink pool to a target size (releases excess objects)
   */
  shrink(targetSize: number): void {
    while (this.pool.length > targetSize) {
      this.pool.pop();
    }
    this.stats.available = this.pool.length;
  }
}

/**
 * Specialized pool for arrays that need to be cleared and reused
 */
export class ArrayPool<T> {
  private pool: T[][] = [];
  private config: Required<ObjectPoolConfig>;
  private stats: PoolStats = {
    totalCreated: 0,
    available: 0,
    inUse: 0,
    growthCount: 0,
    peakUsage: 0,
  };

  constructor(config: ObjectPoolConfig = {}) {
    this.config = {
      initialSize: config.initialSize ?? 50,
      maxSize: config.maxSize ?? 1000,
      growthFactor: config.growthFactor ?? 2,
    };

    for (let i = 0; i < this.config.initialSize; i++) {
      this.pool.push([]);
      this.stats.totalCreated++;
    }
    this.stats.available = this.pool.length;
  }

  /**
   * Acquire an empty array from the pool
   */
  acquire(): T[] {
    let arr: T[];

    if (this.pool.length > 0) {
      arr = this.pool.pop()!;
    } else {
      arr = [];
      this.stats.totalCreated++;
      this.stats.growthCount++;
    }

    this.stats.available = this.pool.length;
    this.stats.inUse++;
    this.stats.peakUsage = Math.max(this.stats.peakUsage, this.stats.inUse);

    return arr;
  }

  /**
   * Release an array back to the pool (clears it first)
   */
  release(arr: T[]): void {
    if (this.pool.length < this.config.maxSize) {
      arr.length = 0; // Clear array without creating new one
      this.pool.push(arr);
      this.stats.available = this.pool.length;
    }
    this.stats.inUse = Math.max(0, this.stats.inUse - 1);
  }

  /**
   * Get pool statistics
   */
  getStats(): Readonly<PoolStats> {
    return { ...this.stats };
  }

  /**
   * Clear the pool
   */
  clear(): void {
    this.pool = [];
    this.stats = {
      totalCreated: 0,
      available: 0,
      inUse: 0,
      growthCount: 0,
      peakUsage: 0,
    };
  }
}

/**
 * Pre-configured pools for common shader layer objects
 */
export interface PointData {
  mercatorX: number;
  mercatorY: number;
  index: number;
}

export interface SegmentData {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  progress: number;
  lineIndex: number;
}

export interface PolygonData {
  vertices: Array<[number, number]>;
  centroid: [number, number];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  index: number;
}

export interface FeatureColorData {
  color: [number, number, number, number];
  intensity: number;
}

/**
 * Create a pool for point data objects
 */
export function createPointPool(config?: ObjectPoolConfig): ObjectPool<PointData> {
  return new ObjectPool<PointData>(
    () => ({ mercatorX: 0, mercatorY: 0, index: 0 }),
    (p) => {
      p.mercatorX = 0;
      p.mercatorY = 0;
      p.index = 0;
    },
    config
  );
}

/**
 * Create a pool for line segment data objects
 */
export function createSegmentPool(config?: ObjectPoolConfig): ObjectPool<SegmentData> {
  return new ObjectPool<SegmentData>(
    () => ({ startX: 0, startY: 0, endX: 0, endY: 0, progress: 0, lineIndex: 0 }),
    (s) => {
      s.startX = 0;
      s.startY = 0;
      s.endX = 0;
      s.endY = 0;
      s.progress = 0;
      s.lineIndex = 0;
    },
    config
  );
}

/**
 * Create a pool for polygon data objects
 */
export function createPolygonPool(config?: ObjectPoolConfig): ObjectPool<PolygonData> {
  return new ObjectPool<PolygonData>(
    () => ({
      vertices: [],
      centroid: [0, 0],
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      index: 0,
    }),
    (p) => {
      p.vertices.length = 0;
      p.centroid[0] = 0;
      p.centroid[1] = 0;
      p.bounds.minX = 0;
      p.bounds.minY = 0;
      p.bounds.maxX = 0;
      p.bounds.maxY = 0;
      p.index = 0;
    },
    config
  );
}

/**
 * Create a pool for feature color/intensity data
 */
export function createFeatureDataPool(config?: ObjectPoolConfig): ObjectPool<FeatureColorData> {
  return new ObjectPool<FeatureColorData>(
    () => ({ color: [0, 0, 0, 1], intensity: 1 }),
    (f) => {
      f.color[0] = 0;
      f.color[1] = 0;
      f.color[2] = 0;
      f.color[3] = 1;
      f.intensity = 1;
    },
    config
  );
}

/**
 * Global pool manager for sharing pools across layers
 */
export class PoolManager {
  private static instance: PoolManager | null = null;

  readonly pointPool: ObjectPool<PointData>;
  readonly segmentPool: ObjectPool<SegmentData>;
  readonly polygonPool: ObjectPool<PolygonData>;
  readonly featureDataPool: ObjectPool<FeatureColorData>;
  readonly vertexArrayPool: ArrayPool<[number, number]>;

  private constructor() {
    // Configure pools with reasonable defaults for map applications
    const largePoolConfig = { initialSize: 1000, maxSize: 50000 };
    const mediumPoolConfig = { initialSize: 500, maxSize: 20000 };

    this.pointPool = createPointPool(largePoolConfig);
    this.segmentPool = createSegmentPool(largePoolConfig);
    this.polygonPool = createPolygonPool(mediumPoolConfig);
    this.featureDataPool = createFeatureDataPool(largePoolConfig);
    this.vertexArrayPool = new ArrayPool<[number, number]>(mediumPoolConfig);
  }

  /**
   * Get the singleton pool manager instance
   */
  static getInstance(): PoolManager {
    if (!PoolManager.instance) {
      PoolManager.instance = new PoolManager();
    }
    return PoolManager.instance;
  }

  /**
   * Get statistics for all pools
   */
  getAllStats(): Record<string, PoolStats> {
    return {
      point: this.pointPool.getStats(),
      segment: this.segmentPool.getStats(),
      polygon: this.polygonPool.getStats(),
      featureData: this.featureDataPool.getStats(),
      vertexArray: this.vertexArrayPool.getStats(),
    };
  }

  /**
   * Clear all pools (useful for cleanup)
   */
  clearAll(): void {
    this.pointPool.clear();
    this.segmentPool.clear();
    this.polygonPool.clear();
    this.featureDataPool.clear();
    this.vertexArrayPool.clear();
  }

  /**
   * Reset the singleton (mainly for testing)
   */
  static reset(): void {
    if (PoolManager.instance) {
      PoolManager.instance.clearAll();
      PoolManager.instance = null;
    }
  }
}
