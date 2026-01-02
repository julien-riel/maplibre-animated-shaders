/**
 * Benchmark setup - mocks and utilities for performance testing
 */

// Mock requestAnimationFrame for Node.js environment
let rafId = 0;
const rafCallbacks = new Map<number, FrameRequestCallback>();

global.requestAnimationFrame = (callback: FrameRequestCallback): number => {
  const id = ++rafId;
  rafCallbacks.set(id, callback);
  return id;
};

global.cancelAnimationFrame = (id: number): void => {
  rafCallbacks.delete(id);
};

// Trigger all pending RAF callbacks (for synchronous benchmarking)
export function flushRAF(): void {
  const now = performance.now();
  for (const [id, callback] of rafCallbacks) {
    rafCallbacks.delete(id);
    callback(now);
  }
}

/**
 * Generate mock GeoJSON Point features
 */
export function generatePointFeatures(count: number): GeoJSON.Feature[] {
  const features: GeoJSON.Feature[] = [];
  for (let i = 0; i < count; i++) {
    features.push({
      type: 'Feature',
      id: i,
      properties: {
        id: i,
        name: `Point ${i}`,
        value: Math.random() * 100,
        category: ['A', 'B', 'C'][i % 3],
      },
      geometry: {
        type: 'Point',
        coordinates: [
          -180 + Math.random() * 360, // lng
          -85 + Math.random() * 170,  // lat
        ],
      },
    });
  }
  return features;
}

/**
 * Generate mock GeoJSON LineString features
 */
export function generateLineFeatures(count: number, pointsPerLine: number = 10): GeoJSON.Feature[] {
  const features: GeoJSON.Feature[] = [];
  for (let i = 0; i < count; i++) {
    const startLng = -180 + Math.random() * 360;
    const startLat = -85 + Math.random() * 170;
    const coordinates: number[][] = [];

    for (let j = 0; j < pointsPerLine; j++) {
      coordinates.push([
        startLng + (j * 0.1),
        startLat + (Math.random() - 0.5) * 0.1,
      ]);
    }

    features.push({
      type: 'Feature',
      id: i,
      properties: {
        id: i,
        name: `Line ${i}`,
        length: pointsPerLine,
      },
      geometry: {
        type: 'LineString',
        coordinates,
      },
    });
  }
  return features;
}

/**
 * Generate mock GeoJSON Polygon features
 */
export function generatePolygonFeatures(count: number, verticesPerPolygon: number = 6): GeoJSON.Feature[] {
  const features: GeoJSON.Feature[] = [];
  for (let i = 0; i < count; i++) {
    const centerLng = -180 + Math.random() * 360;
    const centerLat = -85 + Math.random() * 170;
    const radius = 0.05 + Math.random() * 0.1;
    const coordinates: number[][] = [];

    for (let j = 0; j < verticesPerPolygon; j++) {
      const angle = (j / verticesPerPolygon) * Math.PI * 2;
      coordinates.push([
        centerLng + Math.cos(angle) * radius,
        centerLat + Math.sin(angle) * radius,
      ]);
    }
    // Close the polygon
    coordinates.push(coordinates[0]);

    features.push({
      type: 'Feature',
      id: i,
      properties: {
        id: i,
        name: `Polygon ${i}`,
        area: Math.PI * radius * radius,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates],
      },
    });
  }
  return features;
}

/**
 * Create a mock WebGL rendering context
 */
