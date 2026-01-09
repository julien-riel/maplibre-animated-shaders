/**
 * GLSLHoverProvider - Hover documentation for GLSL
 */

import type * as Monaco from 'monaco-editor';
import type { GeometryType } from 'maplibre-animated-shaders';
import { varyingsByGeometry, libraryFunctions } from './GLSLLanguage';

/**
 * Documentation for built-in functions
 */
const functionDocs: Record<string, { signature: string; description: string }> = {
  // Math
  sin: { signature: 'float sin(float angle)', description: 'Returns the sine of the angle.' },
  cos: { signature: 'float cos(float angle)', description: 'Returns the cosine of the angle.' },
  tan: { signature: 'float tan(float angle)', description: 'Returns the tangent of the angle.' },
  pow: {
    signature: 'float pow(float x, float y)',
    description: 'Returns x raised to the power of y.',
  },
  sqrt: {
    signature: 'float sqrt(float x)',
    description: 'Returns the square root of x.',
  },
  abs: { signature: 'float abs(float x)', description: 'Returns the absolute value of x.' },
  floor: {
    signature: 'float floor(float x)',
    description: 'Returns the largest integer not greater than x.',
  },
  ceil: {
    signature: 'float ceil(float x)',
    description: 'Returns the smallest integer not less than x.',
  },
  fract: {
    signature: 'float fract(float x)',
    description: 'Returns the fractional part of x.',
  },
  mod: {
    signature: 'float mod(float x, float y)',
    description: 'Returns x modulo y.',
  },
  min: { signature: 'float min(float x, float y)', description: 'Returns the smaller of x and y.' },
  max: { signature: 'float max(float x, float y)', description: 'Returns the larger of x and y.' },
  clamp: {
    signature: 'float clamp(float x, float minVal, float maxVal)',
    description: 'Clamps x between minVal and maxVal.',
  },
  mix: {
    signature: 'float mix(float x, float y, float a)',
    description: 'Linear interpolation between x and y by a.',
  },
  step: {
    signature: 'float step(float edge, float x)',
    description: 'Returns 0.0 if x < edge, else 1.0.',
  },
  smoothstep: {
    signature: 'float smoothstep(float edge0, float edge1, float x)',
    description: 'Smooth Hermite interpolation between 0 and 1.',
  },

  // Geometric
  length: { signature: 'float length(vec2 v)', description: 'Returns the length of vector v.' },
  distance: {
    signature: 'float distance(vec2 p0, vec2 p1)',
    description: 'Returns the distance between p0 and p1.',
  },
  dot: {
    signature: 'float dot(vec2 x, vec2 y)',
    description: 'Returns the dot product of x and y.',
  },
  normalize: {
    signature: 'vec2 normalize(vec2 v)',
    description: 'Returns a vector with the same direction but length 1.',
  },

  // Texture
  texture2D: {
    signature: 'vec4 texture2D(sampler2D sampler, vec2 coord)',
    description: 'Samples a texture at the given coordinates.',
  },

  // Library: noise
  snoise: {
    signature: 'float snoise(vec2 v) / float snoise(vec3 v)',
    description: 'Simplex noise function returning values in [-1, 1].',
  },
  fbm: {
    signature: 'float fbm(vec2 v, int octaves)',
    description: 'Fractal Brownian motion - layered noise.',
  },
  random: {
    signature: 'float random(vec2 st)',
    description: 'Pseudo-random number based on 2D coordinates.',
  },
  voronoi: {
    signature: 'vec2 voronoi(vec2 v)',
    description: 'Voronoi/cellular noise pattern.',
  },

  // Library: shapes
  sdCircle: {
    signature: 'float sdCircle(vec2 p, float r)',
    description: 'Signed distance to a circle centered at origin.',
  },
  sdBox: {
    signature: 'float sdBox(vec2 p, vec2 b)',
    description: 'Signed distance to a box centered at origin.',
  },
  sdRing: {
    signature: 'float sdRing(vec2 p, float r, float w)',
    description: 'Signed distance to a ring with radius r and width w.',
  },
  fillAA: {
    signature: 'float fillAA(float d, float smoothing)',
    description: 'Anti-aliased fill from signed distance.',
  },
  strokeAA: {
    signature: 'float strokeAA(float d, float width, float smoothing)',
    description: 'Anti-aliased stroke from signed distance.',
  },

  // Library: easing
  easeInQuad: {
    signature: 'float easeInQuad(float t)',
    description: 'Quadratic ease-in function.',
  },
  easeOutQuad: {
    signature: 'float easeOutQuad(float t)',
    description: 'Quadratic ease-out function.',
  },
  easeInOutQuad: {
    signature: 'float easeInOutQuad(float t)',
    description: 'Quadratic ease-in-out function.',
  },
  easeOutBounce: {
    signature: 'float easeOutBounce(float t)',
    description: 'Bounce ease-out function.',
  },
  easeInElastic: {
    signature: 'float easeInElastic(float t)',
    description: 'Elastic ease-in function.',
  },
};

/**
 * GLSL Hover Provider
 */
export class GLSLHoverProvider implements Monaco.languages.HoverProvider {
  private geometryType: GeometryType = 'point';

  /**
   * Set geometry type for context-aware hovers
   */
  setGeometryType(geometry: GeometryType): void {
    this.geometryType = geometry;
  }

  /**
   * Provide hover information
   */
  provideHover(
    model: Monaco.editor.ITextModel,
    position: Monaco.Position
  ): Monaco.languages.Hover | null {
    const word = model.getWordAtPosition(position);
    if (!word) return null;

    const token = word.word;

    // Check for varying
    const varyings = varyingsByGeometry[this.geometryType] || [];
    const varying = varyings.find((v) => v.name === token);
    if (varying) {
      return {
        contents: [
          {
            value: `**${varying.name}** \`${varying.type}\`\n\n${varying.description}`,
          },
        ],
        range: {
          startLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endLineNumber: position.lineNumber,
          endColumn: word.endColumn,
        },
      };
    }

    // Check for function documentation
    const funcDoc = functionDocs[token];
    if (funcDoc) {
      return {
        contents: [
          {
            value: `\`\`\`glsl\n${funcDoc.signature}\n\`\`\`\n\n${funcDoc.description}`,
          },
        ],
        range: {
          startLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endLineNumber: position.lineNumber,
          endColumn: word.endColumn,
        },
      };
    }

    // Check for library name
    if (Object.keys(libraryFunctions).includes(token)) {
      const functions = libraryFunctions[token as keyof typeof libraryFunctions];
      return {
        contents: [
          {
            value: `**${token}** library\n\nFunctions: ${functions.join(', ')}\n\nUsage: \`#include <${token}>\``,
          },
        ],
        range: {
          startLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endLineNumber: position.lineNumber,
          endColumn: word.endColumn,
        },
      };
    }

    return null;
  }
}

/**
 * Create and register hover provider
 */
export function createHoverProvider(monaco: typeof Monaco): GLSLHoverProvider {
  const provider = new GLSLHoverProvider();
  monaco.languages.registerHoverProvider('glsl', provider);
  return provider;
}
