/**
 * Post-Processing Pipeline
 *
 * Provides a chainable post-processing effect system for
 * applying screen-space effects to rendered output.
 *
 * @module rendering/PostProcessing
 */

import type { IWebGLContext } from '../webgl';
import { buildProgram, type CompiledProgram } from '../webgl';

/**
 * Post-processing effect definition
 */
export interface PostProcessEffect {
  /** Effect name for identification */
  name: string;

  /** Fragment shader source */
  fragmentShader: string;

  /** Uniform values */
  uniforms: Record<string, number | number[] | boolean>;

  /** Whether this effect is enabled */
  enabled?: boolean;

  /** Effect blend mode */
  blendMode?: 'replace' | 'add' | 'multiply';
}

/**
 * Built-in effect types
 */
export type BuiltinEffect = 'blur' | 'bloom' | 'vignette' | 'colorGrade' | 'sharpen';

/**
 * Full-screen quad vertex shader
 */
const FULLSCREEN_VERTEX = `
attribute vec2 a_position;
varying vec2 v_texCoord;

void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

/**
 * Passthrough fragment shader
 */
const PASSTHROUGH_FRAGMENT = `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;

void main() {
  gl_FragColor = texture2D(u_texture, v_texCoord);
}
`;

/**
 * Gaussian blur fragment shader
 */
const BLUR_FRAGMENT = `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_direction;
uniform float u_radius;

void main() {
  vec4 color = vec4(0.0);
  float total = 0.0;

  for (float i = -4.0; i <= 4.0; i++) {
    float weight = 1.0 - abs(i) / 5.0;
    vec2 offset = u_direction * i * u_radius / u_resolution;
    color += texture2D(u_texture, v_texCoord + offset) * weight;
    total += weight;
  }

  gl_FragColor = color / total;
}
`;

/**
 * Bloom fragment shader
 * Note: Used for bloom effect (requires two-pass rendering)
 */
const _BLOOM_FRAGMENT = `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform sampler2D u_blurTexture;
uniform float u_intensity;
uniform float u_threshold;

void main() {
  vec4 original = texture2D(u_texture, v_texCoord);
  vec4 blurred = texture2D(u_blurTexture, v_texCoord);

  // Extract bright areas
  float brightness = dot(blurred.rgb, vec3(0.299, 0.587, 0.114));
  vec4 bloom = blurred * smoothstep(u_threshold, u_threshold + 0.1, brightness);

  gl_FragColor = original + bloom * u_intensity;
}
`;

// Export for potential future use
export { _BLOOM_FRAGMENT as BLOOM_FRAGMENT };

/**
 * Vignette fragment shader
 */
const VIGNETTE_FRAGMENT = `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float u_intensity;
uniform float u_radius;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  vec2 center = v_texCoord - 0.5;
  float dist = length(center);
  float vignette = 1.0 - smoothstep(u_radius, u_radius + 0.3, dist) * u_intensity;
  gl_FragColor = vec4(color.rgb * vignette, color.a);
}
`;

/**
 * Color grading fragment shader
 */
const COLOR_GRADE_FRAGMENT = `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_saturation;
uniform vec3 u_tint;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);

  // Apply brightness
  vec3 rgb = color.rgb * u_brightness;

  // Apply contrast
  rgb = (rgb - 0.5) * u_contrast + 0.5;

  // Apply saturation
  float gray = dot(rgb, vec3(0.299, 0.587, 0.114));
  rgb = mix(vec3(gray), rgb, u_saturation);

  // Apply tint
  rgb *= u_tint;

  gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), color.a);
}
`;

/**
 * Sharpen fragment shader
 */
const SHARPEN_FRAGMENT = `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity;

