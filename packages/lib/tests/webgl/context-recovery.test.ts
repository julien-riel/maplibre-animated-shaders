/**
 * Tests for WebGL context loss and recovery
 *
 * These tests verify the system's behavior when WebGL context is lost and restored,
 * which can happen due to GPU driver crashes, system sleep, or resource exhaustion.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebGLContext, wrapWebGLContext } from '../../src/webgl';
import { ProgramCache } from '../../src/utils/program-cache';

/**
 * Create a mock WebGL context that can simulate context loss
 */
function createMockContextWithLossSupport() {
  let isLost = false;
  const lostListeners: EventListener[] = [];
  const restoredListeners: EventListener[] = [];

  const mockCanvas = {
    addEventListener: vi.fn((event: string, listener: EventListener) => {
      if (event === 'webglcontextlost') {
        lostListeners.push(listener);
      } else if (event === 'webglcontextrestored') {
        restoredListeners.push(listener);
      }
    }),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };

  const gl = {
    canvas: mockCanvas,
    isContextLost: vi.fn(() => isLost),
    getExtension: vi.fn((name: string) => {
      if (name === 'WEBGL_lose_context') {
        return {
          loseContext: () => {
            isLost = true;
            const event = new Event('webglcontextlost');
            lostListeners.forEach((listener) => listener(event));
          },
          restoreContext: () => {
            isLost = false;
            const event = new Event('webglcontextrestored');
            restoredListeners.forEach((listener) => listener(event));
          },
        };
      }
      if (name === 'ANGLE_instanced_arrays') {
        return {
          drawArraysInstancedANGLE: vi.fn(),
          drawElementsInstancedANGLE: vi.fn(),
          vertexAttribDivisorANGLE: vi.fn(),
        };
      }
      if (name === 'OES_vertex_array_object') {
        return {
          createVertexArrayOES: vi.fn(() => ({ id: 1 })),
          deleteVertexArrayOES: vi.fn(),
          bindVertexArrayOES: vi.fn(),
        };
      }
      return null;
    }),
    getParameter: vi.fn((param: number) => {
      // Return mock values for common parameters
      if (param === 0x1f00) return 'Mock Vendor'; // VENDOR
      if (param === 0x1f01) return 'Mock Renderer'; // RENDERER
      if (param === 0x0d33) return 4096; // MAX_TEXTURE_SIZE
      if (param === 0x8869) return 16; // MAX_VERTEX_ATTRIBS
      if (param === 0x8b4a) return 256; // MAX_VERTEX_UNIFORM_VECTORS
      if (param === 0x8b49) return 256; // MAX_FRAGMENT_UNIFORM_VECTORS
      if (param === 0x8872) return 16; // MAX_TEXTURE_IMAGE_UNITS
      return 'WebGL 1.0';
    }),
    createProgram: vi.fn(() => (isLost ? null : { id: 'program' })),
    createShader: vi.fn(() => (isLost ? null : { id: 'shader' })),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => !isLost),
    getShaderInfoLog: vi.fn(() => ''),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => !isLost),
    getProgramInfoLog: vi.fn(() => ''),
    deleteProgram: vi.fn(),
    deleteShader: vi.fn(),
    useProgram: vi.fn(),
    createBuffer: vi.fn(() => (isLost ? null : { id: 'buffer' })),
    deleteBuffer: vi.fn(),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    blendFunc: vi.fn(),
    clear: vi.fn(),
    clearColor: vi.fn(),
    viewport: vi.fn(),
    drawArrays: vi.fn(),
  } as unknown as WebGLRenderingContext;

  return {
    gl,
    simulateLoss: () => {
      const ext = gl.getExtension('WEBGL_lose_context');
      ext?.loseContext();
    },
    simulateRestore: () => {
      const ext = gl.getExtension('WEBGL_lose_context');
      ext?.restoreContext();
    },
    isLost: () => isLost,
  };
}

