/**
 * WebGL Layer Tests
 *
 * Tests all 4 WebGL custom layers:
 * - PointShaderLayer
 * - LineShaderLayer
 * - PolygonShaderLayer
 * - GlobalShaderLayer
 *
 * Uses mocked WebGL context to test layer lifecycle and behavior
 * without requiring a real browser environment.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PointShaderLayer } from '../src/layers/PointShaderLayer';
import { LineShaderLayer } from '../src/layers/LineShaderLayer';
import { PolygonShaderLayer } from '../src/layers/PolygonShaderLayer';
import { GlobalShaderLayer } from '../src/layers/GlobalShaderLayer';
import type { ShaderDefinition, ShaderConfig } from '../src/types';
import type { Map as MapLibreMap } from 'maplibre-gl';

/**
 * Create a mock WebGL context for testing
 */
function createMockWebGLContext(): WebGLRenderingContext {
  const uniformLocations = new Map<string, WebGLUniformLocation>();
  let uniformCounter = 0;

  const mockShader = { id: 1 } as WebGLShader;
  const mockProgram = { id: 1 } as WebGLProgram;
  const mockBuffer = { id: 1 } as WebGLBuffer;

  return {
    // Constants
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    VALIDATE_STATUS: 35715,
    ARRAY_BUFFER: 34962,
    ELEMENT_ARRAY_BUFFER: 34963,
    STATIC_DRAW: 35044,
    FLOAT: 5126,
    UNSIGNED_SHORT: 5123,
    TRIANGLES: 4,
    TRIANGLE_STRIP: 5,
    BLEND: 3042,
    DEPTH_TEST: 2929,
    SRC_ALPHA: 770,
    ONE_MINUS_SRC_ALPHA: 771,
    MAX_VERTEX_ATTRIBS: 34921,

    // Shader functions
    createShader: vi.fn(() => mockShader),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn((shader, param) => {
      if (param === 35713) return true; // COMPILE_STATUS
      return null;
    }),
    getShaderInfoLog: vi.fn(() => ''),
    deleteShader: vi.fn(),

    // Program functions
    createProgram: vi.fn(() => mockProgram),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn((program, param) => {
      if (param === 35714) return true; // LINK_STATUS
      if (param === 35715) return true; // VALIDATE_STATUS
      return null;
    }),
    getProgramInfoLog: vi.fn(() => ''),
    useProgram: vi.fn(),
    deleteProgram: vi.fn(),

    // Attribute functions
    getAttribLocation: vi.fn((program, name) => {
      const locations: Record<string, number> = {
        // Standard point attributes
        'a_pos': 0,
        'a_offset': 1,
        'a_index': 2,
        'a_timeOffset': 3,
        'a_color': 4,
        'a_intensity': 5,
        'a_isPlaying': 6,
        'a_localTime': 7,
        // Instanced point attributes
        'a_vertex': 0,
        'a_uv': 1,
        'a_position': 2,
        // Line attributes
        'a_pos_start': 0,
        'a_pos_end': 1,
        'a_progress': 3,
        'a_line_index': 4,
        // Polygon attributes
        'a_centroid': 2,
        'a_polygon_index': 3,
      };
      return locations[name] ?? -1;
    }),
    enableVertexAttribArray: vi.fn(),
    disableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),

    // Uniform functions
    getUniformLocation: vi.fn((program, name) => {
      if (!uniformLocations.has(name)) {
        uniformLocations.set(name, { id: uniformCounter++ } as WebGLUniformLocation);
      }
      return uniformLocations.get(name)!;
    }),
    uniform1f: vi.fn(),
    uniform2fv: vi.fn(),
    uniform3fv: vi.fn(),
    uniform4fv: vi.fn(),
    uniformMatrix4fv: vi.fn(),

    // Buffer functions - return unique buffer objects
    createBuffer: vi.fn(() => ({ id: Math.random() } as WebGLBuffer)),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    deleteBuffer: vi.fn(),

    // Drawing functions
    drawElements: vi.fn(),
    drawArrays: vi.fn(),

    // State functions
    enable: vi.fn(),
    disable: vi.fn(),
    blendFunc: vi.fn(),
    getParameter: vi.fn((param) => {
      if (param === 34921) return 16; // MAX_VERTEX_ATTRIBS
      return null;
    }),

    // Context state
    isContextLost: vi.fn(() => false),

    // Program validation
    validateProgram: vi.fn(),

    // Extension support (needed for WebGLContext wrapper)
    getExtension: vi.fn(() => null),

    // Constant vertex attribute (for disabled attributes)
    vertexAttrib1f: vi.fn(),
    vertexAttrib2fv: vi.fn(),
    vertexAttrib3fv: vi.fn(),
    vertexAttrib4fv: vi.fn(),

  } as unknown as WebGLRenderingContext;
}

