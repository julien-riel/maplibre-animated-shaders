/**
 * Playground State Types
 */

import type { GeometryType, ConfigSchema } from 'maplibre-animated-shaders';

/**
 * Plugin metadata for npm package
 */
export interface PluginMetadata {
  name: string;
  version: string;
  author: string;
  description: string;
  homepage: string;
  license: string;
  keywords: string[];
}

/**
 * Shader draft being edited
 */
export interface ShaderDraft {
  geometry: GeometryType;
  name: string;
  displayName: string;
  description: string;
  tags: string[];
  vertexShader: string | null;
  fragmentShader: string;
  configSchema: ConfigSchema;
  defaultConfig: Record<string, unknown>;
  uniformsMapping: Record<string, string>;
}

/**
 * Preset configuration
 */
export interface PresetConfig {
  shader: string;
  config: Record<string, unknown>;
}

/**
 * Compilation error from WebGL
 */
export interface CompilationError {
  type: 'error' | 'warning';
  line: number;
  column?: number;
  message: string;
  source: 'vertex' | 'fragment';
}

/**
 * UI state
 */
export interface UIState {
  activeTab: 'editor' | 'schema' | 'metadata' | 'presets' | 'export';
  activeShaderTab: 'fragment' | 'vertex';
  previewPlaying: boolean;
  previewSpeed: number;
  compilationErrors: CompilationError[];
  isDirty: boolean;
  showSaveDialog: boolean;
  showLoadDialog: boolean;
}

/**
 * Editor state for session restore
 */
export interface EditorState {
  activeShader: GeometryType;
  activeTab: UIState['activeTab'];
  editorFile: 'fragment' | 'vertex';
  previewPlaying: boolean;
  previewSpeed: number;
}

/**
 * Complete playground state
 */
export interface PlaygroundState {
  metadata: PluginMetadata;
  currentShader: GeometryType;
  shaders: Record<GeometryType, ShaderDraft | null>;
  presets: Record<string, PresetConfig>;
  ui: UIState;
}

/**
 * Project file format (.shader-plugin.json)
 */
export interface ProjectFile {
  $schema: string;
  version: string;
  lastModified: string;
  metadata: PluginMetadata;
  shaders: Record<GeometryType, ShaderFileData | null>;
  presets: Record<string, PresetConfig>;
  editorState: EditorState;
}

/**
 * Shader data in project file
 */
export interface ShaderFileData {
  name: string;
  displayName: string;
  description: string;
  tags: string[];
  fragmentShader: string;
  vertexShader: string | null;
  configSchema: ConfigSchema;
  defaultConfig: Record<string, unknown>;
  uniformsMapping: Record<string, string>;
}

/**
 * Event types for state changes
 */
export type PlaygroundEventType =
  | 'state:changed'
  | 'shader:compiled'
  | 'shader:error'
  | 'project:saved'
  | 'project:loaded'
  | 'ui:tab-changed';

/**
 * Event payload map
 */
export interface PlaygroundEventPayload {
  'state:changed': { state: PlaygroundState };
  'shader:compiled': { geometry: GeometryType; success: boolean };
  'shader:error': { errors: CompilationError[] };
  'project:saved': { filename: string };
  'project:loaded': { filename: string };
  'ui:tab-changed': { tab: UIState['activeTab'] };
}

/**
 * Listener function type
 */
export type PlaygroundListener<T extends PlaygroundEventType> = (
  payload: PlaygroundEventPayload[T]
) => void;
