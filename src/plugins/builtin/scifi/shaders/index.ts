/**
 * Sci-Fi Plugin Shaders
 *
 * Exports all shaders for the sci-fi plugin.
 */

// Point shaders
export { radarShader, radarDefaultConfig, radarConfigSchema } from './radar';
export type { RadarConfig } from './radar';

export { glowShader, glowDefaultConfig, glowConfigSchema } from './glow';
export type { GlowConfig } from './glow';

// Line shaders
export { electricShader, electricDefaultConfig, electricConfigSchema } from './electric';
export type { ElectricConfig } from './electric';

export { neonShader, neonDefaultConfig, neonConfigSchema } from './neon';
export type { NeonConfig } from './neon';

// Global shaders
export {
  holographicGridShader,
  holographicGridDefaultConfig,
  holographicGridConfigSchema,
} from './holographicGrid';
export type { HolographicGridConfig } from './holographicGrid';
