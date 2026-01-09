/**
 * PluginStore - Central state management for the playground
 */

import type {
  PlaygroundState,
  PlaygroundEventType,
  PlaygroundEventPayload,
  PlaygroundListener,
  ShaderDraft,
  PluginMetadata,
  UIState,
  PresetConfig,
  CompilationError,
} from './types';
import type { GeometryType, ConfigSchema } from 'maplibre-animated-shaders';

/**
 * Default fragment shader template for each geometry type
 */
const DEFAULT_FRAGMENT_SHADERS: Record<GeometryType, string> = {
  point: `precision highp float;

#include <shapes>

varying vec2 v_pos;
varying float v_effectiveTime;
varying vec4 v_color;

uniform float u_speed;

void main() {
    float dist = length(v_pos);
    float pulse = sin(v_effectiveTime * u_speed * 3.0) * 0.5 + 0.5;
    float alpha = smoothstep(1.0, 0.0, dist) * pulse;

    gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
}`,

  line: `precision highp float;

varying vec2 v_pos;
varying float v_progress;
varying float v_effectiveTime;
varying vec4 v_color;

uniform float u_speed;
uniform float u_dashLength;

void main() {
    float flow = fract(v_progress * u_dashLength - v_effectiveTime * u_speed);
    float edgeFade = 1.0 - abs(v_pos.y);
    float alpha = flow * edgeFade;

    gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
}`,

  polygon: `precision highp float;

#include <noise>

varying vec2 v_uv;
varying float v_effectiveTime;
varying vec4 v_color;

uniform float u_speed;
uniform float u_scale;

void main() {
    vec2 uv = v_uv * u_scale;
    float n = snoise(vec3(uv, v_effectiveTime * u_speed));
    float alpha = n * 0.5 + 0.5;

    gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
}`,

  global: `precision highp float;

varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;

void main() {
    vec2 center = v_uv - 0.5;
    float vignette = 1.0 - length(center) * 1.5;
    float alpha = (1.0 - vignette) * u_intensity * 0.3;

    gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
}`,
};

/**
 * Default config schema for new shaders
 */
const DEFAULT_CONFIG_SCHEMA: ConfigSchema = {
  speed: {
    type: 'number',
    default: 1.0,
    min: 0.1,
    max: 5.0,
    step: 0.1,
    label: 'Speed',
    description: 'Animation speed multiplier',
  },
  intensity: {
    type: 'number',
    default: 1.0,
    min: 0,
    max: 1,
    step: 0.1,
    label: 'Intensity',
    description: 'Effect intensity',
  },
  enabled: {
    type: 'boolean',
    default: true,
    label: 'Enabled',
    description: 'Enable or disable the effect',
  },
};

/**
 * Create a new shader draft
 */
function createShaderDraft(geometry: GeometryType): ShaderDraft {
  return {
    geometry,
    name: geometry,
    displayName: `${geometry.charAt(0).toUpperCase()}${geometry.slice(1)} Shader`,
    description: `Animated ${geometry} shader effect`,
    tags: [geometry, 'animation'],
    vertexShader: null,
    fragmentShader: DEFAULT_FRAGMENT_SHADERS[geometry],
    configSchema: { ...DEFAULT_CONFIG_SCHEMA },
    defaultConfig: {
      speed: 1.0,
      intensity: 1.0,
      enabled: true,
    },
    uniformsMapping: {
      u_speed: 'config.speed',
      u_intensity: 'config.intensity',
    },
  };
}

/**
 * Create initial state
 */
function createInitialState(): PlaygroundState {
  return {
    metadata: {
      name: 'my-shader-plugin',
      version: '1.0.0',
      author: '',
      description: 'A custom shader plugin for MapLibre Animated Shaders',
      homepage: '',
      license: 'MIT',
      keywords: ['maplibre', 'shader', 'animation'],
    },
    currentShader: 'point',
    shaders: {
      point: createShaderDraft('point'),
      line: null,
      polygon: null,
      global: null,
    },
    presets: {},
    ui: {
      activeTab: 'editor',
      activeShaderTab: 'fragment',
      previewPlaying: true,
      previewSpeed: 1.0,
      compilationErrors: [],
      isDirty: false,
      showSaveDialog: false,
      showLoadDialog: false,
    },
  };
}

/**
 * PluginStore class - manages playground state
 */
export class PluginStore {
  private state: PlaygroundState;
  private listeners: Map<PlaygroundEventType, Set<PlaygroundListener<PlaygroundEventType>>>;

  constructor() {
    this.state = createInitialState();
    this.listeners = new Map();
  }

  /**
   * Get current state (readonly)
   */
  getState(): Readonly<PlaygroundState> {
    return this.state;
  }

  /**
   * Get current shader draft
   */
  getCurrentShader(): ShaderDraft | null {
    return this.state.shaders[this.state.currentShader];
  }