describe('WebGL Context Loss and Recovery', () => {
  describe('Context Loss Detection', () => {
    it('should detect when context is lost', () => {
      const { gl, simulateLoss } = createMockContextWithLossSupport();
      const ctx = wrapWebGLContext(gl);

      expect(ctx.isContextLost()).toBe(false);

      simulateLoss();

      expect(ctx.isContextLost()).toBe(true);
    });

    it('should detect when context is restored', () => {
      const { gl, simulateLoss, simulateRestore } = createMockContextWithLossSupport();
      const ctx = wrapWebGLContext(gl);

      simulateLoss();
      expect(ctx.isContextLost()).toBe(true);

      simulateRestore();
      expect(ctx.isContextLost()).toBe(false);
    });
  });

  describe('Resource Creation During Context Loss', () => {
    it('should return null for VAO creation when context is lost', () => {
      const { gl, simulateLoss } = createMockContextWithLossSupport();

      // Add WebGL2-like methods for VAO support
      (gl as any).createVertexArray = vi.fn(() => {
        if (gl.isContextLost()) return null;
        return { id: 'vao' };
      });
      (gl as any).bindVertexArray = vi.fn();
      (gl as any).deleteVertexArray = vi.fn();

      const ctx = new WebGLContext(gl as any);

      // Should work before loss
      const vao1 = ctx.createVertexArray();
      expect(vao1).not.toBeNull();

      simulateLoss();

      // Should return null after loss
      const vao2 = ctx.createVertexArray();
      expect(vao2).toBeNull();
    });

    it('should fail program creation when context is lost', () => {
      const { gl, simulateLoss } = createMockContextWithLossSupport();

      // Should work before loss
      const program1 = gl.createProgram();
      expect(program1).not.toBeNull();

      simulateLoss();

      // Should return null after loss
      const program2 = gl.createProgram();
      expect(program2).toBeNull();
    });
  });

  describe('ProgramCache Context Loss Handling', () => {
    let cache: ProgramCache;
    let mockGl: WebGLRenderingContext;

    const vertexShader = `
      attribute vec4 a_position;
      void main() {
        gl_Position = a_position;
      }
    `;

    const fragmentShader = `
      precision mediump float;
      void main() {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
      }
    `;

    beforeEach(() => {
      const { gl } = createMockContextWithLossSupport();
      mockGl = gl;
      cache = new ProgramCache();
    });

    it('should cache programs successfully', () => {
      const program = cache.getOrCreate(mockGl, vertexShader, fragmentShader);
      expect(program).not.toBeNull();
      expect(cache.size).toBe(1);

      // Getting same program should return cached version
      const program2 = cache.getOrCreate(mockGl, vertexShader, fragmentShader);
      expect(program2).toBe(program);
      expect(cache.size).toBe(1);
    });

    it('should clear cache properly', () => {
      cache.getOrCreate(mockGl, vertexShader, fragmentShader);
      expect(cache.size).toBe(1);

      cache.clear(mockGl);
      expect(cache.size).toBe(0);
    });

    it('should handle release correctly', () => {
      cache.getOrCreate(mockGl, vertexShader, fragmentShader);
      cache.getOrCreate(mockGl, vertexShader, fragmentShader); // Increment ref count

      const stats = cache.getStats();
      expect(stats.programs).toBe(1);
      expect(stats.totalRefs).toBe(2);

      cache.release(vertexShader, fragmentShader, mockGl);
      const statsAfter = cache.getStats();
      expect(statsAfter.totalRefs).toBe(1);
    });
  });

  describe('Graceful Degradation', () => {
    it('should not throw when operations are called on lost context', () => {
      const { gl, simulateLoss } = createMockContextWithLossSupport();

      // Add WebGL2-like methods
      (gl as any).createVertexArray = vi.fn(() => null);
      (gl as any).bindVertexArray = vi.fn();
      (gl as any).deleteVertexArray = vi.fn();
      (gl as any).drawArraysInstanced = vi.fn();
      (gl as any).vertexAttribDivisor = vi.fn();

      const ctx = new WebGLContext(gl as any);

      simulateLoss();

      // These should not throw even when context is lost
      expect(() => ctx.bindVertexArray(null)).not.toThrow();
      expect(() => ctx.deleteVertexArray(null)).not.toThrow();
    });

    it('should return safe defaults when context is lost', () => {
      const { gl, simulateLoss } = createMockContextWithLossSupport();

      // Add WebGL2-like methods
      (gl as any).createVertexArray = vi.fn(() => {
        if (gl.isContextLost()) return null;
        return { id: 'vao' };
      });

      const ctx = new WebGLContext(gl as any);

      simulateLoss();

      // Should return null safely
      const vao = ctx.createVertexArray();
      expect(vao).toBeNull();
    });
  });

  describe('Context Loss Event Handling', () => {
    it('should allow registering context loss handlers', () => {
      const { gl } = createMockContextWithLossSupport();
      const onLost = vi.fn();
      const onRestored = vi.fn();

      gl.canvas.addEventListener('webglcontextlost', onLost);
      gl.canvas.addEventListener('webglcontextrestored', onRestored);

      expect(gl.canvas.addEventListener).toHaveBeenCalledWith('webglcontextlost', onLost);
      expect(gl.canvas.addEventListener).toHaveBeenCalledWith('webglcontextrestored', onRestored);
    });

    it('should call handlers when context is lost and restored', () => {
      const { gl, simulateLoss, simulateRestore } = createMockContextWithLossSupport();
      const onLost = vi.fn((e: Event) => e.preventDefault());
      const onRestored = vi.fn();

      gl.canvas.addEventListener('webglcontextlost', onLost);
      gl.canvas.addEventListener('webglcontextrestored', onRestored);

      simulateLoss();
      expect(onLost).toHaveBeenCalled();

      simulateRestore();
      expect(onRestored).toHaveBeenCalled();
    });
  });

  describe('Recovery Strategy', () => {
    it('should be able to recreate resources after context restore', () => {
      const { gl, simulateLoss, simulateRestore } = createMockContextWithLossSupport();

      // Add WebGL2-like methods
      (gl as any).createVertexArray = vi.fn(() => {
        if (gl.isContextLost()) return null;
        return { id: `vao-${Date.now()}` };
      });

      const ctx = new WebGLContext(gl as any);

      // Create resource before loss
      const vao1 = ctx.createVertexArray();
      expect(vao1).not.toBeNull();

      // Lose context
      simulateLoss();
      expect(ctx.createVertexArray()).toBeNull();

      // Restore context
      simulateRestore();

      // Should be able to create new resources
      const vao2 = ctx.createVertexArray();
      expect(vao2).not.toBeNull();
    });

    it('should report capabilities correctly after restore', () => {
      const { gl, simulateLoss, simulateRestore } = createMockContextWithLossSupport();

      // Add WebGL2-like methods for capability detection
      (gl as any).createVertexArray = vi.fn(() => ({ id: 'vao' }));
      (gl as any).bindVertexArray = vi.fn();
      (gl as any).deleteVertexArray = vi.fn();
      (gl as any).drawArraysInstanced = vi.fn();
      (gl as any).vertexAttribDivisor = vi.fn();

      const ctx = new WebGLContext(gl as any);

      const capsBefore = ctx.getCapabilities();
      expect(capsBefore.supportsVAO).toBe(true);

      simulateLoss();
      simulateRestore();

      // Capabilities should still be reported correctly after restore
      const capsAfter = ctx.getCapabilities();
      expect(capsAfter.supportsVAO).toBe(true);
      expect(capsAfter.supportsInstancing).toBe(true);
    });
  });
});