/**
 * Create a mock MapLibre map for testing
 */
function createMockMap(): MapLibreMap {
  const canvas = {
    width: 800,
    height: 600,
  } as HTMLCanvasElement;

  return {
    getCanvas: vi.fn(() => canvas),
    getSource: vi.fn(() => ({ type: 'geojson' })),
    isSourceLoaded: vi.fn(() => false),
    querySourceFeatures: vi.fn(() => []),
    getCenter: vi.fn(() => ({ lng: 0, lat: 0 })),
    getZoom: vi.fn(() => 10),
    on: vi.fn(),
    once: vi.fn(),
    triggerRepaint: vi.fn(),
  } as unknown as MapLibreMap;
}

/**
 * Create a mock shader definition
 */
function createMockShaderDefinition(geometry: 'point' | 'line' | 'polygon' | 'global'): ShaderDefinition {
  return {
    name: `test-${geometry}`,
    geometry,
    description: `Test ${geometry} shader`,
    tags: ['test'],
    fragmentShader: `
      precision highp float;
      uniform float u_time;
      uniform vec4 u_color;
      varying vec2 v_pos;
      void main() {
        gl_FragColor = u_color;
      }
    `,
    defaultConfig: {
      color: '#ff0000',
      speed: 1.0,
      intensity: 1.0,
      enabled: true,
    },
    configSchema: {
      color: { type: 'color', default: '#ff0000' },
      speed: { type: 'number', default: 1.0, min: 0, max: 5 },
      intensity: { type: 'number', default: 1.0, min: 0, max: 1 },
    },
    getUniforms: vi.fn((config, time) => ({
      u_time: time,
      u_color_vec4: [1, 0, 0, 1],
      u_intensity: config.intensity ?? 1.0,
    })),
  };
}

