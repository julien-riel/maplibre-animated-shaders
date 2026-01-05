/**
 * Tests for InstancedRenderer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InstancedRenderer, createQuadGeometry, createLineGeometry } from '../../src/webgl';
import type { IWebGLContext } from '../../src/webgl';

// Create a mock IWebGLContext
function createMockContext(supportsInstancing = true): IWebGLContext {
  const gl = {
    ARRAY_BUFFER: 34962,
    ELEMENT_ARRAY_BUFFER: 34963,
    STATIC_DRAW: 35044,
    DYNAMIC_DRAW: 35048,
    FLOAT: 5126,
    TRIANGLES: 4,
    UNSIGNED_SHORT: 5123,
    UNSIGNED_INT: 5125,
    createBuffer: vi.fn(() => ({ id: 1 })),
    deleteBuffer: vi.fn(),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    bufferSubData: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    disableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    drawArrays: vi.fn(),
  };

  return {
    gl,
    version: 2,
    supportsInstancing,
    supportsVAO: true,
    capabilities: {
      version: 2,
      supportsInstancing,
      supportsVAO: true,
      maxTextureSize: 4096,
      maxTextureUnits: 16,
      floatTextures: true,
      depthTextures: true,
      standardDerivatives: true,
    },
    createVertexArray: vi.fn(() => ({ id: 1 })),
    deleteVertexArray: vi.fn(),
    bindVertexArray: vi.fn(),
    drawArraysInstanced: vi.fn(),
    drawElementsInstanced: vi.fn(),
    vertexAttribDivisor: vi.fn(),
    isContextLost: vi.fn(() => false),
  } as unknown as IWebGLContext;
}

describe('InstancedRenderer', () => {
  let renderer: InstancedRenderer;
  let ctx: IWebGLContext;

  describe('initialization', () => {
    it('should initialize successfully with instancing support', () => {
      ctx = createMockContext(true);
      renderer = new InstancedRenderer(ctx);

      expect(ctx.gl.createBuffer).toHaveBeenCalledTimes(3); // geometry + instance + index
    });

    it('should create VAO when supported', () => {
      ctx = createMockContext(true);
      renderer = new InstancedRenderer(ctx);

      expect(ctx.createVertexArray).toHaveBeenCalled();
    });

    it('should throw when instancing not supported', () => {
      ctx = createMockContext(false);

      expect(() => new InstancedRenderer(ctx)).toThrow(/not supported/i);
    });
  });

  describe('static methods', () => {
    it('should report if instancing is supported', () => {
      const supportedCtx = createMockContext(true);
      const unsupportedCtx = createMockContext(false);

      expect(InstancedRenderer.isSupported(supportedCtx)).toBe(true);
      expect(InstancedRenderer.isSupported(unsupportedCtx)).toBe(false);
    });
  });

  describe('geometry setup', () => {
    beforeEach(() => {
      ctx = createMockContext(true);
      renderer = new InstancedRenderer(ctx);
    });

    it('should set geometry data', () => {
      const vertices = new Float32Array([0, 0, 1, 0, 0.5, 1]);
      const layout = [
        { name: 'a_position', location: 0, size: 2, type: 5126, offset: 0 },
      ];

      renderer.setGeometry(vertices, 3, layout, 8);

      expect(ctx.gl.bindBuffer).toHaveBeenCalled();
      expect(ctx.gl.bufferData).toHaveBeenCalledWith(
        ctx.gl.ARRAY_BUFFER,
        vertices,
        ctx.gl.STATIC_DRAW
      );
    });

    it('should set indexed geometry', () => {
      const vertices = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
      const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
      const layout = [
        { name: 'a_position', location: 0, size: 2, type: 5126, offset: 0 },
      ];

      renderer.setIndexedGeometry(vertices, indices, layout, 8);

      expect(ctx.gl.bufferData).toHaveBeenCalledTimes(2);
    });
  });

  describe('instance data', () => {
    beforeEach(() => {
      ctx = createMockContext(true);
      renderer = new InstancedRenderer(ctx);
    });

    it('should set instance data', () => {
      const instanceData = new Float32Array([
        0, 0, 1, 0,
        10, 10, 2, 1.57,
      ]);
      const layout = {
        stride: 16,
        attributes: [
          { name: 'a_offset', location: 1, size: 2, type: 5126, offset: 0 },
          { name: 'a_scale', location: 2, size: 1, type: 5126, offset: 8 },
          { name: 'a_rotation', location: 3, size: 1, type: 5126, offset: 12 },
        ],
      };

      renderer.setInstanceData(instanceData, layout);

      expect(ctx.gl.bufferData).toHaveBeenCalled();
    });

    it('should track instance count', () => {
      const instanceData = new Float32Array(16); // 4 floats * 4 instances
      const layout = { stride: 4, attributes: [] };

      renderer.setInstanceData(instanceData, layout);

      expect(renderer.getInstanceCount()).toBe(16);
    });

    it('should update instance data partially', () => {
      const instanceData = new Float32Array(16);
      const layout = { stride: 4, attributes: [] };
      renderer.setInstanceData(instanceData, layout);

      const updateData = new Float32Array([1, 2, 3, 4]);
      renderer.updateInstanceData(updateData, 4);

      expect(ctx.gl.bufferSubData).toHaveBeenCalledWith(
        ctx.gl.ARRAY_BUFFER,
        4,
        updateData
      );
    });
  });

  describe('drawing', () => {
    beforeEach(() => {
      ctx = createMockContext(true);
      renderer = new InstancedRenderer(ctx);

      const vertices = new Float32Array([0, 0, 1, 0, 0.5, 1]);
      renderer.setGeometry(vertices, 3, [], 8);

      const instanceData = new Float32Array(16);
      renderer.setInstanceData(instanceData, { stride: 4, attributes: [] });
    });

    it('should draw instanced primitives', () => {
      renderer.draw();

      expect(ctx.drawArraysInstanced).toHaveBeenCalled();
    });

    it('should support custom instance count', () => {
      renderer.draw(10);

      expect(ctx.drawArraysInstanced).toHaveBeenCalledWith(
        ctx.gl.TRIANGLES,
        0,
        3,
        10
      );
    });

    it('should support different primitive modes', () => {
      renderer.draw(undefined, 1); // LINES

      expect(ctx.drawArraysInstanced).toHaveBeenCalledWith(
        1,
        0,
        3,
        16
      );
    });

    it('should not draw with zero instances', () => {
      renderer.draw(0);

      expect(ctx.drawArraysInstanced).not.toHaveBeenCalled();
    });

    it('should bind VAO when drawing', () => {
      renderer.draw();

      expect(ctx.bindVertexArray).toHaveBeenCalled();
    });
  });

  describe('drawRange', () => {
    beforeEach(() => {
      ctx = createMockContext(true);
      renderer = new InstancedRenderer(ctx);

      const vertices = new Float32Array([0, 0, 1, 0, 0.5, 1]);
      renderer.setGeometry(vertices, 3, [], 8);

      const instanceData = new Float32Array(64);
      renderer.setInstanceData(instanceData, {
        stride: 4,
        attributes: [{ name: 'a_pos', location: 1, size: 1, type: 5126, offset: 0 }],
      });
    });

    it('should draw a range of instances', () => {
      renderer.drawRange(5, 10);

      expect(ctx.drawArraysInstanced).toHaveBeenCalledWith(
        ctx.gl.TRIANGLES,
        0,
        3,
        10
      );
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      ctx = createMockContext(true);
      renderer = new InstancedRenderer(ctx);
    });

    it('should dispose resources', () => {
      renderer.dispose();

      expect(ctx.gl.deleteBuffer).toHaveBeenCalledTimes(3);
      expect(ctx.deleteVertexArray).toHaveBeenCalled();
    });
  });

  describe('statistics', () => {
    beforeEach(() => {
      ctx = createMockContext(true);
      renderer = new InstancedRenderer(ctx);
    });

    it('should report instance count', () => {
      expect(renderer.getInstanceCount()).toBe(0);

      renderer.setInstanceData(new Float32Array(16), { stride: 4, attributes: [] });

      expect(renderer.getInstanceCount()).toBe(16);
    });

    it('should report vertices per instance', () => {
      expect(renderer.getVerticesPerInstance()).toBe(0);

      renderer.setGeometry(new Float32Array(9), 3, [], 12);

      expect(renderer.getVerticesPerInstance()).toBe(3);
    });
  });
});

describe('createQuadGeometry', () => {
  it('should create quad geometry', () => {
    const { vertices, indices, layout, stride } = createQuadGeometry();

    expect(vertices).toBeInstanceOf(Float32Array);
    expect(indices).toBeInstanceOf(Uint16Array);
    expect(layout).toHaveLength(2);
    expect(stride).toBe(16);
  });

  it('should have 4 vertices with position and UV', () => {
    const { vertices } = createQuadGeometry();

    expect(vertices.length).toBe(16); // 4 vertices * 4 floats
  });

  it('should have 6 indices for 2 triangles', () => {
    const { indices } = createQuadGeometry();

    expect(indices.length).toBe(6);
  });
});

describe('createLineGeometry', () => {
  it('should create line geometry', () => {
    const { vertices, layout, stride, vertexCount } = createLineGeometry();

    expect(vertices).toBeInstanceOf(Float32Array);
    expect(layout).toHaveLength(1);
    expect(stride).toBe(4);
    expect(vertexCount).toBe(2);
  });
});
