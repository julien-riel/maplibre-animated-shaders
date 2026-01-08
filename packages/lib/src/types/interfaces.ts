/**
 * Interface Types
 *
 * Interfaces for the main service classes.
 */

import type {
  ShaderConfig,
  ShaderDefinition,
  ConfigSchema,
  ValidationResult,
  GeometryType,
} from './core';

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

  /** Update shader source code at runtime (hot-reload) */
  updateShaderSource(layerId: string, fragmentShader: string, vertexShader?: string): boolean;

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
  /** Unregister a shader definition by name */
  unregister(name: string): boolean;
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