void main() {
  vec2 texel = 1.0 / u_resolution;

  vec4 center = texture2D(u_texture, v_texCoord);
  vec4 top = texture2D(u_texture, v_texCoord + vec2(0.0, texel.y));
  vec4 bottom = texture2D(u_texture, v_texCoord - vec2(0.0, texel.y));
  vec4 left = texture2D(u_texture, v_texCoord - vec2(texel.x, 0.0));
  vec4 right = texture2D(u_texture, v_texCoord + vec2(texel.x, 0.0));

  vec4 sharpened = center * (1.0 + 4.0 * u_intensity)
                 - (top + bottom + left + right) * u_intensity;

  gl_FragColor = clamp(sharpened, 0.0, 1.0);
}
`;

/**
 * Compiled effect with WebGL resources
 */
interface CompiledEffect {
  effect: PostProcessEffect;
  program: CompiledProgram;
}

/**
 * Post-processing pipeline for applying screen-space effects.
 *
 * @example
 * ```typescript
 * const pipeline = new PostProcessingPipeline(ctx);
 *
 * // Add effects
 * pipeline.addEffect(PostProcessingPipeline.createVignette(0.5));
 * pipeline.addEffect(PostProcessingPipeline.createBloom(0.3, 0.8));
 *
 * // In render loop
 * pipeline.begin(); // Start capturing
 * // ... render scene ...
 * pipeline.end(); // Apply effects and present
 * ```
 */
export class PostProcessingPipeline {
  private ctx: IWebGLContext;
  private effects: CompiledEffect[] = [];
  private quadBuffer: WebGLBuffer | null = null;

  // Framebuffers for ping-pong rendering
  private framebuffers: WebGLFramebuffer[] = [];
  private textures: WebGLTexture[] = [];
  private currentFB: number = 0;

  private width: number = 0;
  private height: number = 0;
  private isCapturing: boolean = false;

  /**
   * Create a post-processing pipeline.
   *
   * @param ctx - WebGL context wrapper
   */
  constructor(ctx: IWebGLContext) {
    this.ctx = ctx;
    this.createQuadBuffer();
  }

  /**
   * Create the fullscreen quad vertex buffer.
   */
  private createQuadBuffer(): void {
    const gl = this.ctx.gl;
    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
  }

  /**
   * Initialize or resize framebuffers.
   *
   * @param width - Viewport width
   * @param height - Viewport height
   */
  resize(width: number, height: number): void {
    if (this.width === width && this.height === height) {
      return;
    }

    this.width = width;
    this.height = height;

    const gl = this.ctx.gl;

    // Clean up old resources
    for (const fb of this.framebuffers) {
      gl.deleteFramebuffer(fb);
    }
    for (const tex of this.textures) {
      gl.deleteTexture(tex);
    }

    this.framebuffers = [];
    this.textures = [];

    // Create 2 framebuffers for ping-pong
    for (let i = 0; i < 2; i++) {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      const framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

      this.textures.push(texture!);
      this.framebuffers.push(framebuffer!);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  /**
   * Add an effect to the pipeline.
   *
   * @param effect - Effect definition
   */
  addEffect(effect: PostProcessEffect): void {
    const program = buildProgram(this.ctx, FULLSCREEN_VERTEX, effect.fragmentShader, {
      attributes: ['a_position'],
      uniforms: ['u_texture', 'u_resolution', ...Object.keys(effect.uniforms)],
    });

    this.effects.push({
      effect: { ...effect, enabled: effect.enabled ?? true },
      program,
    });
  }

  /**
   * Remove an effect by name.
   *
   * @param name - Effect name
   * @returns true if effect was found and removed
   */
  removeEffect(name: string): boolean {
    const index = this.effects.findIndex((e) => e.effect.name === name);
    if (index !== -1) {
      const gl = this.ctx.gl;
      gl.deleteProgram(this.effects[index].program.program);
      this.effects.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Enable or disable an effect.
   *
   * @param name - Effect name
   * @param enabled - Whether to enable
   */
  setEffectEnabled(name: string, enabled: boolean): void {
    const effect = this.effects.find((e) => e.effect.name === name);
    if (effect) {
      effect.effect.enabled = enabled;
    }
  }

  /**
   * Update effect uniforms.
   *
   * @param name - Effect name
   * @param uniforms - New uniform values
   */
  updateEffect(name: string, uniforms: Record<string, number | number[] | boolean>): void {
    const effect = this.effects.find((e) => e.effect.name === name);
    if (effect) {
      effect.effect.uniforms = { ...effect.effect.uniforms, ...uniforms };
    }
  }

  /**
   * Begin capturing render output.
   * Call this before rendering the scene.
   */
  begin(): void {
    if (this.framebuffers.length === 0) {
      return;
    }

    const gl = this.ctx.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[0]);
    this.currentFB = 0;
    this.isCapturing = true;
  }

  /**
   * End capturing and apply all effects.
   * Call this after rendering the scene.
   */
  end(): void {
    if (!this.isCapturing) {
      return;
    }

    const gl = this.ctx.gl;
    const enabledEffects = this.effects.filter((e) => e.effect.enabled);

    if (enabledEffects.length === 0) {
      // No effects, just copy to screen
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      this.drawQuad(this.textures[0], null);
      this.isCapturing = false;
      return;
    }

    // Apply each effect
    for (let i = 0; i < enabledEffects.length; i++) {
      const isLast = i === enabledEffects.length - 1;
      const readFB = this.currentFB;
      const writeFB = isLast ? null : 1 - this.currentFB;

      if (writeFB !== null) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[writeFB]);
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }

      this.applyEffect(enabledEffects[i], this.textures[readFB]);

      if (writeFB !== null) {
        this.currentFB = writeFB;
      }
    }

    this.isCapturing = false;
  }

  /**
   * Apply a single effect.
   */
  private applyEffect(compiled: CompiledEffect, inputTexture: WebGLTexture): void {
    const gl = this.ctx.gl;
    const { effect, program } = compiled;

    gl.useProgram(program.program);

    // Bind input texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, inputTexture);
    const texLoc = program.uniforms.get('u_texture');
    if (texLoc) gl.uniform1i(texLoc, 0);

    // Set resolution
    const resLoc = program.uniforms.get('u_resolution');
    if (resLoc) gl.uniform2f(resLoc, this.width, this.height);

    // Set effect uniforms
    for (const [name, value] of Object.entries(effect.uniforms)) {
      const loc = program.uniforms.get(name);
      if (!loc) continue;

      if (typeof value === 'boolean') {
        gl.uniform1f(loc, value ? 1.0 : 0.0);
      } else if (typeof value === 'number') {
        gl.uniform1f(loc, value);
      } else if (Array.isArray(value)) {
        switch (value.length) {
          case 2:
            gl.uniform2fv(loc, value);
            break;
          case 3:
            gl.uniform3fv(loc, value);
            break;
          case 4:
            gl.uniform4fv(loc, value);
            break;
        }
      }
    }

    this.drawQuadWithProgram(program);
  }

  /**
   * Draw fullscreen quad with passthrough shader.
   */
  private drawQuad(texture: WebGLTexture, program: CompiledProgram | null): void {
    const gl = this.ctx.gl;

    if (!program) {
      // Create passthrough program if needed
      program = buildProgram(this.ctx, FULLSCREEN_VERTEX, PASSTHROUGH_FRAGMENT, {
        attributes: ['a_position'],
        uniforms: ['u_texture'],
      });
    }

    gl.useProgram(program.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    const texLoc = program.uniforms.get('u_texture');
    if (texLoc) gl.uniform1i(texLoc, 0);

    this.drawQuadWithProgram(program);
  }

  /**
   * Draw fullscreen quad geometry.
   */
  private drawQuadWithProgram(program: CompiledProgram): void {
    const gl = this.ctx.gl;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    const posLoc = program.attributes.get('a_position');
    if (posLoc !== undefined) {
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * Clean up all WebGL resources.
   */
  dispose(): void {
    const gl = this.ctx.gl;

    for (const compiled of this.effects) {
      gl.deleteProgram(compiled.program.program);
    }
    this.effects = [];

    for (const fb of this.framebuffers) {
      gl.deleteFramebuffer(fb);
    }
    this.framebuffers = [];

    for (const tex of this.textures) {
      gl.deleteTexture(tex);
    }
    this.textures = [];

    if (this.quadBuffer) {
      gl.deleteBuffer(this.quadBuffer);
      this.quadBuffer = null;
    }
  }

  // =========================================================================
  // Factory methods for built-in effects
  // =========================================================================

  /**
   * Create a blur effect.
   *
   * @param radius - Blur radius
   * @param direction - Blur direction [x, y]
   * @returns Blur effect
   */
  static createBlur(radius: number = 2, direction: [number, number] = [1, 0]): PostProcessEffect {
    return {
      name: 'blur',
      fragmentShader: BLUR_FRAGMENT,
      uniforms: {
        u_radius: radius,
        u_direction: direction,
      },
    };
  }

  /**
   * Create a vignette effect.
   *
   * @param intensity - Vignette intensity (0-1)
   * @param radius - Vignette radius (0-1)
   * @returns Vignette effect
   */
  static createVignette(intensity: number = 0.5, radius: number = 0.5): PostProcessEffect {
    return {
      name: 'vignette',
      fragmentShader: VIGNETTE_FRAGMENT,
      uniforms: {
        u_intensity: intensity,
        u_radius: radius,
      },
    };
  }

  /**
   * Create a color grading effect.
   *
   * @param options - Color grading options
   * @returns Color grade effect
   */
  static createColorGrade(options: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    tint?: [number, number, number];
  } = {}): PostProcessEffect {
    return {
      name: 'colorGrade',
      fragmentShader: COLOR_GRADE_FRAGMENT,
      uniforms: {
        u_brightness: options.brightness ?? 1.0,
        u_contrast: options.contrast ?? 1.0,
        u_saturation: options.saturation ?? 1.0,
        u_tint: options.tint ?? [1.0, 1.0, 1.0],
      },
    };
  }

  /**
   * Create a sharpen effect.
   *
   * @param intensity - Sharpen intensity
   * @returns Sharpen effect
   */
  static createSharpen(intensity: number = 0.5): PostProcessEffect {
    return {
      name: 'sharpen',
      fragmentShader: SHARPEN_FRAGMENT,
      uniforms: {
        u_intensity: intensity,
      },
    };
  }
}
