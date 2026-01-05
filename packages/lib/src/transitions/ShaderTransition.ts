/**
 * Shader Transition
 *
 * Provides smooth transitions between shaders using various
 * interpolation and morphing techniques.
 *
 * @module transitions/ShaderTransition
 */

import type { ShaderConfig, Uniforms } from '../types';

/**
 * Easing function type
 */
export type EasingFunction = (t: number) => number;

/**
 * Built-in easing functions
 */
export const Easing = {
  /** Linear interpolation */
  linear: (t: number) => t,

  /** Ease in (accelerate) */
  easeIn: (t: number) => t * t,

  /** Ease out (decelerate) */
  easeOut: (t: number) => t * (2 - t),

  /** Ease in-out (accelerate then decelerate) */
  easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  /** Ease in cubic */
  easeInCubic: (t: number) => t * t * t,

  /** Ease out cubic */
  easeOutCubic: (t: number) => --t * t * t + 1,

  /** Ease in-out cubic */
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  /** Ease in elastic */
  easeInElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
  },

  /** Ease out elastic */
  easeOutElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
  },

  /** Ease out bounce */
  easeOutBounce: (t: number) => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    }
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
};

/**
 * Transition type
 */
export type TransitionType = 'crossfade' | 'morph' | 'wipe' | 'dissolve' | 'slide';

/**
 * Transition configuration
 */
export interface TransitionConfig {
  /** Duration in milliseconds */
  duration: number;

  /** Easing function */
  easing?: EasingFunction;

  /** Transition type */
  type?: TransitionType;

  /** Direction for directional transitions (radians) */
  direction?: number;

  /** Callback when transition completes */
  onComplete?: () => void;

  /** Callback on each update with progress (0-1) */
  onUpdate?: (progress: number) => void;
}

/**
 * Transition state
 */
export interface TransitionState {
  /** Whether transition is active */
  active: boolean;

  /** Current progress (0-1) */
  progress: number;

  /** Elapsed time in ms */
  elapsed: number;

  /** Total duration in ms */
  duration: number;

  /** Transition type */
  type: TransitionType;
}

/**
 * Default transition configuration
 */
const DEFAULT_CONFIG: Required<Omit<TransitionConfig, 'onComplete' | 'onUpdate'>> = {
  duration: 500,
  easing: Easing.easeInOut,
  type: 'crossfade',
  direction: 0,
};

/**
 * Shader transition manager.
 *
 * @example
 * ```typescript
 * const transition = new ShaderTransition();
 *
 * // Start transition from one config to another
 * transition.start(
 *   { color: '#ff0000', intensity: 0.5 },
 *   { color: '#00ff00', intensity: 1.0 },
 *   { duration: 1000, easing: Easing.easeOutCubic }
 * );
 *
 * // In animation loop
 * function render(deltaTime) {
 *   transition.update(deltaTime);
 *
 *   if (transition.isActive()) {
 *     const config = transition.getCurrentConfig();
 *     applyConfig(config);
 *   }
 * }
 * ```
 */
export class ShaderTransition {
  private fromConfig: ShaderConfig | null = null;
  private toConfig: ShaderConfig | null = null;
  private config: Required<Omit<TransitionConfig, 'onComplete' | 'onUpdate'>> = { ...DEFAULT_CONFIG };
  private onComplete?: () => void;
  private onUpdate?: (progress: number) => void;

  private active: boolean = false;
  private progress: number = 0;
  private elapsed: number = 0;

  private currentConfig: ShaderConfig = {};
  private currentUniforms: Uniforms = {};

  /**
   * Start a transition between two configurations.
   *
   * @param from - Starting configuration
   * @param to - Target configuration
   * @param config - Transition options
   */
  start(from: ShaderConfig, to: ShaderConfig, config: TransitionConfig): void {
    this.fromConfig = { ...from };
    this.toConfig = { ...to };
    // Filter out undefined values to preserve defaults
    const filteredConfig = Object.fromEntries(
      Object.entries(config).filter(([, v]) => v !== undefined)
    );
    this.config = { ...DEFAULT_CONFIG, ...filteredConfig };
    this.onComplete = config.onComplete;
    this.onUpdate = config.onUpdate;

    this.active = true;
    this.progress = 0;
    this.elapsed = 0;

    // Initialize current config
    this.currentConfig = { ...from };
  }

