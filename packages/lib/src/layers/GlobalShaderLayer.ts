/**
 * GlobalShaderLayer - WebGL Custom Layer for full-screen global effects
 *
 * Implements MapLibre's CustomLayerInterface to render full-screen effects
 * like heat shimmer, day/night cycle, fog, weather particles, and holographic grids.
 */

import type { Map as MapLibreMap } from 'maplibre-gl';
import type { ShaderDefinition, ShaderConfig, RenderMatrixOrOptions } from '../types';
import { extractMatrix } from '../types';
import type { mat4 } from 'gl-matrix';
import {
  ShaderError,
  compileShaderWithErrorHandling,
  linkProgramWithErrorHandling,
  createBufferWithErrorHandling,
  safeCleanup,
  isContextLost,
} from '../utils/webgl-error-handler';

/**
 * Default vertex shader for full-screen quad
 */
const GLOBAL_VERTEX_SHADER = `
  attribute vec2 a_pos;

  uniform mat4 u_matrix;
  uniform vec2 u_resolution;
  uniform vec2 u_center;
  uniform float u_zoom;

  varying vec2 v_uv;
  varying vec2 v_screen_pos;
  varying vec2 v_map_center;
  varying float v_zoom;

  void main() {
    gl_Position = vec4(a_pos, 0.0, 1.0);

    // UV coordinates (0-1)
    v_uv = (a_pos + 1.0) * 0.5;

    // Screen position in pixels
    v_screen_pos = v_uv * u_resolution;

    // Pass map info
    v_map_center = u_center;
    v_zoom = u_zoom;
  }
`;

/**
 * GlobalShaderLayer - Custom WebGL layer for full-screen effects.
 * Note: We don't use `implements CustomLayerInterface` due to render signature
 * differences between MapLibre 3.x/4.x (mat4) and 5.x (CustomRenderMethodInput).
 * The class is runtime-compatible with both versions.
 */
export class GlobalShaderLayer {
  id: string;
  type = 'custom' as const;
  renderingMode: '2d' | '3d' = '2d';

  private map: MapLibreMap | null = null;
  private definition: ShaderDefinition;
  private config: ShaderConfig;
  private time: number = 0;
  private isPlaying: boolean = true;
  private speed: number = 1.0;
  private lastFrameTime: number = 0;

  // WebGL resources
  private program: WebGLProgram | null = null;
  private vertexBuffer: WebGLBuffer | null = null;

  // Attribute locations
  private aPos: number = -1;

  // Uniform locations
  private uniforms: Map<string, WebGLUniformLocation | null> = new Map();

  // Error handling state
  private initializationError: Error | null = null;
  private hasLoggedError: boolean = false;

  constructor(id: string, definition: ShaderDefinition, config: ShaderConfig) {
    this.id = id;
    this.definition = definition;
    this.config = { ...definition.defaultConfig, ...config };
  }

