/**
 * Types for the stacked effects system
 */

import type { TimeOffsetValue, InteractivityConfig } from 'maplibre-animated-shaders/types';

export type EffectId = string;
export type GeometryType = 'point' | 'line' | 'polygon' | 'global';

/**
 * Time offset mode for the UI
 */
export type TimeOffsetMode = 'none' | 'random' | 'hash' | 'property' | 'range';

/**
 * Advanced configuration for animation timing and interactivity
 */
export interface AdvancedEffectConfig {
  /** Time offset mode */
  timeOffsetMode: TimeOffsetMode;
  /** Time offset value (computed from mode) */
  timeOffset?: TimeOffsetValue;
  /** Property name for 'property' and 'hash' modes */
  timeOffsetProperty?: string;
  /** Min value for 'range' mode */
  timeOffsetMin?: number;
  /** Max value for 'range' mode */
  timeOffsetMax?: number;
  /** Animation period in seconds */
  period?: number;
  /** Random seed for reproducibility */
  randomSeed?: string;
  /** Interactivity configuration */
  interactivity?: InteractivityConfig;
}

/**
 * Represents a single effect in the stack
 */
export interface StackedEffect {
  /** Unique ID: 'pulse-1', 'glow-2' */
  id: EffectId;
  /** Shader name from registry */
  shaderName: string;
  /** Display name */
  displayName: string;
  /** Geometry type */
  geometry: GeometryType;
  /** Per-instance configuration */
  config: Record<string, unknown>;
  /** Whether effect is visible */
  visible: boolean;
  /** Whether effect is playing */
  isPlaying: boolean;
  /** MapLibre layer ID: 'effect-{id}' */
  layerId: string;
  /** Advanced configuration (timing, interactivity) */
  advancedConfig?: AdvancedEffectConfig;
}

/**
 * State of the effect stack
 */
export interface EffectStackState {
  /** Ordered list (index 0 = bottom of stack) */
  effects: StackedEffect[];
  /** Currently selected for editing */
  selectedEffectId: EffectId | null;
  /** Counter for unique IDs */
  nextIdCounter: number;
}

/**
 * Create an initial empty effect stack state
 */
export function createInitialEffectStackState(): EffectStackState {
  return {
    effects: [],
    selectedEffectId: null,
    nextIdCounter: 1
  };
}

/**
 * Find an effect by ID in the stack
 */
export function findEffect(
  state: EffectStackState,
  effectId: EffectId
): StackedEffect | undefined {
  return state.effects.find((e) => e.id === effectId);
}

/**
 * Remove an effect from the stack
 */
export function removeEffectFromStack(
  state: EffectStackState,
  effectId: EffectId
): void {
  const index = state.effects.findIndex((e) => e.id === effectId);
  if (index !== -1) {
    state.effects.splice(index, 1);
  }
}

/**
 * Create default advanced configuration
 */
export function createDefaultAdvancedConfig(): AdvancedEffectConfig {
  return {
    timeOffsetMode: 'none',
    period: 1,
    randomSeed: '',
    interactivity: {
      perFeatureControl: false,
      initialState: 'playing',
      // Use 'id' property from feature properties for identification
      featureIdProperty: 'id',
    },
  };
}

/**
 * Convert AdvancedEffectConfig to shader-compatible config
 */
export function buildShaderAdvancedConfig(
  advancedConfig: AdvancedEffectConfig
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Build timeOffset value based on mode
  switch (advancedConfig.timeOffsetMode) {
    case 'random':
      result.timeOffset = 'random';
      break;
    case 'hash':
      if (advancedConfig.timeOffsetProperty) {
        result.timeOffset = ['hash', advancedConfig.timeOffsetProperty];
      }
      break;
    case 'property':
      if (advancedConfig.timeOffsetProperty) {
        result.timeOffset = ['get', advancedConfig.timeOffsetProperty];
      }
      break;
    case 'range':
      if (advancedConfig.timeOffsetMin !== undefined && advancedConfig.timeOffsetMax !== undefined) {
        result.timeOffset = { min: advancedConfig.timeOffsetMin, max: advancedConfig.timeOffsetMax };
      }
      break;
    case 'none':
    default:
      // No timeOffset
      break;
  }

  // Add period if set
  if (advancedConfig.period !== undefined && advancedConfig.period !== 1) {
    result.period = advancedConfig.period;
  }

  // Add randomSeed if set
  if (advancedConfig.randomSeed) {
    result.randomSeed = advancedConfig.randomSeed;
  }

  return result;
}