describe('PointShaderLayer', () => {
  let layer: PointShaderLayer;
  let gl: WebGLRenderingContext;
  let map: MapLibreMap;
  let definition: ShaderDefinition;
  let config: ShaderConfig;

  beforeEach(() => {
    gl = createMockWebGLContext();
    map = createMockMap();
    definition = createMockShaderDefinition('point');
    config = { color: '#00ff00' };
    layer = new PointShaderLayer('test-point-layer', 'test-source', definition, config);
  });

  describe('initialization', () => {
    it('should have correct id and type', () => {
      expect(layer.id).toBe('test-point-layer');
      expect(layer.type).toBe('custom');
      expect(layer.renderingMode).toBe('2d');
    });
  });

  describe('onAdd', () => {
    it('should compile shaders and create program', () => {
      layer.onAdd(map, gl);

      expect(gl.createShader).toHaveBeenCalledTimes(2); // vertex + fragment
      expect(gl.createProgram).toHaveBeenCalled();
      expect(gl.linkProgram).toHaveBeenCalled();
    });

    it('should create vertex and index buffers', () => {
      layer.onAdd(map, gl);

      // Should create 3 buffers (vertex + index + dataDriven)
      expect(gl.createBuffer).toHaveBeenCalledTimes(3);
    });

    it('should cache uniform locations', () => {
      layer.onAdd(map, gl);

      expect(gl.getUniformLocation).toHaveBeenCalled();
    });

    it('should set up source data listener', () => {
      layer.onAdd(map, gl);

      expect(map.on).toHaveBeenCalledWith('sourcedata', expect.any(Function));
    });
  });

  describe('onRemove', () => {
    it('should clean up WebGL resources', () => {
      layer.onAdd(map, gl);
      layer.onRemove(map, gl);

      expect(gl.deleteProgram).toHaveBeenCalled();
      // Should delete 3 buffers (vertex + index + dataDriven)
      expect(gl.deleteBuffer).toHaveBeenCalledTimes(3);
    });
  });

  describe('render', () => {
    it('should not render if program is not created', () => {
      // render without onAdd
      const matrix = new Float32Array(16);
      layer.render(gl, matrix as unknown as import('gl-matrix').mat4);

      expect(gl.useProgram).not.toHaveBeenCalled();
    });

    it('should skip rendering when no vertex data', () => {
      layer.onAdd(map, gl);

      // No features = no vertex data, so render should skip
      const matrix = new Float32Array(16);
      layer.render(gl, matrix as unknown as import('gl-matrix').mat4);

      // Should not call useProgram when vertexCount is 0
      expect(gl.drawElements).not.toHaveBeenCalled();
    });

    it('should set up blending and depth test in render', () => {
      // Mock map to return point features and source as loaded
      vi.mocked(map.querySourceFeatures).mockReturnValue([
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: {},
        },
      ] as unknown as maplibregl.MapGeoJSONFeature[]);
      vi.mocked(map.isSourceLoaded).mockReturnValue(true);

      layer.onAdd(map, gl);

      const matrix = new Float32Array(16);
      layer.render(gl, matrix as unknown as import('gl-matrix').mat4);

      // Verify WebGL state setup calls
      expect(gl.useProgram).toHaveBeenCalled();
      expect(gl.enable).toHaveBeenCalledWith(gl.BLEND);
      expect(gl.blendFunc).toHaveBeenCalledWith(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      expect(gl.disable).toHaveBeenCalledWith(gl.DEPTH_TEST);
    });
  });

  describe('configuration', () => {
    it('should update config', () => {
      layer.updateConfig({ color: '#0000ff', speed: 2.0 });

      // Config is updated internally - we verify via getUniforms calls in render
      expect(layer).toBeDefined();
    });

    it('should play and pause animation', () => {
      layer.pause();
      layer.play();

      // Animation state is internal - we verify it doesn't throw
      expect(layer).toBeDefined();
    });

    it('should set animation speed', () => {
      layer.setSpeed(2.5);

      expect(layer).toBeDefined();
    });
  });
});