  /**
   * Update shader configuration
   */
  updateConfig(config: Partial<ShaderConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.speed !== undefined) {
      this.speed = config.speed;
    }
  }

  /**
   * Play animation
   */
  play(): void {
    this.isPlaying = true;
  }

  /**
   * Pause animation
   */
  pause(): void {
    this.isPlaying = false;
  }

  /**
   * Set animation speed
   */
  setSpeed(speed: number): void {
    this.speed = speed;
  }

  /**
   * Check if layer has an initialization error
   */
  hasError(): boolean {
    return this.initializationError !== null;
  }

  /**
   * Get the initialization error if any
   */
  getError(): Error | null {
    return this.initializationError;
  }

  /**
   * Called when the layer is added to the map
   */
  onAdd(map: MapLibreMap, gl: WebGLRenderingContext): void {
    this.map = map;
    this.initializationError = null;
    this.hasLoggedError = false;

    try {
      if (isContextLost(gl)) {
        throw new Error('WebGL context is lost');
      }

      this.program = this.createProgram(gl);
      if (!this.program) {
        throw new Error('Failed to create shader program');
      }

      this.aPos = gl.getAttribLocation(this.program, 'a_pos');

      this.cacheUniformLocations(gl);

      this.vertexBuffer = createBufferWithErrorHandling(gl, 'vertex', this.id);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

      const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    } catch (error) {
      this.initializationError = error as Error;
      console.error(
        `[GlobalShaderLayer] Initialization failed for layer "${this.id}":`,
        error instanceof ShaderError ? error.message : error
      );
      return;
    }

    this.lastFrameTime = performance.now();
  }

  /**
   * Called when the layer is removed
   */
  onRemove(_map: MapLibreMap, gl: WebGLRenderingContext): void {
    safeCleanup(gl, {
      program: this.program,
      buffers: [this.vertexBuffer],
    });

    this.program = null;
    this.vertexBuffer = null;
    this.map = null;
    this.initializationError = null;
  }

  /**
   * Render the layer
   * Supports both MapLibre 3.x/4.x (mat4) and 5.x (CustomRenderMethodInput) signatures
   */
  render(gl: WebGLRenderingContext, matrixOrOptions: RenderMatrixOrOptions): void {
    if (this.initializationError) {
      if (!this.hasLoggedError) {
        console.warn(
          `[GlobalShaderLayer] Skipping render for layer "${this.id}" due to initialization error`
        );
        this.hasLoggedError = true;
      }
      return;
    }

    if (isContextLost(gl)) {
      console.warn(`[GlobalShaderLayer] WebGL context lost for layer "${this.id}"`);
      return;
    }

    if (!this.program || !this.map) return;

    // Extract matrix from either MapLibre 3.x/4.x mat4 or 5.x options object
    const matrix = extractMatrix(matrixOrOptions) as mat4;

    // Update time
    const now = performance.now();
    const deltaTime = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    if (this.isPlaying) {
      this.time += deltaTime * this.speed;
    }

    // Use our shader program
    gl.useProgram(this.program);

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Disable depth test for overlay rendering
    gl.disable(gl.DEPTH_TEST);

    // Get canvas and map info
    const canvas = this.map.getCanvas();
    const resolution = [canvas.width, canvas.height];
    const center = this.map.getCenter();
    const zoom = this.map.getZoom();

    // Set common uniforms
    const uMatrix = this.uniforms.get('u_matrix');
    const uResolution = this.uniforms.get('u_resolution');
    const uCenter = this.uniforms.get('u_center');
    const uZoom = this.uniforms.get('u_zoom');
    const uTime = this.uniforms.get('u_time');

    if (uMatrix) gl.uniformMatrix4fv(uMatrix, false, matrix);
    if (uResolution) gl.uniform2fv(uResolution, resolution);
    if (uCenter) gl.uniform2fv(uCenter, [center.lng, center.lat]);
    if (uZoom) gl.uniform1f(uZoom, zoom);
    if (uTime) gl.uniform1f(uTime, this.time);

    // Set shader-specific uniforms
    this.setShaderUniforms(gl);

    // Disable all vertex attribute arrays first (MapLibre may have enabled some)
    const maxAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
    for (let i = 0; i < maxAttribs; i++) {
      gl.disableVertexAttribArray(i);
    }

    // Bind vertex buffer and draw
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

    if (this.aPos >= 0) {
      gl.enableVertexAttribArray(this.aPos);
      gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 0, 0);
    }

    // Draw full-screen quad as triangle strip
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Disable our attribute after drawing (cleanup)
    if (this.aPos >= 0) {
      gl.disableVertexAttribArray(this.aPos);
    }

    // Request another frame
    if (this.isPlaying) {
      this.map.triggerRepaint();
    }
  }

  /**
   * Create the shader program with comprehensive error handling
   */
  private createProgram(gl: WebGLRenderingContext): WebGLProgram | null {
    let vertexShader: WebGLShader | null = null;
    let fragmentShader: WebGLShader | null = null;

    try {
      const vertexShaderSource = this.definition.vertexShader || GLOBAL_VERTEX_SHADER;

      vertexShader = compileShaderWithErrorHandling(
        gl,
        gl.VERTEX_SHADER,
        vertexShaderSource,
        this.id
      );

      fragmentShader = compileShaderWithErrorHandling(
        gl,
        gl.FRAGMENT_SHADER,
        this.definition.fragmentShader,
        this.id
      );

      const program = linkProgramWithErrorHandling(gl, vertexShader, fragmentShader, this.id);

      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);

      return program;
    } catch (error) {
      if (vertexShader) gl.deleteShader(vertexShader);
      if (fragmentShader) gl.deleteShader(fragmentShader);
      throw error;
    }
  }

  /**
   * Cache uniform locations
   */
  private cacheUniformLocations(gl: WebGLRenderingContext): void {
    if (!this.program) return;

    // Common uniforms
    const commonUniforms = [
      'u_matrix',
      'u_resolution',
      'u_center',
      'u_zoom',
      'u_time',
      'u_color',
      'u_intensity',
      'u_opacity',
      'u_speed',
    ];

    // Get uniform names from config schema
    const schemaUniforms = Object.keys(this.definition.configSchema).map((key) => `u_${key}`);

    // Global-specific uniforms
    const globalUniforms = [
      // Heat Shimmer
      'u_distortionIntensity',
      'u_distortionScale',
      'u_direction',
      // Day Night Cycle
      'u_timeOfDay',
      'u_ambientDay',
      'u_ambientNight',
      'u_sunColor',
      'u_shadowIntensity',
      // Depth Fog
      'u_fogColor',
      'u_density',
      'u_minZoom',
      'u_maxZoom',
      'u_animated',
      // Weather
      'u_weatherType',
      'u_particleCount',
      'u_particleSize',
      'u_wind',
      'u_fallSpeed',
      // Holographic Grid
      'u_gridSize',
      'u_lineWidth',
      'u_pulseWave',
      'u_glowIntensity',
      // Additional
      'u_bounds',
      'u_scale',
    ];

    const allUniforms = new Set([...commonUniforms, ...schemaUniforms, ...globalUniforms]);

    for (const name of allUniforms) {
      this.uniforms.set(name, gl.getUniformLocation(this.program, name));
    }
  }

  /**
   * Set shader-specific uniforms from config
   */
  private setShaderUniforms(gl: WebGLRenderingContext): void {
    // Get uniforms from the shader's getUniforms function
    const uniforms = this.definition.getUniforms(this.config, this.time, 0);

    for (const [key, value] of Object.entries(uniforms)) {
      const location = this.uniforms.get(key);
      if (!location) continue;

      if (Array.isArray(value)) {
        if (value.length === 2) {
          gl.uniform2fv(location, value as number[]);
        } else if (value.length === 3) {
          gl.uniform3fv(location, value as number[]);
        } else if (value.length === 4) {
          gl.uniform4fv(location, value as number[]);
        }
      } else if (typeof value === 'number') {
        gl.uniform1f(location, value);
      } else if (typeof value === 'boolean') {
        gl.uniform1f(location, value ? 1.0 : 0.0);
      }
    }

    // Also set u_color as vec4 if we have u_color_vec4
    const colorVec4 = uniforms.u_color_vec4;
    if (colorVec4 && Array.isArray(colorVec4)) {
      const uColor = this.uniforms.get('u_color');
      if (uColor) {
        gl.uniform4fv(uColor, colorVec4 as number[]);
      }
    }
  }
}
