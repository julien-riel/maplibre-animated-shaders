/**
 * Tests for GLSL loader utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerGLSLInclude,
  processGLSL,
  createShaderProgram,
  getDefaultVertexShader,
  getPrecisionHeader,
} from '../src/utils/glsl-loader';

describe('glsl-loader', () => {
  describe('registerGLSLInclude', () => {
    it('should register a GLSL include for later use', () => {
      registerGLSLInclude('noise', 'float noise(vec2 p) { return 0.5; }');

      const result = processGLSL('#include "noise"');
      expect(result).toBe('float noise(vec2 p) { return 0.5; }');
    });

    it('should overwrite existing include with same name', () => {
      registerGLSLInclude('test', 'old code');
      registerGLSLInclude('test', 'new code');

      const result = processGLSL('#include "test"');
      expect(result).toBe('new code');
    });
  });

  describe('processGLSL', () => {
    beforeEach(() => {
      // Register some test includes
      registerGLSLInclude('common', '// common code');
      registerGLSLInclude('utils', '// utils code');
    });

    it('should return source unchanged if no includes', () => {
      const source = 'void main() { gl_FragColor = vec4(1.0); }';
      expect(processGLSL(source)).toBe(source);
    });

    it('should resolve single include', () => {
      const source = `
#include "common"
void main() { }
`;
      const result = processGLSL(source);
      expect(result).toContain('// common code');
      expect(result).toContain('void main()');
    });

    it('should resolve multiple includes', () => {
      const source = `
#include "common"
#include "utils"
void main() { }
`;
      const result = processGLSL(source);
      expect(result).toContain('// common code');
      expect(result).toContain('// utils code');
    });

    it('should handle missing include with warning comment', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const source = '#include "nonexistent"';
      const result = processGLSL(source);

      expect(result).toBe('// Include "nonexistent" not found');
      expect(consoleSpy).toHaveBeenCalledWith('[GLSL] Include "nonexistent" not found');

      consoleSpy.mockRestore();
    });

    it('should preserve code around includes', () => {
      const source = `
precision highp float;
#include "common"
uniform float u_time;
`;
      const result = processGLSL(source);
      expect(result).toContain('precision highp float;');
      expect(result).toContain('// common code');
      expect(result).toContain('uniform float u_time;');
    });
  });

  describe('createShaderProgram', () => {
    beforeEach(() => {
      registerGLSLInclude('testInclude', '// included');
    });

    it('should create shader program with fragment shader only', () => {
      const fragmentShader = 'void main() { gl_FragColor = vec4(1.0); }';
      const result = createShaderProgram(fragmentShader);

      expect(result.fragment).toContain('uniform float u_time;');
      expect(result.fragment).toContain('uniform float u_delta_time;');
      expect(result.fragment).toContain('uniform vec2 u_resolution;');
      expect(result.fragment).toContain('void main()');
      expect(result.vertex).toContain('attribute vec2 a_position');
      expect(result.vertex).toContain('gl_Position');
    });

    it('should use custom vertex shader when provided', () => {
      const fragmentShader = 'void main() { }';
      const vertexShader = 'attribute vec3 a_custom; void main() { }';
      const result = createShaderProgram(fragmentShader, vertexShader);

      expect(result.vertex).toBe(vertexShader);
      expect(result.vertex).toContain('a_custom');
    });

    it('should process includes in fragment shader', () => {
      const fragmentShader = '#include "testInclude"\nvoid main() { }';
      const result = createShaderProgram(fragmentShader);

      expect(result.fragment).toContain('// included');
    });

    it('should process includes in vertex shader', () => {
      const fragmentShader = 'void main() { }';
      const vertexShader = '#include "testInclude"\nvoid main() { }';
      const result = createShaderProgram(fragmentShader, vertexShader);

      expect(result.vertex).toContain('// included');
    });
  });

  describe('getDefaultVertexShader', () => {
    it('should return a valid vertex shader', () => {
      const shader = getDefaultVertexShader();

      expect(shader).toContain('attribute vec2 a_position');
      expect(shader).toContain('varying vec2 v_position');
      expect(shader).toContain('void main()');
      expect(shader).toContain('gl_Position');
    });

    it('should pass position to varying', () => {
      const shader = getDefaultVertexShader();
      expect(shader).toContain('v_position = a_position');
    });
  });

  describe('getPrecisionHeader', () => {
    it('should return precision header for ES shaders', () => {
      const header = getPrecisionHeader();

      expect(header).toContain('#ifdef GL_ES');
      expect(header).toContain('precision highp float');
      expect(header).toContain('#endif');
    });
  });
});