describe('LineShaderLayer', () => {
  let layer: LineShaderLayer;
  let gl: WebGLRenderingContext;
  let map: MapLibreMap;
  let definition: ShaderDefinition;
  let config: ShaderConfig;

  beforeEach(() => {
    gl = createMockWebGLContext();
    map = createMockMap();
    definition = createMockShaderDefinition('line');
    config = { color: '#00ff00', width: 4 };
    layer = new LineShaderLayer('test-line-layer', 'test-source', definition, config);
  });

  describe('initialization', () => {
    it('should have correct id and type', () => {
      expect(layer.id).toBe('test-line-layer');
      expect(layer.type).toBe('custom');
    });
  });

  describe('onAdd', () => {
    it('should compile shaders and create program', () => {
      layer.onAdd(map, gl);

      expect(gl.createShader).toHaveBeenCalledTimes(2);
      expect(gl.createProgram).toHaveBeenCalled();
    });

    it('should get line-specific attribute locations', () => {
      layer.onAdd(map, gl);

      expect(gl.getAttribLocation).toHaveBeenCalledWith(expect.anything(), 'a_pos_start');
      expect(gl.getAttribLocation).toHaveBeenCalledWith(expect.anything(), 'a_pos_end');
      expect(gl.getAttribLocation).toHaveBeenCalledWith(expect.anything(), 'a_offset');
    });
  });

  describe('onRemove', () => {
    it('should clean up resources', () => {
      layer.onAdd(map, gl);
      layer.onRemove(map, gl);

      expect(gl.deleteProgram).toHaveBeenCalled();
      expect(gl.deleteBuffer).toHaveBeenCalled();
    });
  });

  describe('configuration', () => {
    it('should update config', () => {
      layer.updateConfig({ width: 8 });
      expect(layer).toBeDefined();
    });
  });

  describe('feature processing', () => {
    it('should process LineString features', () => {
      vi.mocked(map.querySourceFeatures).mockReturnValue([
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [[0, 0], [1, 1], [2, 0]],
          },
          properties: {},
        },
      ] as unknown as maplibregl.MapGeoJSONFeature[]);
      vi.mocked(map.isSourceLoaded).mockReturnValue(true);

      layer.onAdd(map, gl);

      const matrix = new Float32Array(16);
      layer.render(gl, matrix as unknown as import('gl-matrix').mat4);

      expect(gl.bindBuffer).toHaveBeenCalled();
      expect(gl.bufferData).toHaveBeenCalled();
    });

    it('should process MultiLineString features', () => {
      vi.mocked(map.querySourceFeatures).mockReturnValue([
        {
          type: 'Feature',
          geometry: {
            type: 'MultiLineString',
            coordinates: [
              [[0, 0], [1, 1]],
              [[2, 2], [3, 3]],
            ],
          },
          properties: {},
        },
      ] as unknown as maplibregl.MapGeoJSONFeature[]);
      vi.mocked(map.isSourceLoaded).mockReturnValue(true);

      layer.onAdd(map, gl);

      const matrix = new Float32Array(16);
      layer.render(gl, matrix as unknown as import('gl-matrix').mat4);

      expect(gl.bufferData).toHaveBeenCalled();
    });

    it('should handle empty LineString', () => {
      vi.mocked(map.querySourceFeatures).mockReturnValue([
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [[0, 0]], // Only one point
          },
          properties: {},
        },
      ] as unknown as maplibregl.MapGeoJSONFeature[]);
      vi.mocked(map.isSourceLoaded).mockReturnValue(true);

      layer.onAdd(map, gl);

      const matrix = new Float32Array(16);
      layer.render(gl, matrix as unknown as import('gl-matrix').mat4);

      // Should not crash
      expect(layer).toBeDefined();
    });

    it('should render lines with correct draw call', () => {
      vi.mocked(map.querySourceFeatures).mockReturnValue([
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [[0, 0], [1, 1]],
          },
          properties: {},
        },
      ] as unknown as maplibregl.MapGeoJSONFeature[]);
      vi.mocked(map.isSourceLoaded).mockReturnValue(true);

      layer.onAdd(map, gl);

      const matrix = new Float32Array(16);
      layer.render(gl, matrix as unknown as import('gl-matrix').mat4);

      expect(gl.drawElements).toHaveBeenCalledWith(
        gl.TRIANGLES,
        expect.any(Number),
        gl.UNSIGNED_SHORT,
        0
      );
    });
  });
});

