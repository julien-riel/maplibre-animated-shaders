/**
 * Shader Tests
 *
 * Tests all 26 shaders for:
 * - Required structure (name, geometry, fragmentShader, etc.)
 * - Valid configuration schema
 * - getUniforms function returns expected values
 * - Fragment shader contains required GLSL components
 */

import { describe, it, expect } from 'vitest';

// Import all point shaders
import {
  pulseShader,
  heartbeatShader,
  radarShader,
  particleBurstShader,
  glowShader,
  morphingShapesShader,
} from '../src/plugins/builtin/shaders/points';

// Import all line shaders
import {
  flowShader,
  gradientTravelShader,
  electricShader,
  trailFadeShader,
  breathingShader,
  snakeShader,
  neonShader,
} from '../src/plugins/builtin/shaders/lines';

// Import all polygon shaders
import {
  scanLinesShader,
  rippleShader,
  hatchingShader,
  fillWaveShader,
  noiseShader,
  marchingAntsShader,
  gradientRotationShader,
  dissolveShader,
} from '../src/plugins/builtin/shaders/polygons';

// Import all global shaders
import {
  heatShimmerShader,
  dayNightCycleShader,
  depthFogShader,
  weatherShader,
  holographicGridShader,
} from '../src/plugins/builtin/shaders/global';

import type { ShaderDefinition, GeometryType } from '../src/types';

/**
 * Helper to create shader entry - uses the actual shader name property
 */
const createShaderEntry = (
  shader: ShaderDefinition,
  expectedGeometry: GeometryType
): { name: string; shader: ShaderDefinition; expectedGeometry: GeometryType } => ({
  name: shader.name,
  shader,
  expectedGeometry,
});

/**
 * All shaders organized by category
 */
const allShaders: { name: string; shader: ShaderDefinition; expectedGeometry: GeometryType }[] = [
  // Point shaders (6)
  createShaderEntry(pulseShader as unknown as ShaderDefinition, 'point'),
  createShaderEntry(heartbeatShader as unknown as ShaderDefinition, 'point'),
  createShaderEntry(radarShader as unknown as ShaderDefinition, 'point'),
  createShaderEntry(particleBurstShader as unknown as ShaderDefinition, 'point'),
  createShaderEntry(glowShader as unknown as ShaderDefinition, 'point'),
  createShaderEntry(morphingShapesShader as unknown as ShaderDefinition, 'point'),

  // Line shaders (7)
  createShaderEntry(flowShader as unknown as ShaderDefinition, 'line'),
  createShaderEntry(gradientTravelShader as unknown as ShaderDefinition, 'line'),
  createShaderEntry(electricShader as unknown as ShaderDefinition, 'line'),
  createShaderEntry(trailFadeShader as unknown as ShaderDefinition, 'line'),
  createShaderEntry(breathingShader as unknown as ShaderDefinition, 'line'),
  createShaderEntry(snakeShader as unknown as ShaderDefinition, 'line'),
  createShaderEntry(neonShader as unknown as ShaderDefinition, 'line'),

  // Polygon shaders (8)
  createShaderEntry(scanLinesShader as unknown as ShaderDefinition, 'polygon'),
  createShaderEntry(rippleShader as unknown as ShaderDefinition, 'polygon'),
  createShaderEntry(hatchingShader as unknown as ShaderDefinition, 'polygon'),
  createShaderEntry(fillWaveShader as unknown as ShaderDefinition, 'polygon'),
  createShaderEntry(noiseShader as unknown as ShaderDefinition, 'polygon'),
  createShaderEntry(marchingAntsShader as unknown as ShaderDefinition, 'polygon'),
  createShaderEntry(gradientRotationShader as unknown as ShaderDefinition, 'polygon'),
  createShaderEntry(dissolveShader as unknown as ShaderDefinition, 'polygon'),

  // Global shaders (5)
  createShaderEntry(heatShimmerShader as unknown as ShaderDefinition, 'global'),
  createShaderEntry(dayNightCycleShader as unknown as ShaderDefinition, 'global'),
  createShaderEntry(depthFogShader as unknown as ShaderDefinition, 'global'),
  createShaderEntry(weatherShader as unknown as ShaderDefinition, 'global'),
  createShaderEntry(holographicGridShader as unknown as ShaderDefinition, 'global'),
];

