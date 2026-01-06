/**
 * Terrain Module
 *
 * Provides 3D terrain rendering support with elevation sampling
 * and terrain-aware shader layers.
 *
 * - **ElevationSampler**: Sample elevation from DEM (Digital Elevation Model) textures
 *
 * Supports common DEM encodings:
 * - Mapbox Terrain-RGB
 * - Terrarium
 * - Raw grayscale
 *
 * @module terrain
 *
 * @example
 * ```typescript
 * import { ElevationSampler } from 'maplibre-animated-shaders';
 *
 * const sampler = new ElevationSampler(gl, {
 *   encoding: 'mapbox',
 *   tileSize: 512,
 *   minZoom: 0,
 *   maxZoom: 15,
 * });
 *
 * // Load DEM tile
 * await sampler.loadTile(z, x, y, demImageData);
 *
 * // Sample elevation at a point
 * const elevation = sampler.getElevation(longitude, latitude);
 * console.log(`Elevation: ${elevation}m`);
 * ```
 */

export { ElevationSampler, type DEMConfig } from './ElevationSampler';
