/**
 * Core modules for ShaderManager.
 * These modules handle the internal logic and state management.
 */

// State management
export {
  createState,
  destroyState,
  log,
  type ShaderManagerState,
  type ShaderLayerUnion,
  type ResolvedShaderManagerOptions,
} from './ShaderState';

// Shader registration
export { registerShader, unregisterShader, removeAllShaders } from './ShaderRegistration';

// Playback control
export {
  play,
  pause,
  setSpeed,
  updateShaderConfig,
  updatePaintShader,
  applyUniforms,
} from './ShaderPlayback';
