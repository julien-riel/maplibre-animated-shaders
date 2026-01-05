/**
 * Tests for WebGLContext abstraction layer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebGLContext, wrapWebGLContext, type IWebGLContext } from '../../src/webgl';

// Mock WebGL2 context
function createMockWebGL2Context(): WebGL2RenderingContext {
  let boundVAO: object | null = null;

  return {
    createVertexArray: vi.fn(() => ({ id: 1 })),
    deleteVertexArray: vi.fn(),
    bindVertexArray: vi.fn((vao) => {
      boundVAO = vao;
    }),
    drawArraysInstanced: vi.fn(),
    drawElementsInstanced: vi.fn(),
    vertexAttribDivisor: vi.fn(),
    getParameter: vi.fn(() => 'WebGL 2.0'),
    isContextLost: vi.fn(() => false),
    getExtension: vi.fn(() => null),
  } as unknown as WebGL2RenderingContext;
}

// Mock WebGL1 context with extensions
function createMockWebGL1Context(): WebGLRenderingContext {
  const instancingExt = {
    drawArraysInstancedANGLE: vi.fn(),
    drawElementsInstancedANGLE: vi.fn(),
    vertexAttribDivisorANGLE: vi.fn(),
  };

  const vaoExt = {
    createVertexArrayOES: vi.fn(() => ({ id: 1 })),
    deleteVertexArrayOES: vi.fn(),
    bindVertexArrayOES: vi.fn(),
    isVertexArrayOES: vi.fn(() => true),
  };

  return {
    getExtension: vi.fn((name: string) => {
      if (name === 'ANGLE_instanced_arrays') return instancingExt;
      if (name === 'OES_vertex_array_object') return vaoExt;
      return null;
    }),
    getParameter: vi.fn(() => 'WebGL 1.0'),
    isContextLost: vi.fn(() => false),
  } as unknown as WebGLRenderingContext;
}

describe('WebGLContext', () => {
  describe('wrapWebGLContext', () => {
    it('should wrap WebGL 2.0 context correctly', () => {
      const gl2 = createMockWebGL2Context();
      const ctx = wrapWebGLContext(gl2);

      expect(ctx.version).toBe(2);
      expect(ctx.supportsInstancing).toBe(true);
      expect(ctx.supportsVAO).toBe(true);
    });

    it('should wrap WebGL 1.0 context with extensions', () => {
      const gl1 = createMockWebGL1Context();
      const ctx = wrapWebGLContext(gl1);

      expect(ctx.version).toBe(1);
      expect(ctx.supportsInstancing).toBe(true);
      expect(ctx.supportsVAO).toBe(true);
    });
  });

  describe('WebGLContext class with WebGL2', () => {
    let ctx: IWebGLContext;
    let gl2: WebGL2RenderingContext;

    beforeEach(() => {
      gl2 = createMockWebGL2Context();
      ctx = new WebGLContext(gl2);
    });

    it('should report WebGL 2 version', () => {
      expect(ctx.version).toBe(2);
    });

    it('should support instancing', () => {
      expect(ctx.supportsInstancing).toBe(true);
    });

    it('should support VAO', () => {
      expect(ctx.supportsVAO).toBe(true);
    });

    it('should create and bind VAOs', () => {
      const vao = ctx.createVertexArray();

      expect(vao).not.toBeNull();
      expect(gl2.createVertexArray).toHaveBeenCalled();

      ctx.bindVertexArray(vao);
      expect(gl2.bindVertexArray).toHaveBeenCalledWith(vao);
    });

    it('should delete VAOs', () => {
      const vao = ctx.createVertexArray();
      ctx.deleteVertexArray(vao);

      expect(gl2.deleteVertexArray).toHaveBeenCalledWith(vao);
    });

    it('should draw instanced arrays', () => {
      ctx.drawArraysInstanced(4, 0, 6, 100);

      expect(gl2.drawArraysInstanced).toHaveBeenCalledWith(4, 0, 6, 100);
    });

    it('should draw instanced elements', () => {
      ctx.drawElementsInstanced(4, 6, 5123, 0, 100);

      expect(gl2.drawElementsInstanced).toHaveBeenCalledWith(4, 6, 5123, 0, 100);
    });

    it('should set vertex attribute divisor', () => {
      ctx.vertexAttribDivisor(1, 1);

      expect(gl2.vertexAttribDivisor).toHaveBeenCalledWith(1, 1);
    });

    it('should provide capabilities info', () => {
      const caps = ctx.getCapabilities();

      expect(caps).toBeDefined();
      expect(caps.version).toBe(2);
      expect(caps.supportsInstancing).toBe(true);
      expect(caps.supportsVAO).toBe(true);
    });

    it('should report context lost status', () => {
      expect(ctx.isContextLost()).toBe(false);
    });
  });

  describe('WebGL 1.0 extension fallbacks', () => {
    let ctx: IWebGLContext;
    let gl1: WebGLRenderingContext;

    beforeEach(() => {
      gl1 = createMockWebGL1Context();
      ctx = new WebGLContext(gl1);
    });

    it('should report WebGL 1 version', () => {
      expect(ctx.version).toBe(1);
    });

    it('should use OES_vertex_array_object extension', () => {
      const vao = ctx.createVertexArray();

      expect(vao).not.toBeNull();

      ctx.bindVertexArray(vao);
      const ext = gl1.getExtension('OES_vertex_array_object');
      expect(ext?.bindVertexArrayOES).toHaveBeenCalledWith(vao);
    });

    it('should use ANGLE_instanced_arrays extension', () => {
      ctx.drawArraysInstanced(4, 0, 6, 100);

      const ext = gl1.getExtension('ANGLE_instanced_arrays');
      expect(ext?.drawArraysInstancedANGLE).toHaveBeenCalledWith(4, 0, 6, 100);
    });

    it('should handle missing extensions gracefully', () => {
      const gl1NoExt = {
        getExtension: vi.fn(() => null),
        getParameter: vi.fn(() => 'WebGL 1.0'),
        isContextLost: vi.fn(() => false),
      } as unknown as WebGLRenderingContext;

      const ctx = new WebGLContext(gl1NoExt);

      expect(ctx.supportsInstancing).toBe(false);
      expect(ctx.supportsVAO).toBe(false);

      // Should not throw when VAO methods are called
      const vao = ctx.createVertexArray();
      expect(vao).toBeNull();

      // Should not throw for bind
      expect(() => ctx.bindVertexArray(null)).not.toThrow();
    });
  });
});
