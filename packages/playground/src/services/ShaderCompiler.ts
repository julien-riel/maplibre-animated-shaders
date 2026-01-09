/**
 * ShaderCompiler - WebGL shader compilation and validation
 */

import type { CompilationError } from '../state';
import type { GeometryType } from 'maplibre-animated-shaders';
import { processGLSL } from './GLSLPreprocessor';

/**
 * Compilation result
 */
export interface CompilationResult {
  success: boolean;
  errors: CompilationError[];
  warnings: CompilationError[];
  processedFragment: string;
  processedVertex: string | null;
}

/**
 * Default vertex shaders for each geometry type
 * These provide the varyings that fragment shaders expect
 */
const DEFAULT_VERTEX_SHADERS: Record<GeometryType, string> = {
  point: `
    precision highp float;

    attribute vec2 a_pos;
    attribute vec2 a_offset;
    attribute float a_index;
    attribute float a_timeOffset;
    attribute vec4 a_color;
    attribute float a_intensity;

    uniform mat4 u_matrix;
    uniform float u_time;
    uniform float u_size;
    uniform vec2 u_resolution;

    varying vec2 v_pos;
    varying float v_index;
    varying float v_timeOffset;
    varying float v_effectiveTime;
    varying vec4 v_color;
    varying float v_intensity;
    varying float v_useDataDrivenColor;
    varying float v_useDataDrivenIntensity;

    void main() {
      v_pos = a_offset;
      v_index = a_index;
      v_timeOffset = a_timeOffset;
      v_effectiveTime = u_time + a_timeOffset;
      v_color = a_color;
      v_intensity = a_intensity;
      v_useDataDrivenColor = 1.0;
      v_useDataDrivenIntensity = 1.0;

      vec4 projected = u_matrix * vec4(a_pos, 0.0, 1.0);
      vec2 offset = a_offset * u_size / u_resolution * 2.0 * projected.w;
      gl_Position = projected + vec4(offset, 0.0, 0.0);
    }
  `,

  line: `
    precision highp float;

    attribute vec2 a_pos;
    attribute vec2 a_offset;
    attribute float a_progress;
    attribute float a_line_index;
    attribute float a_width;
    attribute float a_timeOffset;
    attribute vec4 a_color;
    attribute float a_intensity;

    uniform mat4 u_matrix;
    uniform float u_time;

    varying vec2 v_pos;
    varying float v_progress;
    varying float v_line_index;
    varying float v_width;
    varying float v_timeOffset;
    varying float v_effectiveTime;
    varying vec4 v_color;
    varying float v_intensity;
    varying float v_useDataDrivenColor;
    varying float v_useDataDrivenIntensity;

    void main() {
      v_pos = a_offset;
      v_progress = a_progress;
      v_line_index = a_line_index;
      v_width = a_width;
      v_timeOffset = a_timeOffset;
      v_effectiveTime = u_time + a_timeOffset;
      v_color = a_color;
      v_intensity = a_intensity;
      v_useDataDrivenColor = 1.0;
      v_useDataDrivenIntensity = 1.0;

      gl_Position = u_matrix * vec4(a_pos, 0.0, 1.0);
    }
  `,

  polygon: `
    precision highp float;

    attribute vec2 a_pos;
    attribute vec2 a_uv;
    attribute vec2 a_centroid;
    attribute float a_polygon_index;
    attribute float a_timeOffset;
    attribute vec4 a_color;
    attribute float a_intensity;

    uniform mat4 u_matrix;
    uniform float u_time;
    uniform vec2 u_resolution;

    varying vec2 v_pos;
    varying vec2 v_uv;
    varying vec2 v_centroid;
    varying float v_polygon_index;
    varying vec2 v_screen_pos;
    varying float v_timeOffset;
    varying float v_effectiveTime;
    varying vec4 v_color;
    varying float v_intensity;
    varying float v_useDataDrivenColor;
    varying float v_useDataDrivenIntensity;

    void main() {
      v_pos = a_pos;
      v_uv = a_uv;
      v_centroid = a_centroid;
      v_polygon_index = a_polygon_index;
      v_timeOffset = a_timeOffset;
      v_effectiveTime = u_time + a_timeOffset;
      v_color = a_color;
      v_intensity = a_intensity;
      v_useDataDrivenColor = 1.0;
      v_useDataDrivenIntensity = 1.0;

      vec4 projected = u_matrix * vec4(a_pos, 0.0, 1.0);
      v_screen_pos = (projected.xy / projected.w * 0.5 + 0.5) * u_resolution;
      gl_Position = projected;
    }
  `,

  global: `
    precision highp float;

    attribute vec2 a_pos;

    varying vec2 v_uv;

    void main() {
      v_uv = a_pos * 0.5 + 0.5;
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `,
};

/**
 * ShaderCompiler service
 */
export class ShaderCompiler {
  private gl: WebGLRenderingContext | null = null;
  private canvas: HTMLCanvasElement | null = null;

  constructor() {
    this.initContext();
  }

  /**
   * Initialize WebGL context for compilation
   */
  private initContext(): void {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1;
    this.canvas.height = 1;
    this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl') as WebGLRenderingContext;

    if (!this.gl) {
      console.error('WebGL not supported');
    }
  }

