/**
 * Tests for GLSL preprocessor module
 */

import { describe, it, expect } from 'vitest';
import {
  preprocessGLSL,
  processGLSL,
  getAvailableLibraries,
  isLibraryAvailable,
  getLibrarySource,
} from '../src/glsl/preprocessor';

describe('glsl-preprocessor', () => {
  describe('preprocessGLSL', () => {
    it('should return unchanged source when no includes are present', () => {
      const source = `
precision highp float;
void main() {
  gl_FragColor = vec4(1.0);
}
`;
      const result = preprocessGLSL(source);
      expect(result.source).toBe(source);
      expect(result.includedLibraries).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('should resolve #include <noise> directive', () => {
      const source = `
precision highp float;
#include <noise>
void main() {
  float n = snoise(vec2(1.0));
}
`;
      const result = preprocessGLSL(source);
      expect(result.source).toContain('// --- Begin #include <noise> ---');
      expect(result.source).toContain('// --- End #include <noise> ---');
      expect(result.source).toContain('float snoise(vec2 v)');
      expect(result.includedLibraries).toEqual(['noise']);
      expect(result.warnings).toEqual([]);
    });

    it('should resolve #include "noise" directive (quoted syntax)', () => {
      const source = '#include "noise"\nvoid main() {}';
      const result = preprocessGLSL(source);
      expect(result.source).toContain('float snoise(vec2 v)');
      expect(result.includedLibraries).toEqual(['noise']);
    });

    it('should resolve multiple includes', () => {
      const source = `
#include <noise>
#include <shapes>
void main() {
  float n = snoise(vec2(1.0));
  float d = sdCircle(vec2(0.0), 1.0);
}
`;
      const result = preprocessGLSL(source);
      expect(result.source).toContain('float snoise(vec2 v)');
      expect(result.source).toContain('float sdCircle(vec2 p, float r)');
      expect(result.includedLibraries).toEqual(['noise', 'shapes']);
    });

    it('should resolve all available libraries', () => {
      const source = `
#include <noise>
#include <easing>
#include <shapes>
#include <colors>
`;
      const result = preprocessGLSL(source);
      expect(result.includedLibraries).toEqual(['noise', 'easing', 'shapes', 'colors']);
      expect(result.source).toContain('float snoise(vec2 v)');
      expect(result.source).toContain('float easeInQuad(float t)');
      expect(result.source).toContain('float sdCircle(vec2 p, float r)');
      expect(result.source).toContain('vec3 rgb2hsl(vec3 c)');
    });

    it('should resolve #include <all> to include all libraries', () => {
      const source = '#include <all>\nvoid main() {}';
      const result = preprocessGLSL(source);
      expect(result.includedLibraries).toEqual(['all']);
      // Should contain functions from all libraries
      expect(result.source).toContain('float snoise(vec2 v)');
      expect(result.source).toContain('float easeInQuad(float t)');
      expect(result.source).toContain('float sdCircle(vec2 p, float r)');
      expect(result.source).toContain('vec3 rgb2hsl(vec3 c)');
    });

    it('should prevent duplicate includes', () => {
      const source = `
#include <noise>
#include <noise>
void main() {}
`;
      const result = preprocessGLSL(source);
      // Second include should be commented out
      expect(result.source).toContain('// #include <noise> (already included)');
      expect(result.includedLibraries).toEqual(['noise']);
      // Count occurrences of snoise function - should only appear once
      const snoiseMatches = result.source.match(/float snoise\(vec2 v\)/g);
      expect(snoiseMatches?.length).toBe(1);
    });

    it('should warn about unknown libraries', () => {
      const source = '#include <unknown>\nvoid main() {}';
      const result = preprocessGLSL(source);
      expect(result.warnings.length).toBe(1);
      expect(result.warnings[0]).toContain("Unknown GLSL library: 'unknown'");
      expect(result.warnings[0]).toContain('Available libraries:');
      expect(result.source).toContain('// Unknown library: unknown');
    });

    it('should not warn when warnUnknown is false', () => {
      const source = '#include <unknown>\nvoid main() {}';
      const result = preprocessGLSL(source, { warnUnknown: false });
      expect(result.warnings).toEqual([]);
      expect(result.source).toContain('// Unknown library: unknown');
    });

    it('should optionally remove comment markers', () => {
      const source = '#include <noise>\nvoid main() {}';
      const result = preprocessGLSL(source, { addComments: false });
      expect(result.source).not.toContain('// --- Begin');
      expect(result.source).not.toContain('// --- End');
      expect(result.source).toContain('float snoise(vec2 v)');
    });

    it('should support custom libraries', () => {
      const source = '#include <mylib>\nvoid main() {}';
      const customLib = 'float myFunction() { return 42.0; }';
      const result = preprocessGLSL(source, {
        customLibraries: { mylib: customLib },
      });
      expect(result.source).toContain('float myFunction() { return 42.0; }');
      expect(result.includedLibraries).toEqual(['mylib']);
      expect(result.warnings).toEqual([]);
    });

    it('should allow custom libraries to override built-ins', () => {
      const source = '#include <noise>\nvoid main() {}';
      const customNoise = 'float customNoise() { return 0.5; }';
      const result = preprocessGLSL(source, {
        customLibraries: { noise: customNoise },
      });
      expect(result.source).toContain('float customNoise() { return 0.5; }');
      expect(result.source).not.toContain('float snoise(vec2 v)');
    });

    it('should preserve surrounding code', () => {
      const source = `
precision highp float;
uniform float u_time;
#include <noise>
varying vec2 v_pos;
void main() {}
`;
      const result = preprocessGLSL(source);
      expect(result.source).toContain('precision highp float;');
      expect(result.source).toContain('uniform float u_time;');
      expect(result.source).toContain('varying vec2 v_pos;');
      expect(result.source).toContain('void main() {}');
    });

    it('should handle whitespace variations in include directives', () => {
      const sources = [
        '#include<noise>',
        '#include <noise>',
        '#include  <noise>',
        '#include\t<noise>',
      ];

      for (const source of sources) {
        const result = preprocessGLSL(source);
        expect(result.includedLibraries).toEqual(['noise']);
      }
    });
  });

  describe('processGLSL', () => {
    it('should return preprocessed source string', () => {
      const source = '#include <noise>\nvoid main() {}';
      const result = processGLSL(source);
      expect(typeof result).toBe('string');
      expect(result).toContain('float snoise(vec2 v)');
    });

    it('should be equivalent to preprocessGLSL().source', () => {
      const source = '#include <shapes>\nvoid main() {}';
      const processResult = processGLSL(source);
      const preprocessResult = preprocessGLSL(source);
      expect(processResult).toBe(preprocessResult.source);
    });
  });

  describe('getAvailableLibraries', () => {
    it('should return all available library names', () => {
      const libraries = getAvailableLibraries();
      expect(libraries).toContain('noise');
      expect(libraries).toContain('easing');
      expect(libraries).toContain('shapes');
      expect(libraries).toContain('colors');
      expect(libraries).toContain('all');
      expect(libraries.length).toBe(5);
    });
  });

  describe('isLibraryAvailable', () => {
    it('should return true for existing libraries', () => {
      expect(isLibraryAvailable('noise')).toBe(true);
      expect(isLibraryAvailable('easing')).toBe(true);
      expect(isLibraryAvailable('shapes')).toBe(true);
      expect(isLibraryAvailable('colors')).toBe(true);
      expect(isLibraryAvailable('all')).toBe(true);
    });

    it('should return false for non-existing libraries', () => {
      expect(isLibraryAvailable('unknown')).toBe(false);
      expect(isLibraryAvailable('')).toBe(false);
      expect(isLibraryAvailable('NOISE')).toBe(false); // case-sensitive
    });
  });

  describe('getLibrarySource', () => {
    it('should return source for existing libraries', () => {
      const noiseSource = getLibrarySource('noise');
      expect(noiseSource).toBeDefined();
      expect(noiseSource).toContain('float snoise(vec2 v)');

      const easingSource = getLibrarySource('easing');
      expect(easingSource).toBeDefined();
      expect(easingSource).toContain('float easeInQuad(float t)');

      const shapesSource = getLibrarySource('shapes');
      expect(shapesSource).toBeDefined();
      expect(shapesSource).toContain('float sdCircle(vec2 p, float r)');

      const colorsSource = getLibrarySource('colors');
      expect(colorsSource).toBeDefined();
      expect(colorsSource).toContain('vec3 rgb2hsl(vec3 c)');
    });

    it('should return undefined for non-existing libraries', () => {
      // Cast to any to test invalid input
      const result = getLibrarySource('unknown' as any);
      expect(result).toBeUndefined();
    });
  });
});
