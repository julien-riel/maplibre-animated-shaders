/**
 * Types for the stacked effects system
 */

export type EffectId = string;
export type GeometryType = 'point' | 'line' | 'polygon' | 'global';

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
