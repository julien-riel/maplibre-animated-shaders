/**
 * Interactive Animation Types
 *
 * Types for per-feature animation control and user interaction.
 */

import type { ShaderConfig, ShaderController } from './core';
import type { AnimationTimingConfig } from './animation';

/**
 * Animation state for a single feature
 */
export interface FeatureAnimationState {
  /** Feature identifier */
  featureId: string | number;
  /** Whether the animation is currently playing */
  isPlaying: boolean;
  /** Local time accumulator (paused time) */
  localTime: number;
  /** Number of complete animation cycles */
  playCount: number;
}

/**
 * Interaction action types
 */
export type InteractionAction = 'toggle' | 'play' | 'pause' | 'reset' | 'playOnce';

/**
 * Custom interaction handler function
 */
export type InteractionHandler = (feature: GeoJSON.Feature, state: FeatureAnimationState) => void;

/**
 * Hover interaction configuration
 */
export interface HoverInteractionConfig {
  /** Action on mouse enter */
  enter?: InteractionAction | InteractionHandler;
  /** Action on mouse leave */
  leave?: InteractionAction | InteractionHandler;
}

/**
 * Interactivity configuration for per-feature animation control
 */
export interface InteractivityConfig {
  /**
   * Enable per-feature animation control
   * @default false
   */
  perFeatureControl?: boolean;

  /**
   * Initial animation state for features
   * @default 'playing'
   */
  initialState?: 'playing' | 'paused' | 'stopped';

  /**
   * Action on click
   *
   * @example
   * onClick: 'toggle'  // Toggle play/pause on click
   * onClick: (feature, state) => { ... }  // Custom handler
   */
  onClick?: InteractionAction | InteractionHandler;

  /**
   * Actions on hover
   *
   * @example
   * onHover: {
   *   enter: 'play',
   *   leave: 'pause'
   * }
   */
  onHover?: HoverInteractionConfig;

  /**
   * Property name to use as feature ID
   *
   * Falls back to feature.id or array index if not specified.
   */
  featureIdProperty?: string;
}

/**
 * Extended shader controller with per-feature control
 */
export interface InteractiveShaderController extends ShaderController {
  /** Play animation for a specific feature */
  playFeature: (featureId: string | number) => void;
  /** Pause animation for a specific feature */
  pauseFeature: (featureId: string | number) => void;
  /** Reset animation for a specific feature */
  resetFeature: (featureId: string | number) => void;
  /** Toggle animation for a specific feature */
  toggleFeature: (featureId: string | number) => void;
  /** Set state for a specific feature */
  setFeatureState?: (featureId: string | number, state: Partial<FeatureAnimationState>) => void;
  /** Get state for a specific feature */
  getFeatureState: (featureId: string | number) => FeatureAnimationState | undefined;
  /** Get all feature states */
  getAllFeatureStates?: () => Map<string | number, FeatureAnimationState>;
  /** Play all features */
  playAll: () => void;
  /** Pause all features */
  pauseAll: () => void;
  /** Reset all features */
  resetAll: () => void;
}

/**
 * Full shader configuration with all features
 */
export interface FullShaderConfig
  extends ShaderConfig, AnimationTimingConfig, InteractivityConfig {}
