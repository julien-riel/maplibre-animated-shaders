/**
 * GLSL Common functions
 * These are imported as raw strings via vite-plugin-glsl
 */

import noiseGLSL from './common/noise.glsl';
import easingGLSL from './common/easing.glsl';
import shapesGLSL from './common/shapes.glsl';
import colorsGLSL from './common/colors.glsl';

export const glsl = {
  noise: noiseGLSL,
  easing: easingGLSL,
  shapes: shapesGLSL,
  colors: colorsGLSL,
};

export { noiseGLSL, easingGLSL, shapesGLSL, colorsGLSL };

// GLSL Preprocessor
export {
  preprocessGLSL,
  processGLSL,
  getAvailableLibraries,
  isLibraryAvailable,
  getLibrarySource,
} from './preprocessor';
export type { GLSLLibraryName, PreprocessResult, PreprocessOptions } from './preprocessor';
