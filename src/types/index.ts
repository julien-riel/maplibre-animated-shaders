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
 * Uniform values passed to GLSL shader
 */
export type UniformValue =
  | number
  | number[]
  | Float32Array
  | boolean
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
