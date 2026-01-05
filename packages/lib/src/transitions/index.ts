/**
 * Transitions Module
 *
 * Provides smooth shader transitions with various easing and morphing effects:
 *
 * - **ShaderTransition**: Animate between shader configurations
 * - **Easing**: Library of easing functions (linear, ease-in-out, bounce, etc.)
 * - **chainTransitions**: Run multiple transitions in sequence
 *
 * @module transitions
 *
 * @example
 * ```typescript
 * import { ShaderTransition, Easing, chainTransitions } from 'maplibre-animated-shaders';
 *
 * // Single transition
 * const transition = new ShaderTransition();
 * transition.start(
 *   { color: '#ff0000', intensity: 0.5 },
 *   { color: '#00ff00', intensity: 1.0 },
 *   { duration: 500, easing: Easing.easeInOut }
 * );
 *
 * // Update in animation loop
 * transition.update(deltaTime);
 * const current = transition.getCurrentConfig();
 *
 * // Chain multiple transitions
 * await chainTransitions([
 *   { from: config1, to: config2, duration: 300 },
 *   { from: config2, to: config3, duration: 500 },
 * ], (config) => layer.setConfig(config));
 * ```
 */

export {
  ShaderTransition,
  chainTransitions,
  Easing,
  type EasingFunction,
  type TransitionType,
  type TransitionConfig,
  type TransitionState,
} from './ShaderTransition';
