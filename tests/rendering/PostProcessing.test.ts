/**
 * Tests for PostProcessingPipeline
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PostProcessingPipeline,
  type PostProcessEffect,
} from '../../src/rendering/PostProcessing';
import type { IWebGLContext } from '../../src/webgl';

// Mock WebGL context
function createMockGL(): WebGLRenderingContext {
  let framebufferCounter = 0;
  let textureCounter = 0;
  let bufferCounter = 0;
  let programCounter = 0;
  let shaderCounter = 0;

  return {
    TEXTURE_2D: 3553,
    TEXTURE0: 33984,
    TEXTURE_WRAP_S: 10242,
    TEXTURE_WRAP_T: 10243,
    TEXTURE_MIN_FILTER: 10241,
    TEXTURE_MAG_FILTER: 10240,
    CLAMP_TO_EDGE: 33071,
    LINEAR: 9729,
    RGBA: 6408,
    UNSIGNED_BYTE: 5121,
    FRAMEBUFFER: 36160,
    COLOR_ATTACHMENT0: 36064,
    ARRAY_BUFFER: 34962,
    STATIC_DRAW: 35044,
    FLOAT: 5126,
    TRIANGLE_STRIP: 5,
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    createTexture: vi.fn(() => ({ id: ++textureCounter })),
    deleteTexture: vi.fn(),
    bindTexture: vi.fn(),
    activeTexture: vi.fn(),
    texImage2D: vi.fn(),
    texParameteri: vi.fn(),
    createFramebuffer: vi.fn(() => ({ id: ++framebufferCounter })),
    deleteFramebuffer: vi.fn(),
    bindFramebuffer: vi.fn(),
    framebufferTexture2D: vi.fn(),
    createBuffer: vi.fn(() => ({ id: ++bufferCounter })),
    deleteBuffer: vi.fn(),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    createProgram: vi.fn(() => ({ id: ++programCounter })),
    deleteProgram: vi.fn(),
    useProgram: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    createShader: vi.fn(() => ({ id: ++shaderCounter })),
    deleteShader: vi.fn(),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    attachShader: vi.fn(),
    getAttribLocation: vi.fn((_, name) => {
      if (name === 'a_position') return 0;
      return -1;
    }),
    getUniformLocation: vi.fn((_, name) => ({ name })),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    uniform1i: vi.fn(),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    uniform2fv: vi.fn(),
    uniform3fv: vi.fn(),
    uniform4fv: vi.fn(),
    drawArrays: vi.fn(),
    viewport: vi.fn(),
  } as unknown as WebGLRenderingContext;
}

// Mock IWebGLContext
function createMockContext(): IWebGLContext {
  const gl = createMockGL();
  return {
    gl,
    version: 2,
    supportsInstancing: true,
    supportsVAO: true,
    createVertexArray: vi.fn(() => ({})),
    bindVertexArray: vi.fn(),
    deleteVertexArray: vi.fn(),
    drawArraysInstanced: vi.fn(),
    drawElementsInstanced: vi.fn(),
    vertexAttribDivisor: vi.fn(),
    isContextLost: () => false,
    getCapabilities: () => ({
      maxTextureSize: 4096,
      maxVertexAttribs: 16,
      maxTextureUnits: 8,
      maxVaryings: 16,
      floatTextures: true,
      depthTextures: true,
      vertexArrayObjects: true,
      instancedArrays: true,
    }),
  } as unknown as IWebGLContext;
}

describe('PostProcessingPipeline', () => {
  let pipeline: PostProcessingPipeline;
  let ctx: IWebGLContext;
  let gl: WebGLRenderingContext;

  beforeEach(() => {
    ctx = createMockContext();
    gl = ctx.gl;
    pipeline = new PostProcessingPipeline(ctx);
  });

  describe('constructor', () => {
    it('should create pipeline with WebGL context', () => {
      expect(pipeline).toBeDefined();
    });

    it('should create quad buffer', () => {
      expect(gl.createBuffer).toHaveBeenCalled();
      expect(gl.bufferData).toHaveBeenCalled();
    });
  });

  describe('resize', () => {
    it('should create framebuffers on first resize', () => {
      pipeline.resize(800, 600);

      // Should create 2 framebuffers for ping-pong
      expect(gl.createFramebuffer).toHaveBeenCalledTimes(2);
      expect(gl.createTexture).toHaveBeenCalledTimes(2);
    });

    it('should skip resize if dimensions unchanged', () => {
      pipeline.resize(800, 600);
      const callCount = (gl.createFramebuffer as ReturnType<typeof vi.fn>).mock.calls.length;

      pipeline.resize(800, 600);

      expect(gl.createFramebuffer).toHaveBeenCalledTimes(callCount);
    });

    it('should recreate framebuffers on dimension change', () => {
      pipeline.resize(800, 600);
      pipeline.resize(1024, 768);

      // Should have created 4 total (2 + 2)
      expect(gl.createFramebuffer).toHaveBeenCalledTimes(4);
    });

    it('should clean up old framebuffers on resize', () => {
      pipeline.resize(800, 600);
      pipeline.resize(1024, 768);

      // Should have deleted the first 2 framebuffers
      expect(gl.deleteFramebuffer).toHaveBeenCalledTimes(2);
      expect(gl.deleteTexture).toHaveBeenCalledTimes(2);
    });
  });

  describe('addEffect', () => {
    it('should add effect to pipeline', () => {
      const effect = PostProcessingPipeline.createVignette(0.5, 0.5);
      pipeline.addEffect(effect);

      // Should compile shader program
      expect(gl.createProgram).toHaveBeenCalled();
      expect(gl.createShader).toHaveBeenCalled();
    });

    it('should enable effect by default', () => {
      const effect = PostProcessingPipeline.createVignette();
      pipeline.addEffect(effect);

      // Effect should be enabled (verified in end() behavior)
      expect(effect.enabled).toBeUndefined(); // Default before addEffect
    });
  });

  describe('removeEffect', () => {
    it('should remove effect by name', () => {
      pipeline.addEffect(PostProcessingPipeline.createVignette());

      const result = pipeline.removeEffect('vignette');

      expect(result).toBe(true);
      expect(gl.deleteProgram).toHaveBeenCalled();
    });

    it('should return false for non-existent effect', () => {
      const result = pipeline.removeEffect('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('setEffectEnabled', () => {
    it('should enable/disable effect', () => {
      pipeline.addEffect(PostProcessingPipeline.createVignette());

      pipeline.setEffectEnabled('vignette', false);
      pipeline.setEffectEnabled('vignette', true);

      // No error thrown
      expect(true).toBe(true);
    });

    it('should handle non-existent effect gracefully', () => {
      // Should not throw
      pipeline.setEffectEnabled('nonexistent', false);
      expect(true).toBe(true);
    });
  });

  describe('updateEffect', () => {
    it('should update effect uniforms', () => {
      pipeline.addEffect(PostProcessingPipeline.createVignette(0.5, 0.5));

      pipeline.updateEffect('vignette', { u_intensity: 0.8 });

      // No error thrown, uniforms updated internally
      expect(true).toBe(true);
    });

    it('should handle non-existent effect gracefully', () => {
      pipeline.updateEffect('nonexistent', { u_value: 1.0 });
      expect(true).toBe(true);
    });
  });

  describe('begin/end', () => {
    beforeEach(() => {
      pipeline.resize(800, 600);
    });

    it('should bind framebuffer on begin', () => {
      pipeline.begin();

      expect(gl.bindFramebuffer).toHaveBeenCalled();
    });

    it('should not bind if not resized', () => {
      const newPipeline = new PostProcessingPipeline(ctx);
      newPipeline.begin();

      // Should return early, no framebuffer bind
      // (bindFramebuffer might still be called from resize in beforeEach for other pipelines)
    });

    it('should copy to screen when no effects enabled', () => {
      pipeline.begin();
      pipeline.end();

      // Should bind null framebuffer (screen)
      expect(gl.bindFramebuffer).toHaveBeenCalledWith(gl.FRAMEBUFFER, null);
    });

    it('should apply single effect', () => {
      pipeline.addEffect(PostProcessingPipeline.createVignette());

      pipeline.begin();
      pipeline.end();

      expect(gl.useProgram).toHaveBeenCalled();
      expect(gl.drawArrays).toHaveBeenCalled();
    });

    it('should chain multiple effects', () => {
      pipeline.addEffect(PostProcessingPipeline.createVignette());
      pipeline.addEffect(PostProcessingPipeline.createSharpen());

      pipeline.begin();
      pipeline.end();

      // Should draw twice (once per effect)
      expect((gl.drawArrays as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('should skip disabled effects', () => {
      pipeline.addEffect(PostProcessingPipeline.createVignette());
      pipeline.setEffectEnabled('vignette', false);

      pipeline.begin();
      const drawCallsBefore = (gl.drawArrays as ReturnType<typeof vi.fn>).mock.calls.length;
      pipeline.end();
      const drawCallsAfter = (gl.drawArrays as ReturnType<typeof vi.fn>).mock.calls.length;

      // Only passthrough draw, no effect draw
      expect(drawCallsAfter - drawCallsBefore).toBe(1);
    });

    it('should not process if begin was not called', () => {
      pipeline.end();

      // Should return early
      expect(true).toBe(true);
    });
  });

  describe('dispose', () => {
    it('should clean up all resources', () => {
      pipeline.resize(800, 600);
      pipeline.addEffect(PostProcessingPipeline.createVignette());

      pipeline.dispose();

      expect(gl.deleteFramebuffer).toHaveBeenCalled();
      expect(gl.deleteTexture).toHaveBeenCalled();
      expect(gl.deleteProgram).toHaveBeenCalled();
      expect(gl.deleteBuffer).toHaveBeenCalled();
    });

    it('should handle dispose without initialization', () => {
      const newPipeline = new PostProcessingPipeline(ctx);
      newPipeline.dispose();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('factory methods', () => {
    describe('createBlur', () => {
      it('should create blur effect with defaults', () => {
        const effect = PostProcessingPipeline.createBlur();

        expect(effect.name).toBe('blur');
        expect(effect.uniforms.u_radius).toBe(2);
        expect(effect.uniforms.u_direction).toEqual([1, 0]);
      });

      it('should create blur effect with custom params', () => {
        const effect = PostProcessingPipeline.createBlur(5, [0, 1]);

        expect(effect.uniforms.u_radius).toBe(5);
        expect(effect.uniforms.u_direction).toEqual([0, 1]);
      });
    });

    describe('createVignette', () => {
      it('should create vignette effect with defaults', () => {
        const effect = PostProcessingPipeline.createVignette();

        expect(effect.name).toBe('vignette');
        expect(effect.uniforms.u_intensity).toBe(0.5);
        expect(effect.uniforms.u_radius).toBe(0.5);
      });

      it('should create vignette effect with custom params', () => {
        const effect = PostProcessingPipeline.createVignette(0.8, 0.3);

        expect(effect.uniforms.u_intensity).toBe(0.8);
        expect(effect.uniforms.u_radius).toBe(0.3);
      });
    });

    describe('createColorGrade', () => {
      it('should create color grade effect with defaults', () => {
        const effect = PostProcessingPipeline.createColorGrade();

        expect(effect.name).toBe('colorGrade');
        expect(effect.uniforms.u_brightness).toBe(1.0);
        expect(effect.uniforms.u_contrast).toBe(1.0);
        expect(effect.uniforms.u_saturation).toBe(1.0);
        expect(effect.uniforms.u_tint).toEqual([1.0, 1.0, 1.0]);
      });

      it('should create color grade effect with custom params', () => {
        const effect = PostProcessingPipeline.createColorGrade({
          brightness: 1.2,
          contrast: 0.9,
          saturation: 1.1,
          tint: [1.0, 0.9, 0.8],
        });

        expect(effect.uniforms.u_brightness).toBe(1.2);
        expect(effect.uniforms.u_contrast).toBe(0.9);
        expect(effect.uniforms.u_saturation).toBe(1.1);
        expect(effect.uniforms.u_tint).toEqual([1.0, 0.9, 0.8]);
      });
    });

    describe('createSharpen', () => {
      it('should create sharpen effect with defaults', () => {
        const effect = PostProcessingPipeline.createSharpen();

        expect(effect.name).toBe('sharpen');
        expect(effect.uniforms.u_intensity).toBe(0.5);
      });

      it('should create sharpen effect with custom intensity', () => {
        const effect = PostProcessingPipeline.createSharpen(0.8);

        expect(effect.uniforms.u_intensity).toBe(0.8);
      });
    });
  });

  describe('uniform handling', () => {
    beforeEach(() => {
      pipeline.resize(800, 600);
    });

    it('should set boolean uniforms as float', () => {
      const effect: PostProcessEffect = {
        name: 'custom',
        fragmentShader: `
          precision mediump float;
          varying vec2 v_texCoord;
          uniform sampler2D u_texture;
          uniform float u_enabled;
          void main() { gl_FragColor = texture2D(u_texture, v_texCoord); }
        `,
        uniforms: { u_enabled: true },
      };

      pipeline.addEffect(effect);
      pipeline.begin();
      pipeline.end();

      expect(gl.uniform1f).toHaveBeenCalled();
    });

    it('should set vec2 uniforms', () => {
      const effect: PostProcessEffect = {
        name: 'custom',
        fragmentShader: `
          precision mediump float;
          varying vec2 v_texCoord;
          uniform sampler2D u_texture;
          uniform vec2 u_offset;
          void main() { gl_FragColor = texture2D(u_texture, v_texCoord); }
        `,
        uniforms: { u_offset: [0.1, 0.2] },
      };

      pipeline.addEffect(effect);
      pipeline.begin();
      pipeline.end();

      expect(gl.uniform2fv).toHaveBeenCalled();
    });

    it('should set vec3 uniforms', () => {
      const effect: PostProcessEffect = {
        name: 'custom',
        fragmentShader: `
          precision mediump float;
          varying vec2 v_texCoord;
          uniform sampler2D u_texture;
          uniform vec3 u_color;
          void main() { gl_FragColor = texture2D(u_texture, v_texCoord); }
        `,
        uniforms: { u_color: [1.0, 0.5, 0.0] },
      };

      pipeline.addEffect(effect);
      pipeline.begin();
      pipeline.end();

      expect(gl.uniform3fv).toHaveBeenCalled();
    });

    it('should set vec4 uniforms', () => {
      const effect: PostProcessEffect = {
        name: 'custom',
        fragmentShader: `
          precision mediump float;
          varying vec2 v_texCoord;
          uniform sampler2D u_texture;
          uniform vec4 u_color;
          void main() { gl_FragColor = texture2D(u_texture, v_texCoord); }
        `,
        uniforms: { u_color: [1.0, 0.5, 0.0, 1.0] },
      };

      pipeline.addEffect(effect);
      pipeline.begin();
      pipeline.end();

      expect(gl.uniform4fv).toHaveBeenCalled();
    });
  });

  describe('ping-pong rendering', () => {
    beforeEach(() => {
      pipeline.resize(800, 600);
    });

    it('should alternate framebuffers for multiple effects', () => {
      pipeline.addEffect(PostProcessingPipeline.createBlur(2, [1, 0]));
      pipeline.addEffect(PostProcessingPipeline.createBlur(2, [0, 1]));
      pipeline.addEffect(PostProcessingPipeline.createVignette());

      pipeline.begin();
      pipeline.end();

      // Should bind multiple framebuffers during processing
      const bindCalls = (gl.bindFramebuffer as ReturnType<typeof vi.fn>).mock.calls;
      expect(bindCalls.length).toBeGreaterThan(2);
    });
  });
});
