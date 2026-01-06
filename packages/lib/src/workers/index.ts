/**
 * Workers Module
 *
 * Provides Web Worker support for off-main-thread geometry processing.
 * Keeps the main thread responsive while processing large datasets.
 *
 * Features:
 * - Automatic fallback to main thread if Workers unavailable
 * - Geometry simplification (Douglas-Peucker algorithm)
 * - Bounding box calculation
 * - Coordinate transformation
 *
 * @module workers
 *
 * @example
 * ```typescript
 * import { GeometryWorker } from 'maplibre-animated-shaders';
 *
 * const worker = new GeometryWorker();
 *
 * // Process geometry off main thread
 * const result = await worker.processGeometry(features, {
 *   simplify: true,
 *   tolerance: 0.001,
 *   computeBounds: true,
 * });
 *
 * console.log(`Processed ${result.featureCount} features`);
 * console.log(`Bounds: ${JSON.stringify(result.bounds)}`);
 *
 * // Clean up
 * worker.terminate();
 * ```
 */

export {
  GeometryWorker,
  type WorkerMessageType,
  type WorkerRequest,
  type WorkerResponse,
  type GeometryProcessOptions,
  type GeometryProcessResult,
} from './GeometryWorker';