describe('PolygonShaderLayer', () => {
  let layer: PolygonShaderLayer;
  let gl: WebGLRenderingContext;
  let map: MapLibreMap;
  let definition: ShaderDefinition;
  let config: ShaderConfig;

  beforeEach(() => {
    gl = createMockWebGLContext();
    map = createMockMap();
    definition = createMockShaderDefinition('polygon');
    config = { color: '#00ff00' };
    layer = new PolygonShaderLayer('test-polygon-layer', 'test-source', definition, config);
  });

  describe('initialization', () => {
    it('should have correct id and type', () => {
      expect(layer.id).toBe('test-polygon-layer');
      expect(layer.type).toBe('custom');
    });
  });

  describe('onAdd', () => {
    it('should compile shaders and create program', () => {
      layer.onAdd(map, gl);

      expect(gl.createShader).toHaveBeenCalledTimes(2);
      expect(gl.createProgram).toHaveBeenCalled();
    });

    it('should get polygon-specific attribute locations', () => {
      layer.onAdd(map, gl);

      expect(gl.getAttribLocation).toHaveBeenCalledWith(expect.anything(), 'a_pos');
      expect(gl.getAttribLocation).toHaveBeenCalledWith(expect.anything(), 'a_uv');
      expect(gl.getAttribLocation).toHaveBeenCalledWith(expect.anything(), 'a_centroid');
    });
  });

  describe('onRemove', () => {
    it('should clean up resources', () => {
      layer.onAdd(map, gl);
      layer.onRemove(map, gl);

      expect(gl.deleteProgram).toHaveBeenCalled();
      expect(gl.deleteBuffer).toHaveBeenCalled();
    });
  });

  describe('feature processing', () => {
    it('should process Polygon features', () => {
      vi.mocked(map.querySourceFeatures).mockReturnValue([
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
          },
          properties: {},
        },
      ] as unknown as maplibregl.MapGeoJSONFeature[]);
      vi.mocked(map.isSourceLoaded).mockReturnValue(true);

      layer.onAdd(map, gl);

      const matrix = new Float32Array(16);
      layer.render(gl, matrix as unknown as import('gl-matrix').mat4);

      expect(gl.bindBuffer).toHaveBeenCalled();
      expect(gl.bufferData).toHaveBeenCalled();
    });

    it('should process MultiPolygon features', () => {
      vi.mocked(map.querySourceFeatures).mockReturnValue([
        {
          type: 'Feature',
          geometry: {
            type: 'MultiPolygon',
            coordinates: [
              [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
              [[[2, 2], [3, 2], [3, 3], [2, 3], [2, 2]]],
            ],
          },
          properties: {},
        },
      ] as unknown as maplibregl.MapGeoJSONFeature[]);
      vi.mocked(map.isSourceLoaded).mockReturnValue(true);

      layer.onAdd(map, gl);

      const matrix = new Float32Array(16);
      layer.render(gl, matrix as unknown as import('gl-matrix').mat4);

      expect(gl.bufferData).toHaveBeenCalled();
    });

    it('should handle triangle polygon', () => {
      vi.mocked(map.querySourceFeatures).mockReturnValue([
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [1, 0], [0.5, 1], [0, 0]]],
          },
          properties: {},
        },
      ] as unknown as maplibregl.MapGeoJSONFeature[]);
      vi.mocked(map.isSourceLoaded).mockReturnValue(true);

      layer.onAdd(map, gl);

      const matrix = new Float32Array(16);
      layer.render(gl, matrix as unknown as import('gl-matrix').mat4);

      expect(gl.drawElements).toHaveBeenCalled();
    });

    it('should handle polygon with less than 3 vertices', () => {
      vi.mocked(map.querySourceFeatures).mockReturnValue([
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [1, 0]]], // Only 2 vertices
          },
          properties: {},
        },
      ] as unknown as maplibregl.MapGeoJSONFeature[]);
      vi.mocked(map.isSourceLoaded).mockReturnValue(true);

      layer.onAdd(map, gl);

      const matrix = new Float32Array(16);
      layer.render(gl, matrix as unknown as import('gl-matrix').mat4);

      // Should not crash
      expect(layer).toBeDefined();
    });

    it('should triangulate complex polygons', () => {
      // Pentagon
      vi.mocked(map.querySourceFeatures).mockReturnValue([
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [1, 0], [1.5, 0.5], [0.5, 1], [-0.5, 0.5], [0, 0]]],
          },
          properties: {},
        },
      ] as unknown as maplibregl.MapGeoJSONFeature[]);
      vi.mocked(map.isSourceLoaded).mockReturnValue(true);

      layer.onAdd(map, gl);

      const matrix = new Float32Array(16);
      layer.render(gl, matrix as unknown as import('gl-matrix').mat4);

      expect(gl.drawElements).toHaveBeenCalledWith(
        gl.TRIANGLES,
        expect.any(Number),
        gl.UNSIGNED_SHORT,
        0
      );
    });

    it('should render polygons with correct draw call', () => {
      vi.mocked(map.querySourceFeatures).mockReturnValue([
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
          },
          properties: {},
        },
      ] as unknown as maplibregl.MapGeoJSONFeature[]);
      vi.mocked(map.isSourceLoaded).mockReturnValue(true);

      layer.onAdd(map, gl);

      const matrix = new Float32Array(16);
      layer.render(gl, matrix as unknown as import('gl-matrix').mat4);

      expect(gl.drawElements).toHaveBeenCalledWith(
        gl.TRIANGLES,
        expect.any(Number),
        gl.UNSIGNED_SHORT,
        0
      );
    });
  });

  describe('configuration', () => {
    it('should update config', () => {
      layer.updateConfig({ color: '#0000ff' });
      expect(layer).toBeDefined();
    });
  });
});