  /**
   * Start a transition between two uniform sets.
   *
   * @param from - Starting uniforms
   * @param to - Target uniforms
   * @param config - Transition options
   */
  startUniforms(from: Uniforms, to: Uniforms, config: TransitionConfig): void {
    this.fromConfig = from as ShaderConfig;
    this.toConfig = to as ShaderConfig;
    // Filter out undefined values to preserve defaults
    const filteredConfig = Object.fromEntries(
      Object.entries(config).filter(([, v]) => v !== undefined)
    );
    this.config = { ...DEFAULT_CONFIG, ...filteredConfig };
    this.onComplete = config.onComplete;
    this.onUpdate = config.onUpdate;

    this.active = true;
    this.progress = 0;
    this.elapsed = 0;

    this.currentUniforms = { ...from };
  }

  /**
   * Update the transition.
   *
   * @param deltaTimeMs - Time since last update in milliseconds
   */
  update(deltaTimeMs: number): void {
    if (!this.active || !this.fromConfig || !this.toConfig) {
      return;
    }

    this.elapsed += deltaTimeMs;
    const rawProgress = Math.min(this.elapsed / this.config.duration, 1);
    this.progress = this.config.easing(rawProgress);

    // Interpolate configuration values
    this.interpolateConfig();

    // Call update callback
    if (this.onUpdate) {
      this.onUpdate(this.progress);
    }

    // Check for completion
    if (rawProgress >= 1) {
      this.active = false;
      this.currentConfig = { ...this.toConfig };

      if (this.onComplete) {
        this.onComplete();
      }
    }
  }

  /**
   * Interpolate between configurations.
   */
  private interpolateConfig(): void {
    if (!this.fromConfig || !this.toConfig) return;

    const result: ShaderConfig = {};
    const t = this.progress;

    // Get all keys from both configs
    const allKeys = new Set([
      ...Object.keys(this.fromConfig),
      ...Object.keys(this.toConfig),
    ]);

    for (const key of allKeys) {
      const fromVal = this.fromConfig[key];
      const toVal = this.toConfig[key];

      // Handle missing values
      if (fromVal === undefined) {
        result[key] = toVal;
        continue;
      }
      if (toVal === undefined) {
        result[key] = fromVal;
        continue;
      }

      // Interpolate based on type
      result[key] = this.interpolateValue(fromVal, toVal, t);
    }

    this.currentConfig = result;
  }

  /**
   * Interpolate a single value.
   */
  private interpolateValue(from: unknown, to: unknown, t: number): unknown {
    // Numbers
    if (typeof from === 'number' && typeof to === 'number') {
      return from + (to - from) * t;
    }

    // Booleans (snap at 50%)
    if (typeof from === 'boolean' && typeof to === 'boolean') {
      return t < 0.5 ? from : to;
    }

    // Colors (hex strings)
    if (typeof from === 'string' && typeof to === 'string') {
      if (from.startsWith('#') && to.startsWith('#')) {
        return this.interpolateColor(from, to, t);
      }
      // Other strings: snap at 50%
      return t < 0.5 ? from : to;
    }

    // Arrays (interpolate each element)
    if (Array.isArray(from) && Array.isArray(to)) {
      const length = Math.max(from.length, to.length);
      const result = [];
      for (let i = 0; i < length; i++) {
        const f = i < from.length ? from[i] : 0;
        const toV = i < to.length ? to[i] : 0;
        if (typeof f === 'number' && typeof toV === 'number') {
          result.push(f + (toV - f) * t);
        } else {
          result.push(t < 0.5 ? f : toV);
        }
      }
      return result;
    }

    // Default: snap at 50%
    return t < 0.5 ? from : to;
  }