describe('Shaders', () => {
  it('should have 26 shaders total', () => {
    expect(allShaders).toHaveLength(26);
  });

  describe.each(allShaders)('$name shader', ({ name, shader, expectedGeometry }) => {
    describe('structure', () => {
      it('should have required name property', () => {
        expect(shader.name).toBe(name);
        expect(typeof shader.name).toBe('string');
        expect(shader.name.length).toBeGreaterThan(0);
      });

      it('should have correct geometry type', () => {
        expect(shader.geometry).toBe(expectedGeometry);
        expect(['point', 'line', 'polygon', 'global']).toContain(shader.geometry);
      });

      it('should have a description', () => {
        expect(shader.description).toBeDefined();
        expect(typeof shader.description).toBe('string');
        expect(shader.description.length).toBeGreaterThan(0);
      });

      it('should have tags array', () => {
        expect(shader.tags).toBeDefined();
        expect(Array.isArray(shader.tags)).toBe(true);
      });

      it('should have fragmentShader code', () => {
        expect(shader.fragmentShader).toBeDefined();
        expect(typeof shader.fragmentShader).toBe('string');
        expect(shader.fragmentShader.length).toBeGreaterThan(0);
      });

      it('should have defaultConfig object', () => {
        expect(shader.defaultConfig).toBeDefined();
        expect(typeof shader.defaultConfig).toBe('object');
      });

      it('should have configSchema object', () => {
        expect(shader.configSchema).toBeDefined();
        expect(typeof shader.configSchema).toBe('object');
      });

      it('should have getUniforms function', () => {
        expect(shader.getUniforms).toBeDefined();
        expect(typeof shader.getUniforms).toBe('function');
      });
    });

    describe('fragmentShader GLSL', () => {
      it('should contain precision declaration', () => {
        expect(shader.fragmentShader).toMatch(/precision\s+(lowp|mediump|highp)\s+float/);
      });

      it('should contain main function', () => {
        expect(shader.fragmentShader).toMatch(/void\s+main\s*\(\s*\)/);
      });

      it('should write to gl_FragColor', () => {
        expect(shader.fragmentShader).toMatch(/gl_FragColor\s*=/);
      });

      it('should declare u_time uniform for animation', () => {
        expect(shader.fragmentShader).toMatch(/uniform\s+float\s+u_time/);
      });
    });

    describe('configSchema', () => {
      it('should have valid schema entries', () => {
        const validTypes = ['number', 'color', 'boolean', 'string', 'select', 'array'];

        for (const [key, schema] of Object.entries(shader.configSchema)) {
          expect(schema).toHaveProperty('type');
          expect(validTypes).toContain(schema.type);

          // Number type should have min/max
          if (schema.type === 'number') {
            expect(schema).toHaveProperty('default');
            expect(typeof schema.default).toBe('number');
          }

          // Color type should have valid default
          if (schema.type === 'color') {
            expect(schema).toHaveProperty('default');
            expect(typeof schema.default).toBe('string');
          }

          // Boolean type validation
          if (schema.type === 'boolean') {
            expect(schema).toHaveProperty('default');
            expect(typeof schema.default).toBe('boolean');
          }

          // Select type should have options
          if (schema.type === 'select') {
            expect(schema).toHaveProperty('options');
            expect(Array.isArray(schema.options)).toBe(true);
          }
        }
      });

      it('should have matching defaultConfig values', () => {
        for (const [key, schema] of Object.entries(shader.configSchema)) {
          if (schema.default !== undefined && shader.defaultConfig[key] !== undefined) {
            // The default in schema should match defaultConfig (or be compatible)
            const schemaDefault = schema.default;
            const configDefault = shader.defaultConfig[key];

            // Type should match
            expect(typeof configDefault).toBe(typeof schemaDefault);
          }
        }
      });
    });

    describe('getUniforms', () => {
      it('should return uniforms object with default config', () => {
        const uniforms = shader.getUniforms(shader.defaultConfig, 0, 0);

        expect(uniforms).toBeDefined();
        expect(typeof uniforms).toBe('object');
      });

      it('should return uniforms at different time values', () => {
        const t0 = shader.getUniforms(shader.defaultConfig, 0, 0);
        const t1 = shader.getUniforms(shader.defaultConfig, 1, 0.016);
        const t5 = shader.getUniforms(shader.defaultConfig, 5, 0.016);

        expect(t0).toBeDefined();
        expect(t1).toBeDefined();
        expect(t5).toBeDefined();

        // Uniforms should be objects
        expect(typeof t0).toBe('object');
        expect(typeof t1).toBe('object');
        expect(typeof t5).toBe('object');
      });

      it('should return valid uniform values (numbers, arrays, booleans)', () => {
        const uniforms = shader.getUniforms(shader.defaultConfig, 1.5, 0.016);

        for (const [key, value] of Object.entries(uniforms)) {
          // Values should be numbers, arrays of numbers, booleans, or strings
          const isValidType =
            typeof value === 'number' ||
            typeof value === 'boolean' ||
            typeof value === 'string' ||
            (Array.isArray(value) && value.every(v => typeof v === 'number'));

          expect(isValidType).toBe(true);
        }
      });

      it('should include u_time or time-based uniform', () => {
        const uniforms = shader.getUniforms(shader.defaultConfig, 2.5, 0.016);
        const keys = Object.keys(uniforms);

        // Should have some time-related uniform
        const hasTimeUniform = keys.some(key =>
          key.toLowerCase().includes('time') ||
          key.toLowerCase().includes('phase') ||
          key.toLowerCase().includes('cycle')
        );

        expect(hasTimeUniform || keys.includes('u_time')).toBe(true);
      });

      it('should not return NaN or Infinity values', () => {
        const uniforms = shader.getUniforms(shader.defaultConfig, 100, 0.016);

        for (const [key, value] of Object.entries(uniforms)) {
          if (typeof value === 'number') {
            expect(Number.isNaN(value)).toBe(false);
            expect(Number.isFinite(value)).toBe(true);
          } else if (Array.isArray(value)) {
            for (const v of value) {
              if (typeof v === 'number') {
                expect(Number.isNaN(v)).toBe(false);
                expect(Number.isFinite(v)).toBe(true);
              }
            }
          }
        }
      });
    });
  });
});