export function createMockWebGLContext(): WebGLRenderingContext {
  let nextId = 1;

  return {
    canvas: { width: 1920, height: 1080 },
    drawingBufferWidth: 1920,
    drawingBufferHeight: 1080,

    // Buffer operations
    createBuffer: () => ({ id: nextId++ }),
    deleteBuffer: () => {},
    bindBuffer: () => {},
    bufferData: () => {},

    // Shader operations
    createShader: () => ({ id: nextId++ }),
    deleteShader: () => {},
    shaderSource: () => {},
    compileShader: () => {},
    getShaderParameter: () => true,
    getShaderInfoLog: () => '',

    // Program operations
    createProgram: () => ({ id: nextId++ }),
    deleteProgram: () => {},
    attachShader: () => {},
    linkProgram: () => {},
    validateProgram: () => {},
    useProgram: () => {},
    getProgramParameter: () => true,
    getProgramInfoLog: () => '',

    // Attribute operations
    getAttribLocation: () => 0,
    enableVertexAttribArray: () => {},
    disableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
    vertexAttrib1f: () => {},
    vertexAttrib2f: () => {},
    vertexAttrib3f: () => {},
    vertexAttrib4f: () => {},

    // Uniform operations
    getUniformLocation: () => ({ id: nextId++ }),
    uniform1f: () => {},
    uniform1i: () => {},
    uniform2f: () => {},
    uniform2fv: () => {},
    uniform3f: () => {},
    uniform3fv: () => {},
    uniform4f: () => {},
    uniform4fv: () => {},
    uniformMatrix2fv: () => {},
    uniformMatrix3fv: () => {},
    uniformMatrix4fv: () => {},

    // Drawing
    drawArrays: () => {},
    drawElements: () => {},
    clear: () => {},
    clearColor: () => {},
    viewport: () => {},

    // State
    enable: () => {},
    disable: () => {},
    blendFunc: () => {},
    blendFuncSeparate: () => {},
    depthFunc: () => {},
    depthMask: () => {},
    cullFace: () => {},
    frontFace: () => {},
    getParameter: () => 16,
    getExtension: () => null,
    isContextLost: () => false,
    getError: () => 0,

    // Texture operations
    createTexture: () => ({ id: nextId++ }),
    deleteTexture: () => {},
    bindTexture: () => {},
    texImage2D: () => {},
    texParameteri: () => {},
    activeTexture: () => {},

    // Framebuffer operations
    createFramebuffer: () => ({ id: nextId++ }),
    deleteFramebuffer: () => {},
    bindFramebuffer: () => {},
    framebufferTexture2D: () => {},
    checkFramebufferStatus: () => 36053, // FRAMEBUFFER_COMPLETE

    // Renderbuffer operations
    createRenderbuffer: () => ({ id: nextId++ }),
    deleteRenderbuffer: () => {},
    bindRenderbuffer: () => {},
    renderbufferStorage: () => {},
    framebufferRenderbuffer: () => {},

    // Constants
    ARRAY_BUFFER: 34962,
    ELEMENT_ARRAY_BUFFER: 34963,
    STATIC_DRAW: 35044,
    DYNAMIC_DRAW: 35048,
    STREAM_DRAW: 35040,
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    VALIDATE_STATUS: 35715,
    FLOAT: 5126,
    UNSIGNED_BYTE: 5121,
    UNSIGNED_SHORT: 5123,
    UNSIGNED_INT: 5125,
    TRIANGLES: 4,
    TRIANGLE_STRIP: 5,
    TRIANGLE_FAN: 6,
    LINES: 1,
    LINE_STRIP: 3,
    POINTS: 0,
    BLEND: 3042,
    DEPTH_TEST: 2929,
    CULL_FACE: 2884,
    SRC_ALPHA: 770,
    ONE_MINUS_SRC_ALPHA: 771,
    ONE: 1,
    ZERO: 0,
    MAX_VERTEX_ATTRIBS: 34921,
    TEXTURE_2D: 3553,
    TEXTURE0: 33984,
    RGBA: 6408,
    FRAMEBUFFER: 36160,
    RENDERBUFFER: 36161,
    DEPTH_COMPONENT16: 33189,
    DEPTH_ATTACHMENT: 36096,
    COLOR_ATTACHMENT0: 36064,
    NO_ERROR: 0,
  } as unknown as WebGLRenderingContext;
}

/**
 * Create a mock MapLibre Map instance
 */
export function createMockMap(features: GeoJSON.Feature[] = []) {
  const sources = new Map<string, { type: string; data: GeoJSON.FeatureCollection }>();
  const layers: Map<string, object> = new Map();

  return {
    getCanvas: () => ({ width: 1920, height: 1080 }),
    getZoom: () => 10,
    getCenter: () => ({ lng: 0, lat: 0 }),
    getBounds: () => ({
      getWest: () => -180,
      getEast: () => 180,
      getNorth: () => 85,
      getSouth: () => -85,
    }),
    getSource: (id: string) => sources.get(id) || null,
    addSource: (id: string, source: { type: string; data: GeoJSON.FeatureCollection }) => {
      sources.set(id, source);
    },
    removeSource: (id: string) => sources.delete(id),
    isSourceLoaded: () => true,
    querySourceFeatures: () => features,
    addLayer: (layer: { id: string }) => layers.set(layer.id, layer),
    removeLayer: (id: string) => layers.delete(id),
    getLayer: (id: string) => layers.get(id),
    triggerRepaint: () => {},
    on: () => {},
    off: () => {},
    once: (_event: string, callback: () => void) => callback(),
  };
}