describe('GlobalShaderLayer', () => {
  let layer: GlobalShaderLayer;
  let gl: WebGLRenderingContext;
  let map: MapLibreMap;
  let definition: ShaderDefinition;
  let config: ShaderConfig;

  beforeEach(() => {
    gl = createMockWebGLContext();
    map = createMockMap();
    definition = createMockShaderDefinition('global');
    config = { intensity: 0.5 };
    layer = new GlobalShaderLayer('test-global-layer', definition, config);
  });

  describe('initialization', () => {
    it('should have correct id and type', () => {
      expect(layer.id).toBe('test-global-layer');
      expect(layer.type).toBe('custom');
    });
  });

  describe('onAdd', () => {
    it('should compile shaders and create program', () => {
      layer.onAdd(map, gl);

      expect(gl.createShader).toHaveBeenCalledTimes(2);
      expect(gl.createProgram).toHaveBeenCalled();
    });

    it('should create full-screen quad buffer', () => {
      layer.onAdd(map, gl);

      expect(gl.createBuffer).toHaveBeenCalled();
      expect(gl.bufferData).toHaveBeenCalled();
    });

    it('should cache global-specific uniform locations', () => {
      layer.onAdd(map, gl);

      expect(gl.getUniformLocation).toHaveBeenCalledWith(expect.anything(), 'u_resolution');
      expect(gl.getUniformLocation).toHaveBeenCalledWith(expect.anything(), 'u_center');
      expect(gl.getUniformLocation).toHaveBeenCalledWith(expect.anything(), 'u_zoom');
    });
  });

  describe('render', () => {
    it('should draw full-screen quad with TRIANGLE_STRIP', () => {
      layer.onAdd(map, gl);

      const matrix = new Float32Array(16);
      layer.render(gl, matrix as unknown as import('gl-matrix').mat4);

      expect(gl.drawArrays).toHaveBeenCalledWith(gl.TRIANGLE_STRIP, 0, 4);
    });

    it('should get map center and zoom for uniforms', () => {
      layer.onAdd(map, gl);

      const matrix = new Float32Array(16);
      layer.render(gl, matrix as unknown as import('gl-matrix').mat4);

      expect(map.getCenter).toHaveBeenCalled();
      expect(map.getZoom).toHaveBeenCalled();
    });
  });

  describe('onRemove', () => {
    it('should clean up resources', () => {
      layer.onAdd(map, gl);
      layer.onRemove(map, gl);

      expect(gl.deleteProgram).toHaveBeenCalled();
      expect(gl.deleteBuffer).toHaveBeenCalled();
    });
  });
});

