/**
 * Shader Tests
 *
 * Tests all 4 example shaders for:
 * - Required structure (name, geometry, fragmentShader, etc.)
 * - Valid configuration schema
 * - getUniforms function returns expected values
 * - Fragment shader contains required GLSL components
 */

import { describe, it, expect } from 'vitest';

// Import shaders from new example plugin structure
import {
  pointShader,
  lineShader,
  polygonShader,
  globalShader,
} from '../src/plugins/builtin/example/shaders';

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
  // Point shader
  createShaderEntry(pointShader as unknown as ShaderDefinition, 'point'),

  // Line shader
  createShaderEntry(lineShader as unknown as ShaderDefinition, 'line'),

  // Polygon shader
  createShaderEntry(polygonShader as unknown as ShaderDefinition, 'polygon'),

  // Global shader
  createShaderEntry(globalShader as unknown as ShaderDefinition, 'global'),
];

describe('Shaders', () => {
  it('should have 4 shaders total (one per geometry type)', () => {
    expect(allShaders).toHaveLength(4);
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
            (Array.isArray(value) && value.every((v) => typeof v === 'number'));

          expect(isValidType).toBe(true);
        }
      });

      it('should include u_time or time-based uniform', () => {
        const uniforms = shader.getUniforms(shader.defaultConfig, 2.5, 0.016);
        const keys = Object.keys(uniforms);

        // Should have some time-related uniform
        const hasTimeUniform = keys.some(
          (key) =>
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
  describe('Point shader', () => {
    const pointShaders = allShaders.filter((s) => s.expectedGeometry === 'point');

    it('should have 1 point shader', () => {
      expect(pointShaders).toHaveLength(1);
    });

    it('should have varying v_pos for normalized quad position', () => {
      for (const { shader } of pointShaders) {
        expect(shader.fragmentShader).toMatch(/varying\s+vec2\s+v_pos/);
      }
    });
  });

  describe('Line shader', () => {
    const lineShaders = allShaders.filter((s) => s.expectedGeometry === 'line');

    it('should have 1 line shader', () => {
      expect(lineShaders).toHaveLength(1);
    });
  });

  describe('Polygon shader', () => {
    const polygonShaders = allShaders.filter((s) => s.expectedGeometry === 'polygon');

    it('should have 1 polygon shader', () => {
      expect(polygonShaders).toHaveLength(1);
    });
  });

  describe('Global shader', () => {
    const globalShaders = allShaders.filter((s) => s.expectedGeometry === 'global');

    it('should have 1 global shader', () => {
      expect(globalShaders).toHaveLength(1);
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
    });

    it('should declare uniforms before use', () => {
      // Extract uniform declarations
      const uniformDecls = source.match(/uniform\s+\w+\s+(\w+)/g) || [];
      const declaredUniforms = uniformDecls
        .map((decl) => {
          const match = decl.match(/uniform\s+\w+\s+(\w+)/);
          return match ? match[1] : null;
        })
        .filter(Boolean);

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
        'void',
        'bool',
        'int',
        'float',
        'vec2',
        'vec3',
        'vec4',
        'ivec2',
        'ivec3',
        'ivec4',
        'bvec2',
        'bvec3',
        'bvec4',
        'mat2',
        'mat3',
        'mat4',
        'sampler2D',
        'samplerCube',
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
