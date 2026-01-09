/**
 * GLSLLanguage - Monaco language definition for GLSL
 */

import type * as Monaco from 'monaco-editor';

/**
 * GLSL keywords
 */
const keywords = [
  'attribute',
  'const',
  'uniform',
  'varying',
  'break',
  'continue',
  'do',
  'for',
  'while',
  'if',
  'else',
  'in',
  'out',
  'inout',
  'true',
  'false',
  'discard',
  'return',
  'struct',
  'precision',
  'highp',
  'mediump',
  'lowp',
];

/**
 * GLSL types
 */
const types = [
  'void',
  'bool',
  'int',
  'float',
  'vec2',
  'vec3',
  'vec4',
  'bvec2',
  'bvec3',
  'bvec4',
  'ivec2',
  'ivec3',
  'ivec4',
  'mat2',
  'mat3',
  'mat4',
  'sampler2D',
  'samplerCube',
];

/**
 * Built-in GLSL functions
 */
const builtinFunctions = [
  // Math functions
  'radians',
  'degrees',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'pow',
  'exp',
  'log',
  'exp2',
  'log2',
  'sqrt',
  'inversesqrt',
  'abs',
  'sign',
  'floor',
  'ceil',
  'fract',
  'mod',
  'min',
  'max',
  'clamp',
  'mix',
  'step',
  'smoothstep',
  // Geometric functions
  'length',
  'distance',
  'dot',
  'cross',
  'normalize',
  'faceforward',
  'reflect',
  'refract',
  // Matrix functions
  'matrixCompMult',
  // Vector functions
  'lessThan',
  'lessThanEqual',
  'greaterThan',
  'greaterThanEqual',
  'equal',
  'notEqual',
  'any',
  'all',
  'not',
  // Texture functions
  'texture2D',
  'textureCube',
  'texture2DProj',
  'texture2DLod',
  'textureCubeLod',
];

/**
 * Library functions from maplibre-animated-shaders
 */
const libraryFunctions = {
  noise: ['snoise', 'fbm', 'random', 'voronoi'],
  easing: [
    'linear',
    'easeInQuad',
    'easeOutQuad',
    'easeInOutQuad',
    'easeInCubic',
    'easeOutCubic',
    'easeInOutCubic',
    'easeInElastic',
    'easeOutElastic',
    'easeInOutElastic',
    'easeInBounce',
    'easeOutBounce',
    'easeInOutBounce',
  ],
  shapes: [
    'sdCircle',
    'sdBox',
    'sdRing',
    'sdTriangle',
    'sdPolygon',
    'sdStar',
    'sdHexagon',
    'fillAA',
    'strokeAA',
  ],
  colors: ['rgb2hsl', 'hsl2rgb', 'rgb2hsv', 'hsv2rgb', 'hueShift', 'palette'],
};

/**
 * Varyings by geometry type
 */