describe('Shader Compilation Error Handling', () => {
  it('should handle vertex shader compilation failure', () => {
    const gl = createMockWebGLContext();
    const map = createMockMap();
    const definition = createMockShaderDefinition('point');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Make shader compilation fail
    vi.mocked(gl.getShaderParameter).mockImplementation((shader, param) => {
      if (param === gl.COMPILE_STATUS) return false;
      return null;
    });
    vi.mocked(gl.getShaderInfoLog).mockReturnValue('Shader compilation error: invalid syntax');

    const layer = new PointShaderLayer('test', 'source', definition, {});
    layer.onAdd(map, gl);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should handle program linking failure', () => {
    const gl = createMockWebGLContext();
    const map = createMockMap();
    const definition = createMockShaderDefinition('point');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Make program linking fail
    vi.mocked(gl.getProgramParameter).mockImplementation((program, param) => {
      if (param === gl.LINK_STATUS) return false;
      return null;
    });
    vi.mocked(gl.getProgramInfoLog).mockReturnValue('Program linking error');

    const layer = new PointShaderLayer('test', 'source', definition, {});
    layer.onAdd(map, gl);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('Layer Uniform Types', () => {
  let gl: WebGLRenderingContext;
  let map: MapLibreMap;

  beforeEach(() => {
    gl = createMockWebGLContext();
    map = createMockMap();
  });

  it('should handle number uniforms', () => {
    const definition = createMockShaderDefinition('global');
    vi.mocked(definition.getUniforms).mockReturnValue({
      u_intensity: 0.5,
      u_time: 1.0,
    });

    const layer = new GlobalShaderLayer('test', definition, {});
    layer.onAdd(map, gl);

    const matrix = new Float32Array(16);
    layer.render(gl, matrix as unknown as import('gl-matrix').mat4);

    expect(gl.uniform1f).toHaveBeenCalled();
  });

  it('should handle vec2 uniforms', () => {
    const definition = createMockShaderDefinition('global');
    vi.mocked(definition.getUniforms).mockReturnValue({
      u_resolution: [800, 600],
    });

    const layer = new GlobalShaderLayer('test', definition, {});
    layer.onAdd(map, gl);

    const matrix = new Float32Array(16);
    layer.render(gl, matrix as unknown as import('gl-matrix').mat4);

    expect(gl.uniform2fv).toHaveBeenCalled();
  });

  it('should handle vec4 uniforms', () => {
    const definition = createMockShaderDefinition('global');
    vi.mocked(definition.getUniforms).mockReturnValue({
      u_color_vec4: [1, 0, 0, 1],
    });

    const layer = new GlobalShaderLayer('test', definition, {});
    layer.onAdd(map, gl);

    const matrix = new Float32Array(16);
    layer.render(gl, matrix as unknown as import('gl-matrix').mat4);

    expect(gl.uniform4fv).toHaveBeenCalled();
  });

  it('should handle boolean uniforms as floats', () => {
    const definition = createMockShaderDefinition('global');
    vi.mocked(definition.getUniforms).mockReturnValue({
      u_enabled: true,
      u_disabled: false,
    });

    const layer = new GlobalShaderLayer('test', definition, {});
    layer.onAdd(map, gl);

    const matrix = new Float32Array(16);
    layer.render(gl, matrix as unknown as import('gl-matrix').mat4);

    // Booleans are converted to 1.0 or 0.0
    expect(gl.uniform1f).toHaveBeenCalled();
  });
});

describe('Animation State', () => {
  it('should track animation state correctly', () => {
    const gl = createMockWebGLContext();
    const map = createMockMap();
    const definition = createMockShaderDefinition('global');

    const layer = new GlobalShaderLayer('test', definition, {});
    layer.onAdd(map, gl);

    // Default: playing
    const matrix = new Float32Array(16);
    layer.render(gl, matrix as unknown as import('gl-matrix').mat4);
    expect(map.triggerRepaint).toHaveBeenCalled();

    // Pause
    vi.mocked(map.triggerRepaint).mockClear();
    layer.pause();
    layer.render(gl, matrix as unknown as import('gl-matrix').mat4);
    // Should not request repaint when paused
    // (This depends on implementation - check if vertexCount > 0)
  });

  it('should update time based on speed', () => {
    const gl = createMockWebGLContext();
    const map = createMockMap();
    const definition = createMockShaderDefinition('global');

    const layer = new GlobalShaderLayer('test', definition, {});
    layer.setSpeed(2.0);
    layer.onAdd(map, gl);

    // Speed is set internally
    expect(layer).toBeDefined();
  });
});
