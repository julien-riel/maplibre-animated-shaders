/**
 * Rendering Module
 *
 * Provides rendering optimizations for improved performance and visual effects:
 *
 * - **FrustumCuller**: Skip rendering features outside the visible viewport
 * - **LODManager**: Simplify geometry based on zoom level
 * - **PostProcessingPipeline**: Apply screen-space effects like bloom, blur
 *
 * @module rendering
 *
 * @example
 * ```typescript
 * import { FrustumCuller, LODManager, PostProcessingPipeline } from 'maplibre-animated-shaders';
 *
 * // Frustum culling
 * const culler = new FrustumCuller();
 * culler.updateFrustum(projectionMatrix);
 * const visibleIndices = culler.cullFeatures(features, bounds);
 *
 * // Level of Detail
 * const lod = new LODManager();
 * const simplified = lod.applyLOD(features, currentZoom);
 *
 * // Post-processing
 * const pipeline = new PostProcessingPipeline(gl);
 * pipeline.addEffect(PostProcessingPipeline.createBloom(1.5));
 * pipeline.render(inputTexture);
 * ```
 */

export {
  FrustumCuller,
  createBBox2D,
  boxesIntersect,
  mergeBoxes,
  expandBox,
  type BBox2D,
  type BBox3D,
  type CullResult,
  type CullStats,
} from './FrustumCuller';

export { LODManager, DEFAULT_LOD_CONFIG, type LODLevel, type LODConfig } from './LODManager';

export {
  PostProcessingPipeline,
  type PostProcessEffect,
  type BuiltinEffect,
} from './PostProcessing';
