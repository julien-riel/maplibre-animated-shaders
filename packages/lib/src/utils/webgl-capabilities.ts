/**
 * WebGL Capabilities Detection
 *
 * Detects browser WebGL capabilities to ensure compatibility
 * and provide meaningful error messages when requirements aren't met.
 */

/**
 * WebGL capabilities detected from the browser (without a GL context)
 */
export interface BrowserWebGLCapabilities {
  /** Whether WebGL is supported at all */
  supported: boolean;
  /** WebGL version (1 or 2) */
  version: 1 | 2 | null;
  /** Maximum texture size in pixels */
  maxTextureSize: number;
  /** Maximum vertex uniform vectors */
  maxVertexUniforms: number;
  /** Maximum fragment uniform vectors */
  maxFragmentUniforms: number;
  /** Whether high precision floats are supported in fragment shaders */
  highPrecisionSupported: boolean;
  /** Available WebGL extensions */
  extensions: {
    /** OES_texture_float - floating point textures */
    floatTextures: boolean;
    /** ANGLE_instanced_arrays or WebGL2 native */
    instancedArrays: boolean;
    /** OES_vertex_array_object or WebGL2 native */
    vertexArrayObjects: boolean;
  };
}

/**
 * Result of checking minimum requirements
 */
export interface RequirementsCheckResult {
  /** Whether all minimum requirements are met */
  ok: boolean;
  /** List of error messages for unmet requirements */
  errors: string[];
  /** The detected capabilities */
  capabilities: BrowserWebGLCapabilities;
}

/**
 * Detect WebGL capabilities of the current browser.
 *
 * Creates a temporary canvas to probe WebGL support and capabilities.
 * The canvas is not attached to the DOM and is garbage collected after use.
 *
 * @returns The detected WebGL capabilities
 */
export function detectWebGLCapabilities(): BrowserWebGLCapabilities {
  // Create a temporary canvas for detection
  const canvas = document.createElement('canvas');

  // Try WebGL 2 first, then fall back to WebGL 1
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = canvas.getContext(
    'webgl2'
  ) as WebGL2RenderingContext | null;

  let version: 1 | 2 | null = gl ? 2 : null;

  if (!gl) {
    gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
    version = gl ? 1 : null;
  }

  if (!gl) {
    return {
      supported: false,
      version: null,
      maxTextureSize: 0,
      maxVertexUniforms: 0,
      maxFragmentUniforms: 0,
      highPrecisionSupported: false,
      extensions: {
        floatTextures: false,
        instancedArrays: false,
        vertexArrayObjects: false,
      },
    };
  }

  // Check high precision support in fragment shaders
  const highPrecision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
  const highPrecisionSupported = highPrecision !== null && highPrecision.precision > 0;

  return {
    supported: true,
    version,
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
    maxVertexUniforms: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS) as number,
    maxFragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) as number,
    highPrecisionSupported,
    extensions: {
      floatTextures: !!gl.getExtension('OES_texture_float'),
      instancedArrays: version === 2 || !!gl.getExtension('ANGLE_instanced_arrays'),
      vertexArrayObjects: version === 2 || !!gl.getExtension('OES_vertex_array_object'),
    },
  };
}

/**
 * Check if the browser meets the minimum requirements for this library.
 *
 * @returns Object with ok status, error messages, and detected capabilities
 */
export function checkMinimumRequirements(): RequirementsCheckResult {
  const capabilities = detectWebGLCapabilities();
  const errors: string[] = [];

  if (!capabilities.supported) {
    errors.push('WebGL is not supported in this browser');
  } else {
    if (!capabilities.highPrecisionSupported) {
      errors.push(
        'High precision floats are not supported in fragment shaders. ' +
          'Some visual effects may not render correctly.'
      );
    }

    if (capabilities.maxTextureSize < 2048) {
      errors.push(
        `Maximum texture size (${capabilities.maxTextureSize}px) is below ` +
          'the recommended minimum (2048px)'
      );
    }

    if (capabilities.maxFragmentUniforms < 64) {
      errors.push(
        `Maximum fragment uniforms (${capabilities.maxFragmentUniforms}) is below ` +
          'the recommended minimum (64). Some complex shaders may not work.'
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    capabilities,
  };
}

/**
 * Log WebGL capabilities to the console for debugging.
 *
 * @param capabilities - The capabilities to log
 */
export function logCapabilities(capabilities: BrowserWebGLCapabilities): void {
  /* eslint-disable no-console */
  console.group('[WebGL Capabilities]');
  console.log('Supported:', capabilities.supported);
  console.log('Version:', capabilities.version ? `WebGL ${capabilities.version}` : 'N/A');
  console.log('Max Texture Size:', capabilities.maxTextureSize);
  console.log('Max Vertex Uniforms:', capabilities.maxVertexUniforms);
  console.log('Max Fragment Uniforms:', capabilities.maxFragmentUniforms);
  console.log('High Precision Floats:', capabilities.highPrecisionSupported);
  console.log('Extensions:', capabilities.extensions);
  console.groupEnd();
  /* eslint-enable no-console */
}