  /**
   * Subscribe to state changes
   */
  on<T extends PlaygroundEventType>(event: T, listener: PlaygroundListener<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as PlaygroundListener<PlaygroundEventType>);

    return () => {
      this.listeners.get(event)?.delete(listener as PlaygroundListener<PlaygroundEventType>);
    };
  }

  /**
   * Emit an event
   */
  private emit<T extends PlaygroundEventType>(event: T, payload: PlaygroundEventPayload[T]): void {
    this.listeners.get(event)?.forEach((listener) => listener(payload));
  }

  /**
   * Update state and notify listeners
   */
  private updateState(updater: (state: PlaygroundState) => void): void {
    updater(this.state);
    this.state.ui.isDirty = true;
    this.emit('state:changed', { state: this.state });
  }

  /**
   * Set current geometry type
   */
  setCurrentShader(geometry: GeometryType): void {
    this.updateState((state) => {
      state.currentShader = geometry;
      if (!state.shaders[geometry]) {
        state.shaders[geometry] = createShaderDraft(geometry);
      }
    });
  }

  /**
   * Update fragment shader code
   */
  updateFragmentShader(code: string): void {
    this.updateState((state) => {
      const shader = state.shaders[state.currentShader];
      if (shader) {
        shader.fragmentShader = code;
      }
    });
  }

  /**
   * Update vertex shader code
   */
  updateVertexShader(code: string | null): void {
    this.updateState((state) => {
      const shader = state.shaders[state.currentShader];
      if (shader) {
        shader.vertexShader = code;
      }
    });
  }

  /**
   * Update shader metadata
   */
  updateShaderMetadata(
    updates: Partial<Pick<ShaderDraft, 'name' | 'displayName' | 'description' | 'tags'>>
  ): void {
    this.updateState((state) => {
      const shader = state.shaders[state.currentShader];
      if (shader) {
        Object.assign(shader, updates);
      }
    });
  }

  /**
   * Update config schema
   */
  updateConfigSchema(schema: ConfigSchema): void {
    this.updateState((state) => {
      const shader = state.shaders[state.currentShader];
      if (shader) {
        shader.configSchema = schema;
      }
    });
  }

  /**
   * Update default config
   */
  updateDefaultConfig(config: Record<string, unknown>): void {
    this.updateState((state) => {
      const shader = state.shaders[state.currentShader];
      if (shader) {
        shader.defaultConfig = config;
      }
    });
  }

  /**
   * Update uniforms mapping
   */
  updateUniformsMapping(mapping: Record<string, string>): void {
    this.updateState((state) => {
      const shader = state.shaders[state.currentShader];
      if (shader) {
        shader.uniformsMapping = mapping;
      }
    });
  }

  /**
   * Update plugin metadata
   */
  updateMetadata(updates: Partial<PluginMetadata>): void {
    this.updateState((state) => {
      Object.assign(state.metadata, updates);
    });
  }

  /**
   * Set compilation errors
   */
  setCompilationErrors(errors: CompilationError[]): void {
    this.updateState((state) => {
      state.ui.compilationErrors = errors;
    });
    if (errors.length > 0) {
      this.emit('shader:error', { errors });
    }
  }

  /**
   * Set active UI tab
   */
  setActiveTab(tab: UIState['activeTab']): void {
    this.updateState((state) => {
      state.ui.activeTab = tab;
    });
    this.emit('ui:tab-changed', { tab });
  }

  /**
   * Set active shader tab (fragment/vertex)
   */
  setActiveShaderTab(tab: 'fragment' | 'vertex'): void {
    this.updateState((state) => {
      state.ui.activeShaderTab = tab;
    });
  }

  /**
   * Toggle preview playback
   */
  togglePreviewPlayback(): void {
    this.updateState((state) => {
      state.ui.previewPlaying = !state.ui.previewPlaying;
    });
  }

  /**
   * Set preview playing state
   */
  setPreviewPlaying(playing: boolean): void {
    this.updateState((state) => {
      state.ui.previewPlaying = playing;
    });
  }

  /**
   * Set preview speed
   */
  setPreviewSpeed(speed: number): void {
    this.updateState((state) => {
      state.ui.previewSpeed = speed;
    });
  }

  /**
   * Add a preset
   */
  addPreset(name: string, preset: PresetConfig): void {
    this.updateState((state) => {
      state.presets[name] = preset;
    });
  }

  /**
   * Remove a preset
   */
  removePreset(name: string): void {
    this.updateState((state) => {
      delete state.presets[name];
    });
  }

  /**
   * Mark state as clean (after save)
   */
  markClean(): void {
    this.state.ui.isDirty = false;
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.state = createInitialState();
    this.emit('state:changed', { state: this.state });
  }

  /**
   * Load state from project file
   */
  loadFromProject(state: PlaygroundState): void {
    this.state = state;
    this.emit('state:changed', { state: this.state });
    this.emit('project:loaded', { filename: state.metadata.name });
  }
}

/**
 * Global store instance
 */
export const store = new PluginStore();
