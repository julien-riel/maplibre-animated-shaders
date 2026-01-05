/**
 * Example Plugin Shaders - Barrel Export
 *
 * Exports all shaders for the example plugin, one for each geometry type:
 * - point: Pulse Marker (per-feature timing, easing, SDF)
 * - line: Flow Line (direction, gradient, glow)
 * - polygon: Wave Polygon (simplex noise, FBM, patterns)
 * - global: Grid Overlay (hash functions, scan effects)
 */

export { pointShader, type PointConfig } from './point';
export { lineShader, type LineConfig } from './line';
export { polygonShader, type PolygonConfig } from './polygon';
export { globalShader, type GlobalConfig } from './global';
