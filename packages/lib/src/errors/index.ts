/**
 * Custom error hierarchy for maplibre-animated-shaders
 * Provides typed errors for better error handling and debugging.
 */

// ============================================
// Error Codes
// ============================================

export const ErrorCodes = {
  // Shader errors
  SHADER_NOT_FOUND: 'SHADER_NOT_FOUND',
  SHADER_COMPILATION_FAILED: 'SHADER_COMPILATION_FAILED',
  SHADER_LINKING_FAILED: 'SHADER_LINKING_FAILED',

  // Layer errors
  LAYER_NOT_FOUND: 'LAYER_NOT_FOUND',
  LAYER_ALREADY_REGISTERED: 'LAYER_ALREADY_REGISTERED',
  INVALID_LAYER_TYPE: 'INVALID_LAYER_TYPE',

  // Plugin errors
  PLUGIN_VALIDATION_FAILED: 'PLUGIN_VALIDATION_FAILED',
  PLUGIN_NOT_FOUND: 'PLUGIN_NOT_FOUND',
  PLUGIN_ALREADY_REGISTERED: 'PLUGIN_ALREADY_REGISTERED',

  // Configuration errors
  INVALID_CONFIGURATION: 'INVALID_CONFIGURATION',
  MISSING_REQUIRED_CONFIG: 'MISSING_REQUIRED_CONFIG',

  // WebGL errors
  WEBGL_NOT_SUPPORTED: 'WEBGL_NOT_SUPPORTED',
  WEBGL_CONTEXT_LOST: 'WEBGL_CONTEXT_LOST',
  BUFFER_CREATION_FAILED: 'BUFFER_CREATION_FAILED',

  // General errors
  INITIALIZATION_FAILED: 'INITIALIZATION_FAILED',
  INVALID_ARGUMENT: 'INVALID_ARGUMENT',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ============================================
// Base Error Class
// ============================================

/**
 * Base error class for all shader manager errors.
 * Provides a consistent error interface with error codes.
 */
export class ShaderManagerError extends Error {
  public readonly timestamp: number;

  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ShaderManagerError';
    this.timestamp = Date.now();

    // Maintains proper stack trace for where error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Returns a JSON-serializable representation of the error
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

// ============================================
// Shader Errors
// ============================================

/**
 * Error thrown when a shader cannot be found in the registry.
 */
export class ShaderNotFoundError extends ShaderManagerError {
  constructor(shaderName: string, availableShaders?: string[]) {
    const message = availableShaders
      ? `Shader "${shaderName}" not found. Available shaders: ${availableShaders.join(', ')}`
      : `Shader "${shaderName}" not found in registry`;

    super(message, ErrorCodes.SHADER_NOT_FOUND, {
      shaderName,
      availableShaders,
    });
    this.name = 'ShaderNotFoundError';
  }
}

// ============================================
// Layer Errors
// ============================================

/**
 * Error thrown when a layer cannot be found on the map.
 */
export class LayerNotFoundError extends ShaderManagerError {
  constructor(layerId: string) {
    super(`Layer "${layerId}" not found on map`, ErrorCodes.LAYER_NOT_FOUND, {
      layerId,
    });
    this.name = 'LayerNotFoundError';
  }
}

/**
 * Error thrown when trying to register a shader on an already registered layer.
 */
export class LayerAlreadyRegisteredError extends ShaderManagerError {
  constructor(layerId: string) {
    super(
      `Layer "${layerId}" already has a shader registered. Unregister it first.`,
      ErrorCodes.LAYER_ALREADY_REGISTERED,
      { layerId }
    );
    this.name = 'LayerAlreadyRegisteredError';
  }
}

/**
 * Error thrown when the layer type doesn't match the shader geometry.
 */
export class InvalidLayerTypeError extends ShaderManagerError {
  constructor(layerId: string, expectedType: string, actualType: string) {
    super(
      `Layer "${layerId}" has type "${actualType}" but shader requires "${expectedType}"`,
      ErrorCodes.INVALID_LAYER_TYPE,
      { layerId, expectedType, actualType }
    );
    this.name = 'InvalidLayerTypeError';
  }
}

// ============================================
// Plugin Errors
// ============================================

/**
 * Error thrown when plugin validation fails.
 */
export class PluginValidationError extends ShaderManagerError {
  constructor(pluginName: string, errors: string[]) {
    super(
      `Plugin "${pluginName}" validation failed: ${errors.join('; ')}`,
      ErrorCodes.PLUGIN_VALIDATION_FAILED,
      { pluginName, errors }
    );
    this.name = 'PluginValidationError';
  }
}

/**
 * Error thrown when a plugin cannot be found.
 */
export class PluginNotFoundError extends ShaderManagerError {
  constructor(pluginName: string) {
    super(`Plugin "${pluginName}" is not registered`, ErrorCodes.PLUGIN_NOT_FOUND, {
      pluginName,
    });
    this.name = 'PluginNotFoundError';
  }
}

// ============================================
// Configuration Errors
// ============================================

/**
 * Error thrown when shader configuration is invalid.
 */
export class ConfigurationError extends ShaderManagerError {
  constructor(message: string, configKey?: string, providedValue?: unknown) {
    super(message, ErrorCodes.INVALID_CONFIGURATION, {
      configKey,
      providedValue,
    });
    this.name = 'ConfigurationError';
  }
}

// ============================================
// WebGL Errors
// ============================================

/**
 * Error thrown when WebGL is not supported by the browser.
 */
export class WebGLNotSupportedError extends ShaderManagerError {
  constructor(reason?: string) {
    super(
      reason
        ? `WebGL is not supported: ${reason}`
        : 'WebGL is not supported in this browser. Animated shaders require WebGL to function.',
      ErrorCodes.WEBGL_NOT_SUPPORTED,
      { reason }
    );
    this.name = 'WebGLNotSupportedError';
  }
}

/**
 * Error thrown when WebGL context is lost.
 */
export class WebGLContextLostError extends ShaderManagerError {
  constructor(layerId?: string) {
    super(
      layerId ? `WebGL context lost for layer "${layerId}"` : 'WebGL context lost',
      ErrorCodes.WEBGL_CONTEXT_LOST,
      { layerId }
    );
    this.name = 'WebGLContextLostError';
  }
}

// ============================================
// Re-export existing WebGL errors for convenience
// ============================================

export { ShaderError, WebGLContextError, BufferError } from '../utils/webgl-error-handler';

// ============================================
// Type Guards
// ============================================

/**
 * Type guard to check if an error is a ShaderManagerError
 */
export function isShaderManagerError(error: unknown): error is ShaderManagerError {
  return error instanceof ShaderManagerError;
}

/**
 * Type guard to check if an error has a specific error code
 */
export function hasErrorCode(error: unknown, code: ErrorCode): boolean {
  return isShaderManagerError(error) && error.code === code;
}
