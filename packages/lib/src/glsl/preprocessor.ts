/**
 * GLSL Preprocessor
 *
 * Provides a simple preprocessor for GLSL shaders that supports `#include <library>` directives.
 * This allows shader authors to include built-in GLSL libraries without manual template literals.
 *
 * @example
 * ```glsl
 * precision highp float;
 *
 * #include <noise>
 * #include <shapes>
 *
 * void main() {
 *   float n = fbm(v_pos * 4.0, 4);
 *   float circle = sdCircle(v_pos, 0.5);
 *   gl_FragColor = vec4(vec3(n), fillAA(circle, 0.01));
 * }
 * ```
 */

import noiseGLSL from './common/noise.glsl';
import easingGLSL from './common/easing.glsl';
import shapesGLSL from './common/shapes.glsl';
import colorsGLSL from './common/colors.glsl';

/**
 * Available GLSL library names
 */
export type GLSLLibraryName = 'noise' | 'easing' | 'shapes' | 'colors' | 'all';

/**
 * Registry of available GLSL libraries
 */
const GLSL_LIBRARIES: Record<GLSLLibraryName, string> = {
  noise: noiseGLSL,
  easing: easingGLSL,
  shapes: shapesGLSL,
  colors: colorsGLSL,
  // Combined library with all utilities
  all: [noiseGLSL, easingGLSL, shapesGLSL, colorsGLSL].join('\n'),
};

/**
 * Regex pattern to match #include directives
 * Matches: #include <libraryName> or #include "libraryName"
 */
const INCLUDE_PATTERN = /#include\s*[<"](\w+)[>"]/g;

/**
 * Result of preprocessing a GLSL shader
 */
export interface PreprocessResult {
  /** The processed shader source */
  source: string;
  /** Libraries that were included */
  includedLibraries: string[];
  /** Warnings generated during preprocessing */
  warnings: string[];
}

/**
 * Options for the GLSL preprocessor
 */
export interface PreprocessOptions {
  /** Whether to add comment markers around included code (default: true) */
  addComments?: boolean;
  /** Custom libraries to add to the registry */
  customLibraries?: Record<string, string>;
  /** Whether to warn about unknown libraries (default: true) */
  warnUnknown?: boolean;
}

/**
 * Preprocess a GLSL shader source, resolving #include directives.
 *
 * @param source - The GLSL shader source code
 * @param options - Preprocessing options
 * @returns The preprocessed result with source code and metadata
 *
 * @example
 * ```typescript
 * const result = preprocessGLSL(`
 *   precision highp float;
 *   #include <noise>
 *   void main() { float n = snoise(v_pos); }
 * `);
 * console.log(result.source); // Contains noise functions
 * console.log(result.includedLibraries); // ['noise']
 * ```
 */
export function preprocessGLSL(source: string, options: PreprocessOptions = {}): PreprocessResult {
  const { addComments = true, customLibraries = {}, warnUnknown = true } = options;

  // Merge custom libraries with built-in ones
  const libraries: Record<string, string> = {
    ...GLSL_LIBRARIES,
    ...customLibraries,
  };

  const includedLibraries: string[] = [];
  const warnings: string[] = [];
  const alreadyIncluded = new Set<string>();

  const processedSource = source.replace(INCLUDE_PATTERN, (_match, libraryName: string) => {
    // Check if already included (prevent duplicates)
    if (alreadyIncluded.has(libraryName)) {
      return `// #include <${libraryName}> (already included)`;
    }

    const library = libraries[libraryName];
    if (!library) {
      if (warnUnknown) {
        const availableLibs = Object.keys(libraries).join(', ');
        warnings.push(
          `Unknown GLSL library: '${libraryName}'. Available libraries: ${availableLibs}`
        );
      }
      return `// Unknown library: ${libraryName}`;
    }

    alreadyIncluded.add(libraryName);
    includedLibraries.push(libraryName);

    if (addComments) {
      return `// --- Begin #include <${libraryName}> ---\n${library}\n// --- End #include <${libraryName}> ---`;
    }

    return library;
  });

  return {
    source: processedSource,
    includedLibraries,
    warnings,
  };
}

/**
 * Get a list of available GLSL library names
 *
 * @returns Array of available library names
 */
export function getAvailableLibraries(): string[] {
  return Object.keys(GLSL_LIBRARIES);
}

/**
 * Check if a library is available
 *
 * @param name - The library name to check
 * @returns True if the library exists
 */
export function isLibraryAvailable(name: string): boolean {
  return name in GLSL_LIBRARIES;
}

/**
 * Get the source code of a specific GLSL library
 *
 * @param name - The library name
 * @returns The library source code or undefined if not found
 */
export function getLibrarySource(name: GLSLLibraryName): string | undefined {
  return GLSL_LIBRARIES[name];
}

/**
 * Simple preprocessing function that just returns the source string.
 * This is a convenience function for quick preprocessing.
 *
 * @param source - The GLSL shader source code
 * @returns The preprocessed source code
 *
 * @example
 * ```typescript
 * const shader = processGLSL(`
 *   #include <noise>
 *   void main() { float n = snoise(v_pos); }
 * `);
 * ```
 */
export function processGLSL(source: string): string {
  return preprocessGLSL(source).source;
}
