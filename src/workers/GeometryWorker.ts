/**
 * Geometry Worker
 *
 * Provides off-main-thread geometry processing using Web Workers.
 * Handles buffer generation, simplification, and other CPU-intensive tasks.
 *
 * @module workers/GeometryWorker
 */

/**
 * Worker message types
 */
export type WorkerMessageType =
  | 'processGeometry'
  | 'simplify'
  | 'computeBounds'
  | 'generateBuffers';

/**
 * Message sent to worker
 */
export interface WorkerRequest {
  /** Request ID for tracking */
  id: string;

  /** Message type */
  type: WorkerMessageType;

  /** Request data */
  data: unknown;
}

/**
 * Message received from worker
 */
export interface WorkerResponse {
  /** Request ID */
  id: string;

  /** Whether request succeeded */
  success: boolean;

  /** Result data (if success) */
  result?: unknown;

  /** Error message (if failed) */
  error?: string;

  /** Processing time in ms */
  processingTime?: number;
}

/**
 * Geometry processing options
 */
export interface GeometryProcessOptions {
  /** Simplification tolerance */
  simplification?: number;

  /** Whether to compute bounds */
  computeBounds?: boolean;

  /** Whether to generate vertex buffers */
  generateBuffers?: boolean;

  /** Buffer stride */
  stride?: number;
}

/**
 * Geometry processing result
 */
export interface GeometryProcessResult {
  /** Vertex buffer data */
  vertices?: Float32Array;

  /** Index buffer data */
  indices?: Uint16Array;

  /** Feature bounds */
  bounds?: Array<{ minX: number; minY: number; maxX: number; maxY: number }>;

  /** Number of features processed */
  featureCount: number;

  /** Total vertices generated */
  vertexCount: number;
}

/**
 * Pending request tracking
 */
interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  startTime: number;
  timeoutId?: ReturnType<typeof setTimeout>;
}

/**
 * Default request timeout in milliseconds (30 seconds)
 */
const DEFAULT_REQUEST_TIMEOUT = 30000;

/**
 * Geometry worker for off-thread processing.
 *
 * @example
 * ```typescript
 * const worker = new GeometryWorker();
 *
 * // Process features off the main thread
 * const result = await worker.processGeometry(features, {
 *   simplification: 0.5,
 *   generateBuffers: true,
 * });
 *
 * // Use the result
 * gl.bufferData(gl.ARRAY_BUFFER, result.vertices, gl.STATIC_DRAW);
 * ```
 */
export class GeometryWorker {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private requestCounter: number = 0;
  private isSupported: boolean;
  private isInitialized: boolean = false;
  private requestTimeout: number;

  /**
   * Callback for worker errors
   */
  public onError?: (error: Error) => void;

  /**
   * Create a geometry worker.
   *
   * @param options - Configuration options
   * @param options.timeout - Request timeout in ms (default: 30000)
   */
  constructor(options: { timeout?: number } = {}) {
    this.isSupported = typeof Worker !== 'undefined';
    this.requestTimeout = options.timeout ?? DEFAULT_REQUEST_TIMEOUT;
  }

  /**
   * Set the request timeout.
   *
   * @param timeout - Timeout in milliseconds
   */
  setRequestTimeout(timeout: number): void {
    this.requestTimeout = timeout;
  }

  /**
   * Get the current request timeout.
   *
   * @returns Timeout in milliseconds
   */
  getRequestTimeout(): number {
    return this.requestTimeout;
  }

  /**
   * Check if Web Workers are supported.
   *
   * @returns true if workers are available
   */
  static isSupported(): boolean {
    return typeof Worker !== 'undefined';
  }

  /**
   * Initialize the worker.
   *
   * @param workerUrl - URL to the worker script
   * @returns Promise resolving when worker is ready
   */
  async initialize(workerUrl?: string): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (!this.isSupported) {
      console.warn('[GeometryWorker] Web Workers not supported, falling back to main thread');
      this.isInitialized = true;
      return;
    }

