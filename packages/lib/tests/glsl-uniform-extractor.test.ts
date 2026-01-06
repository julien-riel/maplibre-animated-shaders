/**
 * Tests for GLSL uniform extractor utilities
 */

import { describe, it, expect } from 'vitest';
import {
  extractUniforms,
  extractUniformNames,
  validateUniforms,
  getUniformSetterInfo,
  createUniformCache,
  type ExtractedUniform,
  type GLSLUniformType,
} from '../src/utils/glsl-uniform-extractor';

describe('glsl-uniform-extractor', () => {
  describe('extractUniforms', () => {
    it('should extract basic float uniform', () => {
      const code = 'uniform float u_time;';
      const uniforms = extractUniforms(code);

      expect(uniforms).toHaveLength(1);
      expect(uniforms[0]).toEqual({
        name: 'u_time',
        type: 'float',
        isArray: false,
        arraySize: undefined,
      });
    });

    it('should extract multiple uniforms', () => {
      const code = `
        uniform float u_time;
        uniform vec4 u_color;
        uniform mat4 u_matrix;
      `;
      const uniforms = extractUniforms(code);

      expect(uniforms).toHaveLength(3);
      expect(uniforms.map((u) => u.name)).toEqual(['u_time', 'u_color', 'u_matrix']);
      expect(uniforms.map((u) => u.type)).toEqual(['float', 'vec4', 'mat4']);
    });

    it('should extract all supported uniform types', () => {
      const types: GLSLUniformType[] = [
        'float',
        'int',
        'bool',
        'vec2',
        'vec3',
        'vec4',
        'mat2',
        'mat3',
        'mat4',
        'sampler2D',
        'samplerCube',
      ];

      for (const type of types) {
        const code = `uniform ${type} u_test;`;
        const uniforms = extractUniforms(code);

        expect(uniforms).toHaveLength(1);
        expect(uniforms[0].type).toBe(type);
      }
    });

    it('should extract array uniforms', () => {
      const code = 'uniform float u_values[10];';
      const uniforms = extractUniforms(code);

      expect(uniforms).toHaveLength(1);
      expect(uniforms[0]).toEqual({
        name: 'u_values',
        type: 'float',
        isArray: true,
        arraySize: 10,
      });
    });

    it('should extract vec4 array uniforms', () => {
      const code = 'uniform vec4 u_colors[4];';
      const uniforms = extractUniforms(code);

      expect(uniforms).toHaveLength(1);
      expect(uniforms[0]).toEqual({
        name: 'u_colors',
        type: 'vec4',
        isArray: true,
        arraySize: 4,
      });
    });

    it('should skip duplicates', () => {
      const code = `
        #ifdef USE_TEXTURE
        uniform sampler2D u_texture;
        #else
        uniform sampler2D u_texture;
        #endif
      `;
      const uniforms = extractUniforms(code);

      expect(uniforms).toHaveLength(1);
      expect(uniforms[0].name).toBe('u_texture');
    });

    it('should ignore single-line comments', () => {
      const code = `
        // uniform float u_commented;
        uniform float u_real;
      `;
      const uniforms = extractUniforms(code);

      expect(uniforms).toHaveLength(1);
      expect(uniforms[0].name).toBe('u_real');
    });

    it('should ignore multi-line comments', () => {
      const code = `
        /* uniform float u_commented; */
        uniform float u_real;
        /*
        uniform vec4 u_alsoCommented;
        */
      `;
      const uniforms = extractUniforms(code);

      expect(uniforms).toHaveLength(1);
      expect(uniforms[0].name).toBe('u_real');
    });

    it('should return empty array for no uniforms', () => {
      const code = `
        attribute vec2 a_position;
        varying vec2 v_uv;
        void main() { }
      `;
      const uniforms = extractUniforms(code);

      expect(uniforms).toEqual([]);
    });
  });

  describe('extractUniformNames', () => {
    it('should return array of uniform names', () => {
      const code = `
        uniform float u_time;
        uniform vec4 u_color;
        uniform mat4 u_matrix;
      `;
      const names = extractUniformNames(code);

      expect(names).toEqual(['u_time', 'u_color', 'u_matrix']);
    });

    it('should return empty array for no uniforms', () => {
      const code = 'void main() { }';
      const names = extractUniformNames(code);

      expect(names).toEqual([]);
    });
  });

  describe('validateUniforms', () => {
    it('should return valid when all required uniforms present', () => {
      const code = `
        uniform float u_time;
        uniform vec4 u_color;
      `;
      const result = validateUniforms(code, ['u_time', 'u_color']);

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should return invalid with missing uniforms', () => {
      const code = 'uniform float u_time;';
      const result = validateUniforms(code, ['u_time', 'u_color', 'u_intensity']);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['u_color', 'u_intensity']);
    });

    it('should return valid for empty required list', () => {
      const code = 'uniform float u_time;';
      const result = validateUniforms(code, []);

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should return invalid for all missing', () => {
      const code = 'void main() { }';
      const result = validateUniforms(code, ['u_time', 'u_color']);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['u_time', 'u_color']);
    });
  });

  describe('getUniformSetterInfo', () => {
    it('should return correct setter for float', () => {
      const info = getUniformSetterInfo('float');
      expect(info).toEqual({ setter: 'uniform1f', componentCount: 1 });
    });

    it('should return correct setter for int', () => {
      const info = getUniformSetterInfo('int');
      expect(info).toEqual({ setter: 'uniform1i', componentCount: 1 });
    });

    it('should return correct setter for bool', () => {
      const info = getUniformSetterInfo('bool');
      expect(info).toEqual({ setter: 'uniform1i', componentCount: 1 });
    });

    it('should return correct setter for sampler2D', () => {
      const info = getUniformSetterInfo('sampler2D');
      expect(info).toEqual({ setter: 'uniform1i', componentCount: 1 });
    });

    it('should return correct setter for samplerCube', () => {
      const info = getUniformSetterInfo('samplerCube');
      expect(info).toEqual({ setter: 'uniform1i', componentCount: 1 });
    });

    it('should return correct setter for vec2', () => {
      const info = getUniformSetterInfo('vec2');
      expect(info).toEqual({ setter: 'uniform2fv', componentCount: 2 });
    });

    it('should return correct setter for vec3', () => {
      const info = getUniformSetterInfo('vec3');
      expect(info).toEqual({ setter: 'uniform3fv', componentCount: 3 });
    });

    it('should return correct setter for vec4', () => {
      const info = getUniformSetterInfo('vec4');
      expect(info).toEqual({ setter: 'uniform4fv', componentCount: 4 });
    });

    it('should return correct setter for mat2', () => {
      const info = getUniformSetterInfo('mat2');
      expect(info).toEqual({ setter: 'uniformMatrix2fv', componentCount: 4 });
    });

    it('should return correct setter for mat3', () => {
      const info = getUniformSetterInfo('mat3');
      expect(info).toEqual({ setter: 'uniformMatrix3fv', componentCount: 9 });
    });

    it('should return correct setter for mat4', () => {
      const info = getUniformSetterInfo('mat4');
      expect(info).toEqual({ setter: 'uniformMatrix4fv', componentCount: 16 });
    });
  });

  describe('createUniformCache', () => {
    it('should create cache with valid uniform locations', () => {
      const mockLocation1 = { id: 1 } as WebGLUniformLocation;
      const mockLocation2 = { id: 2 } as WebGLUniformLocation;

      const mockGl = {
        getUniformLocation: (program: WebGLProgram, name: string) => {
          if (name === 'u_time') return mockLocation1;
          if (name === 'u_color') return mockLocation2;
          return null;
        },
      } as unknown as WebGLRenderingContext;

      const mockProgram = {} as WebGLProgram;

      const uniforms: ExtractedUniform[] = [
        { name: 'u_time', type: 'float', isArray: false },
        { name: 'u_color', type: 'vec4', isArray: false },
      ];

      const cache = createUniformCache(mockGl, mockProgram, uniforms);

      expect(cache.size).toBe(2);
      expect(cache.get('u_time')).toBe(mockLocation1);
      expect(cache.get('u_color')).toBe(mockLocation2);
    });

    it('should skip uniforms with null locations', () => {
      const mockLocation = { id: 1 } as WebGLUniformLocation;

      const mockGl = {
        getUniformLocation: (program: WebGLProgram, name: string) => {
          if (name === 'u_time') return mockLocation;
          return null; // u_unused not found
        },
      } as unknown as WebGLRenderingContext;

      const mockProgram = {} as WebGLProgram;

      const uniforms: ExtractedUniform[] = [
        { name: 'u_time', type: 'float', isArray: false },
        { name: 'u_unused', type: 'float', isArray: false },
      ];

      const cache = createUniformCache(mockGl, mockProgram, uniforms);

      expect(cache.size).toBe(1);
      expect(cache.has('u_time')).toBe(true);
      expect(cache.has('u_unused')).toBe(false);
    });

    it('should return empty cache for empty uniforms', () => {
      const mockGl = {
        getUniformLocation: () => null,
      } as unknown as WebGLRenderingContext;

      const mockProgram = {} as WebGLProgram;

      const cache = createUniformCache(mockGl, mockProgram, []);

      expect(cache.size).toBe(0);
    });
  });
});