  /**
   * Compile shader and check for errors
   */
  compile(
    fragmentShader: string,
    vertexShader: string | null,
    geometryType: GeometryType = 'point'
  ): CompilationResult {
    const errors: CompilationError[] = [];
    const warnings: CompilationError[] = [];

    if (!this.gl) {
      errors.push({
        type: 'error',
        line: 1,
        message: 'WebGL context not available',
        source: 'fragment',
      });
      return {
        success: false,
        errors,
        warnings,
        processedFragment: fragmentShader,
        processedVertex: vertexShader,
      };
    }

    // Preprocess shaders
    let processedFragment = fragmentShader;
    let processedVertex = vertexShader;

    try {
      processedFragment = processGLSL(fragmentShader);
    } catch (e) {
      errors.push({
        type: 'error',
        line: 1,
        message: `Preprocessing error: ${(e as Error).message}`,
        source: 'fragment',
      });
    }

    if (vertexShader) {
      try {
        processedVertex = processGLSL(vertexShader);
      } catch (e) {
        errors.push({
          type: 'error',
          line: 1,
          message: `Preprocessing error: ${(e as Error).message}`,
          source: 'vertex',
        });
      }
    }

    // Use geometry-specific default vertex shader if none provided
    const testVertexShader = processedVertex || DEFAULT_VERTEX_SHADERS[geometryType];

    // Compile fragment shader
    const fragResult = this.compileShader(
      this.gl.FRAGMENT_SHADER,
      processedFragment,
      'fragment'
    );
    errors.push(...fragResult.errors);
    warnings.push(...fragResult.warnings);

    // Compile vertex shader if provided
    if (vertexShader) {
      const vertResult = this.compileShader(
        this.gl.VERTEX_SHADER,
        testVertexShader,
        'vertex'
      );
      errors.push(...vertResult.errors);
      warnings.push(...vertResult.warnings);
    }

    // Try linking if both shaders compiled
    if (errors.length === 0) {
      const linkResult = this.linkProgram(processedFragment, testVertexShader);
      errors.push(...linkResult.errors);
    }

    return {
      success: errors.length === 0,
      errors,
      warnings,
      processedFragment,
      processedVertex,
    };
  }

  /**
   * Compile a single shader
   */
  private compileShader(
    type: number,
    source: string,
    sourceType: 'vertex' | 'fragment'
  ): { errors: CompilationError[]; warnings: CompilationError[] } {
    const errors: CompilationError[] = [];
    const warnings: CompilationError[] = [];

    if (!this.gl) return { errors, warnings };

    const shader = this.gl.createShader(type);
    if (!shader) {
      errors.push({
        type: 'error',
        line: 1,
        message: 'Failed to create shader',
        source: sourceType,
      });
      return { errors, warnings };
    }

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const log = this.gl.getShaderInfoLog(shader) || 'Unknown error';
      const parsed = this.parseErrorLog(log, sourceType);
      errors.push(...parsed.errors);
      warnings.push(...parsed.warnings);
    }

    this.gl.deleteShader(shader);
    return { errors, warnings };
  }

  /**
   * Link shaders into a program
   */
  private linkProgram(
    fragmentSource: string,
    vertexSource: string
  ): { errors: CompilationError[] } {
    const errors: CompilationError[] = [];

    if (!this.gl) return { errors };

    const vertShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    const fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);

    if (!vertShader || !fragShader) {
      errors.push({
        type: 'error',
        line: 1,
        message: 'Failed to create shaders for linking',
        source: 'fragment',
      });
      return { errors };
    }

    this.gl.shaderSource(vertShader, vertexSource);
    this.gl.compileShader(vertShader);

    this.gl.shaderSource(fragShader, fragmentSource);
    this.gl.compileShader(fragShader);

    const program = this.gl.createProgram();
    if (!program) {
      this.gl.deleteShader(vertShader);
      this.gl.deleteShader(fragShader);
      errors.push({
        type: 'error',
        line: 1,
        message: 'Failed to create program',
        source: 'fragment',
      });
      return { errors };
    }

    this.gl.attachShader(program, vertShader);
    this.gl.attachShader(program, fragShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const log = this.gl.getProgramInfoLog(program) || 'Unknown link error';
      errors.push({
        type: 'error',
        line: 1,
        message: `Link error: ${log}`,
        source: 'fragment',
      });
    }

    this.gl.deleteProgram(program);
    this.gl.deleteShader(vertShader);
    this.gl.deleteShader(fragShader);

    return { errors };
  }

  /**
   * Parse shader error log
   */
  private parseErrorLog(
    log: string,
    source: 'vertex' | 'fragment'
  ): { errors: CompilationError[]; warnings: CompilationError[] } {
    const errors: CompilationError[] = [];
    const warnings: CompilationError[] = [];

    // Parse patterns like:
    // ERROR: 0:15: 'v_uv' : undeclared identifier
    // WARNING: 0:10: ...
    const regex = /(ERROR|WARNING):\s*\d+:(\d+):\s*(.+)/gi;
    let match;

    while ((match = regex.exec(log)) !== null) {
      const type = match[1].toLowerCase() as 'error' | 'warning';
      const line = parseInt(match[2], 10);
      const message = match[3].trim();

      const error: CompilationError = {
        type,
        line,
        message,
        source,
      };

      if (type === 'error') {
        errors.push(error);
      } else {
        warnings.push(error);
      }
    }

    // If no specific errors found, add the whole log as a generic error
    if (errors.length === 0 && warnings.length === 0 && log.trim()) {
      errors.push({
        type: 'error',
        line: 1,
        message: log.trim(),
        source,
      });
    }

    return { errors, warnings };
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.gl = null;
    this.canvas = null;
  }
}

/**
 * Global compiler instance
 */
export const shaderCompiler = new ShaderCompiler();