describe('WebGL Version Fallback', () => {
  it('should detect WebGL 2 context', () => {
    const gl2 = {
      createVertexArray: vi.fn(() => ({})),
      bindVertexArray: vi.fn(),
      deleteVertexArray: vi.fn(),
      drawArraysInstanced: vi.fn(),
      drawElementsInstanced: vi.fn(),
      vertexAttribDivisor: vi.fn(),
      getExtension: vi.fn(() => null),
      getParameter: vi.fn(() => 4096),
      isContextLost: vi.fn(() => false),
    } as unknown as WebGL2RenderingContext;

    const ctx = new WebGLContext(gl2);
    expect(ctx.version).toBe(2);
    expect(ctx.supportsInstancing).toBe(true);
    expect(ctx.supportsVAO).toBe(true);
  });

  it('should fallback to WebGL 1 with extensions', () => {
    const instancingExt = {
      drawArraysInstancedANGLE: vi.fn(),
      drawElementsInstancedANGLE: vi.fn(),
      vertexAttribDivisorANGLE: vi.fn(),
    };

    const vaoExt = {
      createVertexArrayOES: vi.fn(() => ({})),
      deleteVertexArrayOES: vi.fn(),
      bindVertexArrayOES: vi.fn(),
    };

    const gl1 = {
      getExtension: vi.fn((name: string) => {
        if (name === 'ANGLE_instanced_arrays') return instancingExt;
        if (name === 'OES_vertex_array_object') return vaoExt;
        return null;
      }),
      getParameter: vi.fn(() => 4096),
      isContextLost: vi.fn(() => false),
    } as unknown as WebGLRenderingContext;

    const ctx = new WebGLContext(gl1);
    expect(ctx.version).toBe(1);
    expect(ctx.supportsInstancing).toBe(true);
    expect(ctx.supportsVAO).toBe(true);
  });

  it('should handle WebGL 1 without extensions', () => {
    const gl1 = {
      getExtension: vi.fn(() => null),
      getParameter: vi.fn(() => 4096),
      isContextLost: vi.fn(() => false),
    } as unknown as WebGLRenderingContext;

    const ctx = new WebGLContext(gl1);
    expect(ctx.version).toBe(1);
    expect(ctx.supportsInstancing).toBe(false);
    expect(ctx.supportsVAO).toBe(false);
  });

  it('should throw when instancing is used without support', () => {
    const gl1 = {
      getExtension: vi.fn(() => null),
      getParameter: vi.fn(() => 4096),
      isContextLost: vi.fn(() => false),
    } as unknown as WebGLRenderingContext;

    const ctx = new WebGLContext(gl1);

    expect(() => {
      ctx.drawArraysInstanced(4, 0, 6, 100);
    }).toThrow('Instanced rendering is not supported');

    expect(() => {
      ctx.drawElementsInstanced(4, 6, 5123, 0, 100);
    }).toThrow('Instanced rendering is not supported');

    expect(() => {
      ctx.vertexAttribDivisor(0, 1);
    }).toThrow('Instanced rendering is not supported');
  });
});
