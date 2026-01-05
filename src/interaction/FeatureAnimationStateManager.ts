/**
 * Feature Animation State Manager
 *
 * Manages per-feature animation state for interactive shader layers.
 * Tracks isPlaying, localTime, and playCount for each feature with
 * efficient dirty-tracking for GPU buffer updates.
 *
 * @module interaction/FeatureAnimationStateManager
 *
 * @example
 * ```typescript
 * import { FeatureAnimationStateManager } from 'maplibre-animated-shaders';
 *
 * // Create manager with initial paused state
 * const stateManager = new FeatureAnimationStateManager({
 *   initialState: 'paused',
 *   featureIdProperty: 'id'
 * });
 *
 * // Initialize from GeoJSON features
 * stateManager.initializeFromFeatures(geojson.features);
 *
 * // Control individual features
 * stateManager.playFeature('feature-1');
 * stateManager.pauseFeature('feature-2');
 * stateManager.toggleFeature('feature-3');
 *
 * // Generate GPU buffer data
 * const { isPlayingData, localTimeData } = stateManager.generateBufferData(4);
 * ```
 */

import type { FeatureAnimationState, InteractivityConfig } from '../types';

/**
 * Manages animation state for individual features within a shader layer.
 *
 * This class provides:
 * - Per-feature play/pause/reset controls
 * - Efficient dirty-tracking for GPU buffer updates
 * - Support for custom feature ID properties
 * - Bulk operations (playAll, pauseAll, resetAll)
 * - GPU buffer generation for instanced rendering
 *
 * @example
 * ```typescript
 * const manager = new FeatureAnimationStateManager({
 *   initialState: 'playing',
 *   featureIdProperty: 'objectId'
 * });
 *
 * // Initialize from features
 * manager.initializeFromFeatures(features);
 *
 * // Toggle on click
 * map.on('click', 'layer', (e) => {
 *   const id = e.features[0].properties.objectId;
 *   manager.toggleFeature(id);
 * });
 *
 * // Check if buffers need updating
 * if (manager.isDirty()) {
 *   const data = manager.generateBufferData(4);
 *   updateGPUBuffers(data);
 *   manager.clearDirty();
 * }
 * ```
 */
export class FeatureAnimationStateManager {
  private states: Map<string | number, FeatureAnimationState> = new Map();
  private featureOrder: (string | number)[] = [];
  private dirty: boolean = true;
  private initialState: 'playing' | 'paused' | 'stopped';
  private featureIdProperty?: string;
  private lastGlobalTime: number = 0;

  /**
   * Create a new feature animation state manager.
   *
   * @param config - Optional interactivity configuration
   *
   * @example
   * ```typescript
   * // Default playing state
   * const manager = new FeatureAnimationStateManager();
   *
   * // Custom initial state and ID property
   * const manager = new FeatureAnimationStateManager({
   *   initialState: 'paused',
   *   featureIdProperty: 'objectId'
   * });
   * ```
   */
  constructor(config?: InteractivityConfig) {
    this.initialState = config?.initialState ?? 'playing';
    this.featureIdProperty = config?.featureIdProperty;
  }

  /**
   * Initialize animation states from an array of GeoJSON features.
   *
   * This clears any existing state and creates new state entries for each feature.
   * The initial playing state is determined by the configuration.
   *
   * @param features - Array of GeoJSON features to initialize
   *
   * @example
   * ```typescript
   * // Initialize from GeoJSON data
   * const geojson = await fetch('/data/points.geojson').then(r => r.json());
   * manager.initializeFromFeatures(geojson.features);
   *
   * console.log(`Initialized ${manager.getFeatureCount()} features`);
   * ```
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
   * Start playing animation for a specific feature.
   *
   * @param featureId - ID of the feature to play
   *
   * @example
   * ```typescript
   * manager.playFeature('point-123');
   * manager.playFeature(42);
   * ```
   */
  playFeature(featureId: string | number): void {
    const state = this.states.get(featureId);
    if (state && !state.isPlaying) {
      state.isPlaying = true;
      this.dirty = true;
    }
  }

  /**
   * Pause animation for a specific feature.
   *
   * When paused, the feature's local time is preserved so it can resume
   * from the same position.
   *
   * @param featureId - ID of the feature to pause
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
   * Reset animation for a specific feature to initial state.
   *
   * Sets local time and play count back to zero.
   *
   * @param featureId - ID of the feature to reset
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
   * Toggle between play and pause states for a specific feature.
   *
   * @param featureId - ID of the feature to toggle
   *
   * @example
   * ```typescript
   * // On click, toggle the animation
   * map.on('click', 'layer', (e) => {
   *   const id = e.features[0].id;
   *   manager.toggleFeature(id);
   * });
   * ```
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
   * Generate GPU buffer data for isPlaying and localTime uniforms.
   *
   * Creates Float32Arrays suitable for uploading to GPU buffers.
   * Data is expanded for multi-vertex geometries (e.g., 4 vertices per point quad).
   *
   * @param verticesPerFeature - Number of vertices per feature (e.g., 4 for quads)
   * @returns Object containing isPlayingData and localTimeData Float32Arrays
   *
   * @example
   * ```typescript
   * // For point sprites with 4 vertices each
   * const { isPlayingData, localTimeData } = manager.generateBufferData(4);
   *
   * // Upload to GPU
   * gl.bindBuffer(gl.ARRAY_BUFFER, isPlayingBuffer);
   * gl.bufferData(gl.ARRAY_BUFFER, isPlayingData, gl.DYNAMIC_DRAW);
   *
   * gl.bindBuffer(gl.ARRAY_BUFFER, localTimeBuffer);
   * gl.bufferData(gl.ARRAY_BUFFER, localTimeData, gl.DYNAMIC_DRAW);
   * ```
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