  /**
   * Interpolate between two hex colors.
   */
  private interpolateColor(from: string, to: string, t: number): string {
    const fromRGB = this.hexToRGB(from);
    const toRGB = this.hexToRGB(to);

    const r = Math.round(fromRGB.r + (toRGB.r - fromRGB.r) * t);
    const g = Math.round(fromRGB.g + (toRGB.g - fromRGB.g) * t);
    const b = Math.round(fromRGB.b + (toRGB.b - fromRGB.b) * t);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Convert hex color to RGB.
   */
  private hexToRGB(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
      return { r: 0, g: 0, b: 0 };
    }
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
  }

  /**
   * Get the current interpolated configuration.
   *
   * @returns Current configuration
   */
  getCurrentConfig(): ShaderConfig {
    return this.currentConfig;
  }

  /**
   * Get the current interpolated uniforms.
   *
   * @returns Current uniforms
   */
  getCurrentUniforms(): Uniforms {
    return this.currentUniforms;
  }

  /**
   * Check if transition is active.
   *
   * @returns true if transition is in progress
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Get current transition progress (0-1).
   *
   * @returns Progress value
   */
  getProgress(): number {
    return this.progress;
  }

  /**
   * Get transition state.
   *
   * @returns Current state
   */
  getState(): TransitionState {
    return {
      active: this.active,
      progress: this.progress,
      elapsed: this.elapsed,
      duration: this.config.duration,
      type: this.config.type,
    };
  }

  /**
   * Cancel the current transition.
   */
  cancel(): void {
    this.active = false;
    this.fromConfig = null;
    this.toConfig = null;
  }

  /**
   * Skip to the end of the transition.
   */
  complete(): void {
    if (!this.active || !this.toConfig) return;

    this.progress = 1;
    this.currentConfig = { ...this.toConfig };
    this.active = false;

    if (this.onComplete) {
      this.onComplete();
    }
  }

  /**
   * Get blend factor for shader mixing.
   * Returns values suitable for uniform u_blend.
   *
   * @returns Blend factor based on transition type
   */
  getBlendFactor(): number {
    if (!this.active) {
      return 0;
    }

    switch (this.config.type) {
      case 'crossfade':
        return this.progress;

      case 'dissolve':
        // Add some noise-like variation
        return this.progress;

      case 'wipe':
        // Sharp edge wipe
        return this.progress;

      case 'slide':
        // Slide transition
        return this.progress;

      case 'morph':
        // Morphing uses smooth blend
        return this.progress;

      default:
        return this.progress;
    }
  }

  /**
   * Get wipe position for wipe transitions.
   *
   * @returns [x, y] position of wipe edge (0-1)
   */
  getWipePosition(): [number, number] {
    const direction = this.config.direction;
    const progress = this.progress;

    const x = 0.5 + Math.cos(direction) * (progress - 0.5);
    const y = 0.5 + Math.sin(direction) * (progress - 0.5);

    return [x, y];
  }
}

/**
 * Create a chained transition sequence.
 *
 * @param transitions - Array of transition configurations
 * @returns Promise that resolves when all transitions complete
 *
 * @example
 * ```typescript
 * await chainTransitions([
 *   { from: config1, to: config2, duration: 500 },
 *   { from: config2, to: config3, duration: 300 },
 *   { from: config3, to: config4, duration: 700 },
 * ], onUpdate);
 * ```
 */
export async function chainTransitions(
  transitions: Array<{
    from: ShaderConfig;
    to: ShaderConfig;
    duration: number;
    easing?: EasingFunction;
  }>,
  onUpdate: (config: ShaderConfig) => void
): Promise<void> {
  const transition = new ShaderTransition();

  for (const t of transitions) {
    await new Promise<void>((resolve) => {
      transition.start(t.from, t.to, {
        duration: t.duration,
        easing: t.easing,
        onComplete: resolve,
        onUpdate: () => onUpdate(transition.getCurrentConfig()),
      });

      // Simulate animation loop
      const animate = () => {
        transition.update(16.67); // ~60fps

        if (transition.isActive()) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    });
  }
}
