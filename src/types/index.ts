import type { Map as MapLibreMap } from 'maplibre-gl';

/**
 * Geometry types supported by shaders
 */
export type GeometryType = 'point' | 'line' | 'polygon' | 'global';

/**
 * Color representation - hex string or RGBA array
 */
export type Color = string | [number, number, number, number];

/**
 * Base configuration common to all shaders
 */
export interface BaseShaderConfig {
  /** Speed multiplier (default: 1.0) */
  speed?: number;
  /** Effect intensity (default: 1.0) */
  intensity?: number;
  /** Enable/disable the shader (default: true) */
  enabled?: boolean;
}

/**
 * Generic shader configuration extending base config
 */
export interface ShaderConfig extends BaseShaderConfig {
  [key: string]: unknown;
}

/**
 * Configuration parameter types for schema validation
 */
export type ConfigParamType = 'number' | 'color' | 'boolean' | 'string' | 'array' | 'select';

/**
 * Schema for validating a single configuration parameter
 */
export interface ConfigParamSchema {
  type: ConfigParamType;
  default: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  description?: string;
  label?: string;
}

/**
 * Schema for validating shader configuration
 */
export type ConfigSchema = Record<string, ConfigParamSchema>;

/**
 * Result of configuration validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Single validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  value: unknown;
}

/**
 * Uniform values passed to GLSL shader or MapLibre paint properties
 */
export type UniformValue =
  | number
  | number[]
  | Float32Array
  | boolean
  | string
  | [number, number]
  | [number, number, number]
  | [number, number, number, number];

/**
 * Collection of uniform values
 */
export type Uniforms = Record<string, UniformValue>;

/**
 * Definition of a shader for registration
 */
export interface ShaderDefinition<T extends ShaderConfig = ShaderConfig> {
  /** Unique shader identifier */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Description of the shader effect */
  description: string;
  /** Geometry type this shader applies to */
  geometry: GeometryType;
  /** Tags for categorization */
  tags: string[];

  /** Fragment shader GLSL code (required) */
  fragmentShader: string;
  /** Vertex shader GLSL code (optional override) */
  vertexShader?: string;

  /** Default configuration values */
  defaultConfig: T;
  /** Schema for configuration validation */
  configSchema: ConfigSchema;

  /**
   * Compute uniform values from config and time
   */
  getUniforms: (config: T, time: number, deltaTime: number) => Uniforms;

  /** Required MapLibre paint properties */
  requiredPaint?: Record<string, unknown>;
  /** Required MapLibre layout properties */
  requiredLayout?: Record<string, unknown>;
}

/**
 * Active shader instance with runtime state
 */
export interface ShaderInstance {
  /** Associated layer ID */
  layerId: string;
  /** Shader definition */
  definition: ShaderDefinition;
  /** Current configuration */
  config: ShaderConfig;
  /** Whether the shader is currently playing */
  isPlaying: boolean;
  /** Speed multiplier */
  speed: number;
  /** Local time accumulator */
  localTime: number;
}

/**
 * Controller returned when applying a shader
 */
export interface ShaderController {
  /** Pause the animation */
  pause: () => void;
  /** Resume the animation */
  play: () => void;
  /** Update configuration */
  update: (config: Partial<ShaderConfig>) => void;
  /** Remove the shader */
  remove: () => void;
  /** Check if playing */
  isPlaying: () => boolean;
}

/**
 * Options for creating a ShaderManager
 */
export interface ShaderManagerOptions {
  /** Target FPS limit (default: 60) */
  targetFPS?: number;
  /** Auto-start animation loop (default: true) */
  autoStart?: boolean;
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

/**
 * Interface for the main ShaderManager
 */
export interface IShaderManager {
  /** Register a shader on a layer */
  register(layerId: string, shaderName: string, config?: Partial<ShaderConfig>): void;
  /** Unregister a shader from a layer */
  unregister(layerId: string): void;

  /** Play animation for a specific layer or all layers */
  play(layerId?: string): void;
  /** Pause animation for a specific layer or all layers */
  pause(layerId?: string): void;
  /** Set speed for a specific layer */
  setSpeed(layerId: string, speed: number): void;

  /** Update configuration at runtime */
  updateConfig(layerId: string, config: Partial<ShaderConfig>): void;

  /** Clean up all resources */
  destroy(): void;

  /** Get all registered layer IDs */
  getRegisteredLayers(): string[];
}

/**
 * Interface for the AnimationLoop
 */
export interface IAnimationLoop {
  /** Start the animation loop */
  start(): void;
  /** Stop the animation loop */
  stop(): void;
  /** Check if running */
  isRunning(): boolean;

  /** Add a shader update callback */
  addShader(id: string, updateFn: (time: number, deltaTime: number) => void): void;
  /** Remove a shader update callback */
  removeShader(id: string): void;

