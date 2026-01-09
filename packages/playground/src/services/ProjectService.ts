/**
 * ProjectService - Project save/load functionality
 */

import type { PlaygroundState, ProjectFile, ShaderFileData, EditorState } from '../state';
import type { GeometryType } from 'maplibre-animated-shaders';
import { store } from '../state';

const PROJECT_SCHEMA_URL = 'https://maplibre-animated-shaders.dev/schemas/plugin-project.json';
const PROJECT_VERSION = '1.0';

/**
 * Convert playground state to project file format
 */
export function stateToProjectFile(state: PlaygroundState): ProjectFile {
  const shaders: Record<GeometryType, ShaderFileData | null> = {
    point: null,
    line: null,
    polygon: null,
    global: null,
  };

  // Convert each shader
  (Object.keys(state.shaders) as GeometryType[]).forEach((geo) => {
    const shader = state.shaders[geo];
    if (shader) {
      shaders[geo] = {
        name: shader.name,
        displayName: shader.displayName,
        description: shader.description,
        tags: shader.tags,
        fragmentShader: shader.fragmentShader,
        vertexShader: shader.vertexShader,
        configSchema: shader.configSchema,
        defaultConfig: shader.defaultConfig,
        uniformsMapping: shader.uniformsMapping,
      };
    }
  });

  const editorState: EditorState = {
    activeShader: state.currentShader,
    activeTab: state.ui.activeTab,
    editorFile: state.ui.activeShaderTab,
    previewPlaying: state.ui.previewPlaying,
    previewSpeed: state.ui.previewSpeed,
  };

  return {
    $schema: PROJECT_SCHEMA_URL,
    version: PROJECT_VERSION,
    lastModified: new Date().toISOString(),
    metadata: { ...state.metadata },
    shaders,
    presets: { ...state.presets },
    editorState,
  };
}

/**
 * Convert project file to playground state
 */
export function projectFileToState(project: ProjectFile): PlaygroundState {
  const shaders: PlaygroundState['shaders'] = {
    point: null,
    line: null,
    polygon: null,
    global: null,
  };

  // Convert each shader
  (Object.keys(project.shaders) as GeometryType[]).forEach((geo) => {
    const shader = project.shaders[geo];
    if (shader) {
      shaders[geo] = {
        geometry: geo,
        name: shader.name,
        displayName: shader.displayName,
        description: shader.description,
        tags: shader.tags,
        fragmentShader: shader.fragmentShader,
        vertexShader: shader.vertexShader,
        configSchema: shader.configSchema,
        defaultConfig: shader.defaultConfig,
        uniformsMapping: shader.uniformsMapping,
      };
    }
  });

  return {
    metadata: { ...project.metadata },
    currentShader: project.editorState.activeShader,
    shaders,
    presets: { ...project.presets },
    ui: {
      activeTab: project.editorState.activeTab,
      activeShaderTab: project.editorState.editorFile,
      previewPlaying: project.editorState.previewPlaying,
      previewSpeed: project.editorState.previewSpeed,
      compilationErrors: [],
      isDirty: false,
      showSaveDialog: false,
      showLoadDialog: false,
    },
  };
}

/**
 * Export project to JSON string
 */
export function exportProject(): string {
  const state = store.getState();
  const project = stateToProjectFile(state);
  return JSON.stringify(project, null, 2);
}

/**
 * Export project to downloadable file
 */
export function downloadProject(): void {
  const state = store.getState();
  const json = exportProject();
  const filename = `${state.metadata.name}.shader-plugin.json`;

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  store.markClean();
}

/**
 * Import project from JSON string
 */
export function importProject(json: string): boolean {
  try {
    const project = JSON.parse(json) as ProjectFile;

    // Basic validation
    if (!project.metadata || !project.shaders) {
      throw new Error('Invalid project file format');
    }

    const state = projectFileToState(project);
    store.loadFromProject(state);
    return true;
  } catch (e) {
    console.error('Failed to import project:', e);
    return false;
  }
}

/**
 * Import project from file
 */
export async function importProjectFromFile(file: File): Promise<boolean> {
  try {
    const text = await file.text();
    return importProject(text);
  } catch (e) {
    console.error('Failed to read file:', e);
    return false;
  }
}

/**
 * Validate project file structure
 */
export function validateProjectFile(json: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!json || typeof json !== 'object') {
    errors.push('Project must be a valid JSON object');
    return { valid: false, errors };
  }

  const project = json as Record<string, unknown>;

  if (!project.metadata || typeof project.metadata !== 'object') {
    errors.push('Missing or invalid metadata');
  }

  if (!project.shaders || typeof project.shaders !== 'object') {
    errors.push('Missing or invalid shaders');
  }

  const metadata = project.metadata as Record<string, unknown> | undefined;
  if (metadata) {
    if (!metadata.name || typeof metadata.name !== 'string') {
      errors.push('Metadata must include a valid name');
    }
    if (!metadata.version || typeof metadata.version !== 'string') {
      errors.push('Metadata must include a valid version');
    }
  }

  return { valid: errors.length === 0, errors };
}