export const varyingsByGeometry = {
  point: [
    { name: 'v_pos', type: 'vec2', description: 'Position in quad (-1 to 1)' },
    { name: 'v_index', type: 'float', description: 'Feature index' },
    { name: 'v_timeOffset', type: 'float', description: 'Time offset for animation' },
    { name: 'v_effectiveTime', type: 'float', description: 'Effective animation time' },
    { name: 'v_color', type: 'vec4', description: 'Data-driven color (RGBA)' },
    { name: 'v_intensity', type: 'float', description: 'Data-driven intensity' },
    {
      name: 'v_useDataDrivenColor',
      type: 'float',
      description: 'Flag for data-driven color (0 or 1)',
    },
    {
      name: 'v_useDataDrivenIntensity',
      type: 'float',
      description: 'Flag for data-driven intensity (0 or 1)',
    },
  ],
  line: [
    { name: 'v_pos', type: 'vec2', description: 'Position in segment' },
    { name: 'v_progress', type: 'float', description: 'Progress along line (0 to 1)' },
    { name: 'v_line_index', type: 'float', description: 'Line index' },
    { name: 'v_width', type: 'float', description: 'Line width in pixels' },
    { name: 'v_timeOffset', type: 'float', description: 'Time offset' },
    { name: 'v_effectiveTime', type: 'float', description: 'Effective animation time' },
    { name: 'v_color', type: 'vec4', description: 'Data-driven color' },
    { name: 'v_intensity', type: 'float', description: 'Data-driven intensity' },
    { name: 'v_useDataDrivenColor', type: 'float', description: 'Flag for data-driven color' },
    {
      name: 'v_useDataDrivenIntensity',
      type: 'float',
      description: 'Flag for data-driven intensity',
    },
  ],
  polygon: [
    { name: 'v_pos', type: 'vec2', description: 'Position in Mercator coordinates' },
    { name: 'v_uv', type: 'vec2', description: 'UV coordinates (0 to 1)' },
    { name: 'v_centroid', type: 'vec2', description: 'Polygon centroid' },
    { name: 'v_polygon_index', type: 'float', description: 'Polygon index' },
    { name: 'v_screen_pos', type: 'vec2', description: 'Screen position in pixels' },
    { name: 'v_timeOffset', type: 'float', description: 'Time offset' },
    { name: 'v_effectiveTime', type: 'float', description: 'Effective animation time' },
    { name: 'v_color', type: 'vec4', description: 'Data-driven color' },
    { name: 'v_intensity', type: 'float', description: 'Data-driven intensity' },
    { name: 'v_useDataDrivenColor', type: 'float', description: 'Flag for data-driven color' },
    {
      name: 'v_useDataDrivenIntensity',
      type: 'float',
      description: 'Flag for data-driven intensity',
    },
  ],
  global: [{ name: 'v_uv', type: 'vec2', description: 'Viewport UV coordinates (0 to 1)' }],
};

/**
 * Register GLSL language with Monaco
 */
export function registerGLSLLanguage(monaco: typeof Monaco): void {
  // Register language
  monaco.languages.register({ id: 'glsl' });

  // Set language configuration
  monaco.languages.setLanguageConfiguration('glsl', {
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/'],
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  });

  // Set tokenizer
  monaco.languages.setMonarchTokensProvider('glsl', {
    keywords,
    types,
    builtinFunctions,

    // Define symbols pattern
    symbols: /[=><!~?:&|+\-*\/\^%]+/,

    tokenizer: {
      root: [
        // Preprocessor directives
        [/#include\s*[<"].*[>"]/, 'keyword.preprocessor'],
        [/#\w+/, 'keyword.preprocessor'],

        // Comments
        [/\/\/.*$/, 'comment'],
        [/\/\*/, 'comment', '@comment'],

        // Strings
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@string'],

        // Numbers
        [/\d*\.\d+([eE][\-+]?\d+)?[fF]?/, 'number.float'],
        [/0[xX][0-9a-fA-F]+/, 'number.hex'],
        [/\d+/, 'number'],

        // Keywords
        [
          /[a-zA-Z_]\w*/,
          {
            cases: {
              '@keywords': 'keyword',
              '@types': 'type',
              '@builtinFunctions': 'function',
              '@default': 'identifier',
            },
          },
        ],

        // Brackets
        [/[{}()\[\]]/, '@brackets'],
        [/[<>]/, '@brackets'],

        // Delimiters
        [/[;,.]/, 'delimiter'],

        // Operators
        [/@symbols/, 'operator'],
      ],

      comment: [
        [/[^\/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[\/*]/, 'comment'],
      ],

      string: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, 'string', '@pop'],
      ],
    },
  });
}

/**
 * Get all library functions as flat array
 */
export function getAllLibraryFunctions(): string[] {
  return Object.values(libraryFunctions).flat();
}

/**
 * Get library functions for specific libraries
 */
export function getLibraryFunctions(libraries: string[]): string[] {
  return libraries.flatMap(
    (lib) => libraryFunctions[lib as keyof typeof libraryFunctions] || []
  );
}

/**
 * Get available GLSL libraries
 */
export function getAvailableLibraries(): string[] {
  return Object.keys(libraryFunctions);
}

export { keywords, types, builtinFunctions, libraryFunctions };