    try {
      // Create worker
      if (workerUrl) {
        this.worker = new Worker(workerUrl);
      } else {
        // Create inline worker
        this.worker = this.createInlineWorker();
      }

      // Setup message handler
      this.worker.onmessage = this.handleMessage.bind(this);
      this.worker.onerror = this.handleError.bind(this);

      this.isInitialized = true;
    } catch (error) {
      console.error('[GeometryWorker] Failed to initialize worker:', error);
      this.isSupported = false;
      this.isInitialized = true;
    }
  }

  /**
   * Create an inline worker using a blob URL.
   */
  private createInlineWorker(): Worker {
    const workerCode = `
      // Geometry processing worker

      self.onmessage = function(e) {
        const { id, type, data } = e.data;
        const startTime = performance.now();

        try {
          let result;

          switch (type) {
            case 'processGeometry':
              result = processGeometry(data.features, data.options);
              break;
            case 'simplify':
              result = simplifyFeatures(data.features, data.tolerance);
              break;
            case 'computeBounds':
              result = computeAllBounds(data.features);
              break;
            case 'generateBuffers':
              result = generateBuffers(data.features, data.stride);
              break;
            default:
              throw new Error('Unknown message type: ' + type);
          }

          self.postMessage({
            id,
            success: true,
            result,
            processingTime: performance.now() - startTime
          });
        } catch (error) {
          self.postMessage({
            id,
            success: false,
            error: error.message,
            processingTime: performance.now() - startTime
          });
        }
      };

      function processGeometry(features, options) {
        const result = {
          featureCount: features.length,
          vertexCount: 0
        };

        if (options.computeBounds) {
          result.bounds = computeAllBounds(features);
        }

        if (options.generateBuffers) {
          const buffers = generateBuffers(features, options.stride || 12);
          result.vertices = buffers.vertices;
          result.indices = buffers.indices;
          result.vertexCount = buffers.vertexCount;
        }

        return result;
      }

      function simplifyFeatures(features, tolerance) {
        return features.map(f => ({
          ...f,
          geometry: simplifyGeometry(f.geometry, tolerance)
        }));
      }

      function simplifyGeometry(geometry, tolerance) {
        if (!geometry) return geometry;

        switch (geometry.type) {
          case 'LineString':
            return {
              type: 'LineString',
              coordinates: douglasPeucker(geometry.coordinates, tolerance)
            };
          case 'Polygon':
            return {
              type: 'Polygon',
              coordinates: geometry.coordinates.map(ring => douglasPeucker(ring, tolerance))
            };
          default:
            return geometry;
        }
      }

      function douglasPeucker(points, tolerance) {
        if (points.length <= 2) return points;

        let maxDist = 0;
        let maxIndex = 0;

        for (let i = 1; i < points.length - 1; i++) {
          const dist = perpendicularDistance(points[i], points[0], points[points.length - 1]);
          if (dist > maxDist) {
            maxDist = dist;
            maxIndex = i;
          }
        }

        if (maxDist > tolerance) {
          const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
          const right = douglasPeucker(points.slice(maxIndex), tolerance);
          return left.slice(0, -1).concat(right);
        }

        return [points[0], points[points.length - 1]];
      }

      function perpendicularDistance(point, lineStart, lineEnd) {
        const dx = lineEnd[0] - lineStart[0];
        const dy = lineEnd[1] - lineStart[1];

        if (dx === 0 && dy === 0) {
          return Math.sqrt(Math.pow(point[0] - lineStart[0], 2) + Math.pow(point[1] - lineStart[1], 2));
        }

        const t = Math.max(0, Math.min(1,
          ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / (dx * dx + dy * dy)
        ));

        const nearestX = lineStart[0] + t * dx;
        const nearestY = lineStart[1] + t * dy;

        return Math.sqrt(Math.pow(point[0] - nearestX, 2) + Math.pow(point[1] - nearestY, 2));
      }

      function computeAllBounds(features) {
        return features.map(f => computeBounds(f.geometry));
      }

      function computeBounds(geometry) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        function processCoord(coord) {
          minX = Math.min(minX, coord[0]);
          minY = Math.min(minY, coord[1]);
          maxX = Math.max(maxX, coord[0]);
          maxY = Math.max(maxY, coord[1]);
        }

        function processCoords(coords) {
          coords.forEach(processCoord);
        }

        switch (geometry.type) {
          case 'Point':
            processCoord(geometry.coordinates);
            break;
          case 'LineString':
          case 'MultiPoint':
            processCoords(geometry.coordinates);
            break;
          case 'Polygon':
          case 'MultiLineString':
            geometry.coordinates.forEach(processCoords);
            break;
          case 'MultiPolygon':
            geometry.coordinates.forEach(poly => poly.forEach(processCoords));
            break;
        }

        return { minX, minY, maxX, maxY };
      }

      function generateBuffers(features, stride) {
        const vertices = [];
        const indices = [];
        let vertexCount = 0;

        for (const feature of features) {
          const geom = feature.geometry;

          switch (geom.type) {
            case 'Point': {
              const [x, y] = geom.coordinates;
              vertices.push(x, y, 0);
              indices.push(vertexCount++);
              break;
            }
            case 'LineString': {
              const startIndex = vertexCount;
              for (const coord of geom.coordinates) {
                vertices.push(coord[0], coord[1], coord[2] || 0);
                vertexCount++;
              }
              for (let i = 0; i < geom.coordinates.length - 1; i++) {
                indices.push(startIndex + i, startIndex + i + 1);
              }
              break;
            }
            case 'Polygon': {
              // Just the outer ring for now
              const ring = geom.coordinates[0];
              const startIndex = vertexCount;
              for (const coord of ring) {
                vertices.push(coord[0], coord[1], coord[2] || 0);
                vertexCount++;
              }
              // Simple triangulation
              for (let i = 1; i < ring.length - 1; i++) {
                indices.push(startIndex, startIndex + i, startIndex + i + 1);
              }
              break;
            }
          }
        }

        return {
          vertices: new Float32Array(vertices),
          indices: new Uint16Array(indices),
          vertexCount
        };
      }
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    URL.revokeObjectURL(url);
    return worker;
  }

  /**
   * Handle message from worker.
   */
  private handleMessage(event: MessageEvent<WorkerResponse>): void {
    const { id, success, result, error } = event.data;

    const pending = this.pendingRequests.get(id);
    if (!pending) {
      return;
    }

    // Clear the timeout
    if (pending.timeoutId) {
      clearTimeout(pending.timeoutId);
    }

    this.pendingRequests.delete(id);

    if (success) {
      pending.resolve(result);
    } else {
      pending.reject(new Error(error || 'Unknown worker error'));
    }
  }

  /**
   * Handle worker error.
   */
  private handleError(event: ErrorEvent): void {
    const error = new Error(`Worker error: ${event.message}`);

    if (this.onError) {
      this.onError(error);
    }

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(error);
      this.pendingRequests.delete(id);
    }
  }

  /**
   * Send a request to the worker.
   */
  private sendRequest<T>(type: WorkerMessageType, data: unknown): Promise<T> {
    const id = `req_${++this.requestCounter}`;

    return new Promise((resolve, reject) => {
      // Setup timeout
      const timeoutId = setTimeout(() => {
        const pending = this.pendingRequests.get(id);
        if (pending) {
          this.pendingRequests.delete(id);
          pending.reject(
            new Error(`Worker request timed out after ${this.requestTimeout}ms`)
          );
        }
      }, this.requestTimeout);

      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        startTime: performance.now(),
        timeoutId,
      });

      if (this.worker) {
        this.worker.postMessage({ id, type, data });
      } else {
        // Fallback to main thread
        this.processOnMainThread(id, type, data);
      }
    });
  }

  /**
   * Process on main thread (fallback).
   */
  private processOnMainThread(id: string, type: WorkerMessageType, data: unknown): void {
    setTimeout(() => {
      const pending = this.pendingRequests.get(id);
      if (!pending) return;

      this.pendingRequests.delete(id);

      // Simplified main-thread processing
      try {
        const result = this.processSync(type, data);
        pending.resolve(result);
      } catch (error) {
        pending.reject(error as Error);
      }
    }, 0);
  }

  /**
   * Synchronous processing for main thread fallback.
   */
  private processSync(type: WorkerMessageType, data: unknown): unknown {
    switch (type) {
      case 'processGeometry':
        return this.processGeometrySync(
          (data as { features: GeoJSON.Feature[]; options: GeometryProcessOptions }).features,
          (data as { options: GeometryProcessOptions }).options
        );
      case 'simplify':
        return this.simplifySync(
          (data as { features: GeoJSON.Feature[]; tolerance: number }).features,
          (data as { tolerance: number }).tolerance
        );
      case 'computeBounds':
        return this.computeBoundsSync(
          (data as { features: GeoJSON.Feature[] }).features
        );
      case 'generateBuffers':
        return this.generateBuffersSync(
          (data as { features: GeoJSON.Feature[]; stride: number }).features,
          (data as { stride: number }).stride
        );
      default:
        throw new Error(`Unsupported message type for main thread: ${type}`);
    }
  }

  /**
   * Synchronous geometry processing.
   */
  private processGeometrySync(
    features: GeoJSON.Feature[],
    options: GeometryProcessOptions
  ): GeometryProcessResult {
    const result: GeometryProcessResult = {
      featureCount: features.length,
      vertexCount: 0,
    };

    if (options.computeBounds) {
      result.bounds = this.computeBoundsSync(features);
    }

    if (options.generateBuffers) {
      const buffers = this.generateBuffersSync(features, options.stride || 12);
      result.vertices = buffers.vertices;
      result.indices = buffers.indices;
      result.vertexCount = buffers.vertexCount;
    }

    return result;
  }

  /**
   * Synchronous simplification using Douglas-Peucker.
   */
  private simplifySync(
    features: GeoJSON.Feature[],
    tolerance: number
  ): GeoJSON.Feature[] {
    return features.map((f) => ({
      ...f,
      geometry: this.simplifyGeometrySync(f.geometry, tolerance),
    }));
  }

  private simplifyGeometrySync(
    geometry: GeoJSON.Geometry,
    tolerance: number
  ): GeoJSON.Geometry {
    if (!geometry) return geometry;

    switch (geometry.type) {
      case 'LineString':
        return {
          type: 'LineString',
          coordinates: this.douglasPeuckerSync(geometry.coordinates, tolerance),
        };
      case 'Polygon':
        return {
          type: 'Polygon',
          coordinates: geometry.coordinates.map((ring) =>
            this.douglasPeuckerSync(ring, tolerance)
          ),
        };
      case 'MultiLineString':
        return {
          type: 'MultiLineString',
          coordinates: geometry.coordinates.map((line) =>
            this.douglasPeuckerSync(line, tolerance)
          ),
        };
      case 'MultiPolygon':
        return {
          type: 'MultiPolygon',
          coordinates: geometry.coordinates.map((polygon) =>
            polygon.map((ring) => this.douglasPeuckerSync(ring, tolerance))
          ),
        };
      default:
        return geometry;
    }
  }

  private douglasPeuckerSync(
    points: GeoJSON.Position[],
    tolerance: number
  ): GeoJSON.Position[] {
    if (points.length <= 2) return points;

    let maxDist = 0;
    let maxIndex = 0;

    for (let i = 1; i < points.length - 1; i++) {
      const dist = this.perpendicularDistanceSync(
        points[i],
        points[0],
        points[points.length - 1]
      );
      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }

    if (maxDist > tolerance) {
      const left = this.douglasPeuckerSync(
        points.slice(0, maxIndex + 1),
        tolerance
      );
      const right = this.douglasPeuckerSync(points.slice(maxIndex), tolerance);
      return [...left.slice(0, -1), ...right];
    }

    return [points[0], points[points.length - 1]];
  }

  private perpendicularDistanceSync(
    point: GeoJSON.Position,
    lineStart: GeoJSON.Position,
    lineEnd: GeoJSON.Position
  ): number {
    const dx = lineEnd[0] - lineStart[0];
    const dy = lineEnd[1] - lineStart[1];

    if (dx === 0 && dy === 0) {
      return Math.sqrt(
        Math.pow(point[0] - lineStart[0], 2) +
          Math.pow(point[1] - lineStart[1], 2)
      );
    }

    const t = Math.max(
      0,
      Math.min(
        1,
        ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) /
          (dx * dx + dy * dy)
      )
    );

    const nearestX = lineStart[0] + t * dx;
    const nearestY = lineStart[1] + t * dy;

    return Math.sqrt(
      Math.pow(point[0] - nearestX, 2) + Math.pow(point[1] - nearestY, 2)
    );
  }

  /**
   * Synchronous bounds computation.
   */
  private computeBoundsSync(
    features: GeoJSON.Feature[]
  ): Array<{ minX: number; minY: number; maxX: number; maxY: number }> {
    return features.map((f) => this.computeSingleBoundsSync(f.geometry));
  }

  private computeSingleBoundsSync(geometry: GeoJSON.Geometry): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    const processCoord = (coord: GeoJSON.Position) => {
      minX = Math.min(minX, coord[0]);
      minY = Math.min(minY, coord[1]);
      maxX = Math.max(maxX, coord[0]);
      maxY = Math.max(maxY, coord[1]);
    };

    const processCoords = (coords: GeoJSON.Position[]) => {
      coords.forEach(processCoord);
    };

    switch (geometry.type) {
      case 'Point':
        processCoord(geometry.coordinates);
        break;
      case 'LineString':
      case 'MultiPoint':
        processCoords(geometry.coordinates);
        break;
      case 'Polygon':
      case 'MultiLineString':
        geometry.coordinates.forEach(processCoords);
        break;
      case 'MultiPolygon':
        geometry.coordinates.forEach((poly) => poly.forEach(processCoords));
        break;
    }

    return { minX, minY, maxX, maxY };
  }

  /**
   * Synchronous buffer generation.
   */
  private generateBuffersSync(
    features: GeoJSON.Feature[],
    _stride: number
  ): { vertices: Float32Array; indices: Uint16Array; vertexCount: number } {
    const vertices: number[] = [];
    const indices: number[] = [];
    let vertexCount = 0;

    for (const feature of features) {
      const geom = feature.geometry;

      switch (geom.type) {
        case 'Point': {
          const coords = geom.coordinates;
          vertices.push(coords[0], coords[1], coords[2] || 0);
          indices.push(vertexCount++);
          break;
        }
        case 'LineString': {
          const startIndex = vertexCount;
          for (const coord of geom.coordinates) {
            vertices.push(coord[0], coord[1], coord[2] || 0);
            vertexCount++;
          }
          for (let i = 0; i < geom.coordinates.length - 1; i++) {
            indices.push(startIndex + i, startIndex + i + 1);
          }
          break;
        }
        case 'Polygon': {
          const ring = geom.coordinates[0];
          const startIndex = vertexCount;
          for (const coord of ring) {
            vertices.push(coord[0], coord[1], coord[2] || 0);
            vertexCount++;
          }
          for (let i = 1; i < ring.length - 1; i++) {
            indices.push(startIndex, startIndex + i, startIndex + i + 1);
          }
          break;
        }
        case 'MultiPoint': {
          for (const coord of geom.coordinates) {
            vertices.push(coord[0], coord[1], coord[2] || 0);
            indices.push(vertexCount++);
          }
          break;
        }
        case 'MultiLineString': {
          for (const line of geom.coordinates) {
            const startIndex = vertexCount;
            for (const coord of line) {
              vertices.push(coord[0], coord[1], coord[2] || 0);
              vertexCount++;
            }
            for (let i = 0; i < line.length - 1; i++) {
              indices.push(startIndex + i, startIndex + i + 1);
            }
          }
          break;
        }
        case 'MultiPolygon': {
          for (const polygon of geom.coordinates) {
            const ring = polygon[0];
            const startIndex = vertexCount;
            for (const coord of ring) {
              vertices.push(coord[0], coord[1], coord[2] || 0);
              vertexCount++;
            }
            for (let i = 1; i < ring.length - 1; i++) {
              indices.push(startIndex, startIndex + i, startIndex + i + 1);
            }
          }
          break;
        }
      }
    }

    return {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices),
      vertexCount,
    };
  }

  /**
   * Process geometry features.
   *
   * @param features - GeoJSON features to process
   * @param options - Processing options
   * @returns Promise resolving to processing result
   */
  async processGeometry(
    features: GeoJSON.Feature[],
    options: GeometryProcessOptions = {}
  ): Promise<GeometryProcessResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return this.sendRequest<GeometryProcessResult>('processGeometry', {
      features,
      options,
    });
  }

  /**
   * Simplify features.
   *
   * @param features - Features to simplify
   * @param tolerance - Simplification tolerance
   * @returns Promise resolving to simplified features
   */
  async simplify(
    features: GeoJSON.Feature[],
    tolerance: number
  ): Promise<GeoJSON.Feature[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return this.sendRequest<GeoJSON.Feature[]>('simplify', {
      features,
      tolerance,
    });
  }

  /**
   * Compute bounds for all features.
   *
   * @param features - Features to compute bounds for
   * @returns Promise resolving to bounds array
   */
  async computeBounds(
    features: GeoJSON.Feature[]
  ): Promise<Array<{ minX: number; minY: number; maxX: number; maxY: number }>> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return this.sendRequest('computeBounds', { features });
  }

  /**
   * Generate vertex buffers.
   *
   * @param features - Features to generate buffers for
   * @param stride - Vertex stride in bytes
   * @returns Promise resolving to buffer data
   */
  async generateBuffers(
    features: GeoJSON.Feature[],
    stride: number = 12
  ): Promise<{ vertices: Float32Array; indices: Uint16Array; vertexCount: number }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return this.sendRequest('generateBuffers', { features, stride });
  }

  /**
   * Get number of pending requests.
   *
   * @returns Pending request count
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Check if worker is busy.
   *
   * @returns true if there are pending requests
   */
  isBusy(): boolean {
    return this.pendingRequests.size > 0;
  }

  /**
   * Terminate the worker.
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // Reject pending requests and clear timeouts
    for (const [, pending] of this.pendingRequests) {
      if (pending.timeoutId) {
        clearTimeout(pending.timeoutId);
      }
      pending.reject(new Error('Worker terminated'));
    }
    this.pendingRequests.clear();

    this.isInitialized = false;
  }

  /**
   * Clean up resources.
   */
  dispose(): void {
    this.terminate();
  }
}
