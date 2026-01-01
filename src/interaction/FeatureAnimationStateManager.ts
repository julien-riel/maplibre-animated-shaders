/**
 * FeatureAnimationStateManager - Manages per-feature animation state
 *
 * Tracks isPlaying, localTime, and playCount for each feature.
 * Supports efficient dirty-tracking for GPU buffer updates.
 */

import type { FeatureAnimationState, InteractivityConfig } from '../types';

/**
 * Manages animation state for individual features within a shader layer.
 * Provides play/pause/reset controls and generates GPU buffer data.
 */
export class FeatureAnimationStateManager {
  private states: Map<string | number, FeatureAnimationState> = new Map();
  private featureOrder: (string | number)[] = [];
  private dirty: boolean = true;
  private initialState: 'playing' | 'paused' | 'stopped';
  private featureIdProperty?: string;
  private lastGlobalTime: number = 0;

  constructor(config?: InteractivityConfig) {
    this.initialState = config?.initialState ?? 'playing';
    this.featureIdProperty = config?.featureIdProperty;
  }

  /**
   * Initialize states from features
   */
  initializeFromFeatures(features: GeoJSON.Feature[]): void {
    this.states.clear();
    this.featureOrder = [];

    for (let i = 0; i < features.length; i++) {
      const featureId = this.getFeatureId(features[i], i);
      const state: FeatureAnimationState = {
        featureId,
        isPlaying: this.initialState === 'playing',
        localTime: 0,
        playCount: 0,
      };
      this.states.set(featureId, state);
      this.featureOrder.push(featureId);
    }

    this.dirty = true;
  }

  /**
   * Extract feature ID from feature using configured property or fallback
   */
  private getFeatureId(feature: GeoJSON.Feature, index: number): string | number {
    if (this.featureIdProperty && feature.properties?.[this.featureIdProperty] != null) {
      return feature.properties[this.featureIdProperty];
    }
    return feature.id ?? index;
  }

  /**
   * Get feature ID from MapLibre feature (used by InteractionHandler)
   */
  getFeatureIdFromMapLibreFeature(
    feature: { id?: string | number; properties?: Record<string, unknown> | null },
    fallbackIndex: number = 0
  ): string | number {
    if (this.featureIdProperty && feature.properties?.[this.featureIdProperty] != null) {
      return feature.properties[this.featureIdProperty] as string | number;
    }
    return feature.id ?? fallbackIndex;
  }

  /**
   * Play animation for a specific feature
   */
  playFeature(featureId: string | number): void {
    const state = this.states.get(featureId);
    if (state && !state.isPlaying) {
      state.isPlaying = true;
      this.dirty = true;
    }
  }

  /**
   * Pause animation for a specific feature
   */
  pauseFeature(featureId: string | number): void {
    const state = this.states.get(featureId);
    if (state && state.isPlaying) {
      // Store current global time as local time when pausing
      state.localTime = this.lastGlobalTime;
      state.isPlaying = false;
      this.dirty = true;
    }
  }

  /**
   * Reset animation for a specific feature
   */
  resetFeature(featureId: string | number): void {
    const state = this.states.get(featureId);
    if (state) {
      state.localTime = 0;
      state.playCount = 0;
      this.dirty = true;
    }
  }

  /**
   * Toggle play/pause for a specific feature
   */
  toggleFeature(featureId: string | number): void {
    const state = this.states.get(featureId);
    if (state) {
      if (state.isPlaying) {
        this.pauseFeature(featureId);
      } else {
        this.playFeature(featureId);
      }
    }
  }

  /**
   * Play animation once then pause (used with playOnce action)
   */
  playOnce(featureId: string | number): void {
    // For playOnce, we just play - the actual "once" logic would need
    // to be handled at a higher level with animation cycle detection
    this.playFeature(featureId);
  }

  /**
   * Play all features
   */
  playAll(): void {
    for (const state of this.states.values()) {
      if (!state.isPlaying) {
        state.isPlaying = true;
        this.dirty = true;
      }
    }
  }

  /**
   * Pause all features
   */
  pauseAll(): void {
    for (const state of this.states.values()) {
      if (state.isPlaying) {
        state.localTime = this.lastGlobalTime;
        state.isPlaying = false;
        this.dirty = true;
      }
    }
  }

  /**
   * Reset all features
   */
  resetAll(): void {
    for (const state of this.states.values()) {
      state.localTime = 0;
      state.playCount = 0;
    }
    this.dirty = true;
  }

  /**
   * Get state for a specific feature
   */
  getState(featureId: string | number): FeatureAnimationState | undefined {
    return this.states.get(featureId);
  }

  /**
   * Get state for a specific feature (alias for getState)
   */
  getFeatureState(featureId: string | number): FeatureAnimationState | undefined {
    return this.states.get(featureId);
  }

  /**
   * Get all feature states
   */
  getAllStates(): Map<string | number, FeatureAnimationState> {
    return new Map(this.states);
  }

  /**
   * Set state for a specific feature
   */
  setState(featureId: string | number, updates: Partial<FeatureAnimationState>): void {
    const state = this.states.get(featureId);
    if (state) {
      if (updates.isPlaying !== undefined) state.isPlaying = updates.isPlaying;
      if (updates.localTime !== undefined) state.localTime = updates.localTime;
      if (updates.playCount !== undefined) state.playCount = updates.playCount;
      this.dirty = true;
    }
  }

  /**
   * Update per frame - store global time for pause calculations
   */
  tick(globalTime: number, _deltaTime: number): void {
    this.lastGlobalTime = globalTime;
  }

  /**
   * Generate GPU buffer data for isPlaying and localTime
   * Expands data for multi-vertex geometries (e.g., 4 vertices per point quad)
   */
  generateBufferData(verticesPerFeature: number): {
    isPlayingData: Float32Array;
    localTimeData: Float32Array;
  } {
    const featureCount = this.featureOrder.length;
    const vertexCount = featureCount * verticesPerFeature;

    const isPlayingData = new Float32Array(vertexCount);
    const localTimeData = new Float32Array(vertexCount);

    for (let i = 0; i < featureCount; i++) {
      const featureId = this.featureOrder[i];
      const state = this.states.get(featureId);

      const isPlaying = state?.isPlaying ? 1.0 : 0.0;
      const localTime = state?.localTime ?? 0;

      // Expand to all vertices of this feature
      for (let v = 0; v < verticesPerFeature; v++) {
        const idx = i * verticesPerFeature + v;
        isPlayingData[idx] = isPlaying;
        localTimeData[idx] = localTime;
      }
    }

    return { isPlayingData, localTimeData };
  }

  /**
   * Check if state has changed since last clearDirty()
   */
  isDirty(): boolean {
    return this.dirty;
  }

  /**
   * Clear dirty flag after buffer update
   */
  clearDirty(): void {
    this.dirty = false;
  }

  /**
   * Get the number of features
   */
  getFeatureCount(): number {
    return this.featureOrder.length;
  }
}