  /** Set global speed multiplier */
  setGlobalSpeed(speed: number): void;
  /** Get current global time */
  getTime(): number;
}

/**
 * Interface for the ShaderRegistry
 */
export interface IShaderRegistry {
  /** Register a shader definition */
  register(definition: ShaderDefinition): void;
  /** Get a shader by name */
  get(name: string): ShaderDefinition | undefined;
  /** Check if a shader exists */
  has(name: string): boolean;
  /** List all shader names, optionally filtered by geometry */
  list(geometry?: GeometryType): string[];
  /** Get all shader definitions */
  getAll(): ShaderDefinition[];
}

/**
 * Interface for the ConfigResolver
 */
export interface IConfigResolver {
  /** Resolve user config with defaults */
  resolve<T extends ShaderConfig>(defaults: T, userConfig?: Partial<T>): T;
  /** Validate config against schema */
  validate(config: ShaderConfig, schema: ConfigSchema): ValidationResult;
}

/**
 * MapLibre GL Map type re-export
 */
export type MapLibreMapInstance = MapLibreMap;

// =============================================================================
// Animation Timing Types (Phase 1 - Offset/Randomization)
// =============================================================================

/**
 * Time offset value specification
 *
 * - number: Fixed offset in seconds
 * - 'random': Random offset within [0, period]
 * - ['get', string]: Value from feature property
 * - ['hash', string]: Stable hash of feature property (normalized to [0, period])
 * - { min, max }: Random offset within range
 */
export type TimeOffsetValue =
  | number
  | 'random'
  | ['get', string]
  | ['hash', string]
  | { min: number; max: number };

/**
 * Animation timing configuration
 *
 * Controls per-feature time offset for animation desynchronization
 */
export interface AnimationTimingConfig {
  /**
   * Time offset mode
   *
   * @example
   * // Fixed offset
   * timeOffset: 0.5
   *
   * // Random offset within period
   * timeOffset: 'random'
   *
   * // Value from feature property
   * timeOffset: ['get', 'animation_delay']
   *
   * // Stable hash of property (reproducible)
   * timeOffset: ['hash', 'id']
   *
   * // Random within range
   * timeOffset: { min: 0, max: 2 }
   */
  timeOffset?: TimeOffsetValue;

  /**
   * Seed for reproducible random offsets
   *
   * Can be a number or string. Same seed produces same offsets.
   */
  randomSeed?: number | string;

  /**
   * Animation period in seconds
   *
   * Used to normalize offset values for 'random' and 'hash' modes.
   * @default 1
   */
  period?: number;
}

/**
 * Extended shader config with timing support
 */
export interface TimedShaderConfig extends ShaderConfig, AnimationTimingConfig {}

// =============================================================================
// Data-Driven Expression Types (Phase 2)
// =============================================================================

/**
 * MapLibre expression types for data-driven properties
 *
 * These expressions are evaluated per-feature using MapLibre's expression system.
 */
export type DataDrivenExpression =
  | ['get', string]
  | ['coalesce', ...unknown[]]
  | ['match', ...unknown[]]
  | ['interpolate', ...unknown[]]
  | ['case', ...unknown[]]
  | ['step', ...unknown[]]
  | ['literal', unknown]
  | ['==', ...unknown[]]
  | ['!=', ...unknown[]]
  | ['<', ...unknown[]]
  | ['<=', ...unknown[]]
  | ['>', ...unknown[]]
  | ['>=', ...unknown[]]
  | ['+', ...unknown[]]
  | ['-', ...unknown[]]
  | ['*', ...unknown[]]
  | ['/', ...unknown[]]
  | ['%', ...unknown[]]
  | ['^', ...unknown[]]
  | ['sqrt', unknown]
  | ['abs', unknown]
  | ['min', ...unknown[]]
  | ['max', ...unknown[]]
  | ['round', unknown]
  | ['floor', unknown]
  | ['ceil', unknown]
  | ['sin', unknown]
  | ['cos', unknown]
  | ['tan', unknown]
  | ['asin', unknown]
  | ['acos', unknown]
  | ['atan', unknown]
  | ['ln', unknown]
  | ['log10', unknown]
  | ['log2', unknown]
  | ['e']
  | ['pi']
  | ['zoom']
  | ['concat', ...unknown[]]
  | ['downcase', unknown]
  | ['upcase', unknown]
  | ['length', unknown]
  | ['rgb', number, number, number]
  | ['rgba', number, number, number, number]
  | ['to-color', unknown]
  | ['to-number', unknown]
  | ['to-string', unknown]
  | ['to-boolean', unknown]
  | ['all', ...unknown[]]
  | ['any', ...unknown[]]
  | ['!', unknown]
  | ['has', string]
  | ['in', ...unknown[]]
  | ['index-of', ...unknown[]]
  | ['slice', ...unknown[]]
  | ['let', ...unknown[]]
  | ['var', string]
  | ['at', number, unknown[]]
  | unknown[];  // Fallback for any other valid expression

/**
 * A value that can be either static or data-driven
 */
export type DataDrivenValue<T> = T | DataDrivenExpression;

/**
 * Data-driven shader configuration
 *
 * Any property can be either a static value or a MapLibre expression
 */
export type DataDrivenShaderConfig<T extends ShaderConfig = ShaderConfig> = {
  [K in keyof T]: DataDrivenValue<T[K]>;
} & AnimationTimingConfig;

// =============================================================================
// Interactive Animation Types (Phase 3)
// =============================================================================

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
export type InteractionAction =
  | 'toggle'
  | 'play'
  | 'pause'
  | 'reset'
  | 'playOnce';

/**
 * Custom interaction handler function
 */
export type InteractionHandler = (
  feature: GeoJSON.Feature,
  state: FeatureAnimationState
) => void;

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
export interface FullShaderConfig extends ShaderConfig, AnimationTimingConfig, InteractivityConfig {}
