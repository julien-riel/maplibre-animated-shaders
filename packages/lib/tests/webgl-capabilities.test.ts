/**
 * Tests for WebGL capabilities detection
 *
 * Note: detectWebGLCapabilities and checkMinimumRequirements require a DOM
 * environment with canvas support. These tests focus on logCapabilities.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  logCapabilities,
  type BrowserWebGLCapabilities,
} from '../src/utils/webgl-capabilities';

describe('webgl-capabilities', () => {
  describe('logCapabilities', () => {
    it('should log capabilities to console', () => {
      const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

      const capabilities: BrowserWebGLCapabilities = {
        supported: true,
        version: 2,
        maxTextureSize: 4096,
        maxVertexUniforms: 256,
        maxFragmentUniforms: 256,
        highPrecisionSupported: true,
        extensions: {
          floatTextures: true,
          instancedArrays: true,
          vertexArrayObjects: true,
        },
      };

      logCapabilities(capabilities);

      expect(consoleSpy).toHaveBeenCalledWith('[WebGL Capabilities]');
      expect(logSpy).toHaveBeenCalledWith('Supported:', true);
      expect(logSpy).toHaveBeenCalledWith('Version:', 'WebGL 2');
      expect(logSpy).toHaveBeenCalledWith('Max Texture Size:', 4096);
      expect(logSpy).toHaveBeenCalledWith('Max Vertex Uniforms:', 256);
      expect(logSpy).toHaveBeenCalledWith('Max Fragment Uniforms:', 256);
      expect(logSpy).toHaveBeenCalledWith('High Precision Floats:', true);
      expect(logSpy).toHaveBeenCalledWith('Extensions:', capabilities.extensions);
      expect(groupEndSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      logSpy.mockRestore();
      groupEndSpy.mockRestore();
    });

    it('should log N/A for null version', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(console, 'group').mockImplementation(() => {});
      vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

      const capabilities: BrowserWebGLCapabilities = {
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

      logCapabilities(capabilities);

      expect(logSpy).toHaveBeenCalledWith('Version:', 'N/A');

      vi.restoreAllMocks();
    });

    it('should log WebGL 1 version correctly', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(console, 'group').mockImplementation(() => {});
      vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

      const capabilities: BrowserWebGLCapabilities = {
        supported: true,
        version: 1,
        maxTextureSize: 2048,
        maxVertexUniforms: 128,
        maxFragmentUniforms: 64,
        highPrecisionSupported: false,
        extensions: {
          floatTextures: false,
          instancedArrays: false,
          vertexArrayObjects: false,
        },
      };

      logCapabilities(capabilities);

      expect(logSpy).toHaveBeenCalledWith('Version:', 'WebGL 1');

      vi.restoreAllMocks();
    });
  });
});