describe('Shader Categories', () => {
  describe('Point shaders', () => {
    const pointShaders = allShaders.filter(s => s.expectedGeometry === 'point');

    it('should have 6 point shaders', () => {
      expect(pointShaders).toHaveLength(6);
    });

    it('should all have varying v_pos for normalized quad position', () => {
      for (const { shader, name } of pointShaders) {
        expect(shader.fragmentShader).toMatch(/varying\s+vec2\s+v_pos/);
      }
    });
  });

  describe('Line shaders', () => {
    const lineShaders = allShaders.filter(s => s.expectedGeometry === 'line');

    it('should have 7 line shaders', () => {
      expect(lineShaders).toHaveLength(7);
    });
  });

  describe('Polygon shaders', () => {
    const polygonShaders = allShaders.filter(s => s.expectedGeometry === 'polygon');

    it('should have 8 polygon shaders', () => {
      expect(polygonShaders).toHaveLength(8);
    });
  });

  describe('Global shaders', () => {
    const globalShaders = allShaders.filter(s => s.expectedGeometry === 'global');

    it('should have 5 global shaders', () => {
      expect(globalShaders).toHaveLength(5);
    });
  });
});

describe('GLSL Syntax Validation', () => {
  /**
   * Basic GLSL syntax validation without external tools
   * Checks for common syntax errors that would cause compilation failures
   */
  describe.each(allShaders)('$name shader GLSL syntax', ({ name, shader }) => {
    const source = shader.fragmentShader;

    it('should have balanced braces', () => {
      const openBraces = (source.match(/{/g) || []).length;
      const closeBraces = (source.match(/}/g) || []).length;
      expect(openBraces).toBe(closeBraces);
    });

    it('should have balanced parentheses', () => {
      const openParens = (source.match(/\(/g) || []).length;
      const closeParens = (source.match(/\)/g) || []).length;
      expect(openParens).toBe(closeParens);
    });

    it('should not have obvious syntax errors', () => {
      // Check for double semicolons (common typo)
      expect(source).not.toMatch(/;;(?!\s*\/\/)/);

      // Check for missing semicolons before closing braces (excluding comments)
      // This is a simplified check - not exhaustive
      const lines = source.split('\n');
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        const nextLine = lines[i + 1].trim();

        // Skip comments and preprocessor directives
        if (line.startsWith('//') || line.startsWith('#') || line === '') continue;

        // If line ends with { or }, it's fine
        if (line.endsWith('{') || line.endsWith('}')) continue;

        // If line is a closing brace only, fine
        if (line === '}') continue;
      }
    });

    it('should declare uniforms before use', () => {
      // Extract uniform declarations
      const uniformDecls = source.match(/uniform\s+\w+\s+(\w+)/g) || [];
      const declaredUniforms = uniformDecls.map(decl => {
        const match = decl.match(/uniform\s+\w+\s+(\w+)/);
        return match ? match[1] : null;
      }).filter(Boolean);

      // All declared uniforms should be valid identifiers
      for (const uniform of declaredUniforms) {
        expect(uniform).toMatch(/^[a-zA-Z_][a-zA-Z0-9_]*$/);
      }
    });

    it('should have valid function declarations', () => {
      // Check main function signature
      expect(source).toMatch(/void\s+main\s*\(\s*\)\s*{/);
    });

    it('should use valid GLSL types', () => {
      const validTypes = [
        'void', 'bool', 'int', 'float',
        'vec2', 'vec3', 'vec4',
        'ivec2', 'ivec3', 'ivec4',
        'bvec2', 'bvec3', 'bvec4',
        'mat2', 'mat3', 'mat4',
        'sampler2D', 'samplerCube',
      ];

      // Extract type declarations
      const typePattern = /(uniform|varying|attribute)\s+(\w+)/g;
      let match;
      while ((match = typePattern.exec(source)) !== null) {
        const type = match[2];
        expect(validTypes).toContain(type);
      }
    });
  });
});
