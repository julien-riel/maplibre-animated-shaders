/**
 * Shader Plugin Playground - Main Entry Point
 */

import 'maplibre-gl/dist/maplibre-gl.css';
import './styles/main.css';

import { createApp, createHeaderActions, createMainTabs } from './components/App';
import { ShaderEditorPanel } from './components/editor/ShaderEditorPanel';
import { GeometrySelector } from './components/preview/GeometrySelector';
import { MapPreview } from './components/preview/MapPreview';
import { PlaybackControls } from './components/preview/PlaybackControls';
import { shaderCompiler } from './services/ShaderCompiler';
import { autoSaveService } from './services/AutoSaveService';
import {
  showSaveDialog,
  showLoadDialog,
  showNewProjectDialog,
} from './components/project/SaveLoadPanel';
import { store } from './state';
import * as Toast from './components/shared/Toast';

/**
 * Initialize the playground application
 */
function init(): void {
  const app = document.getElementById('app');
  if (!app) return;

  // Create main layout
  const { sidebar, preview } = createApp(app);

  // Header actions
  const headerActions = document.getElementById('header-actions');
  if (headerActions) {
    createHeaderActions(headerActions);

    // Attach event handlers
    document.getElementById('btn-new')?.addEventListener('click', showNewProjectDialog);
    document.getElementById('btn-save')?.addEventListener('click', showSaveDialog);
    document.getElementById('btn-load')?.addEventListener('click', showLoadDialog);
    document.getElementById('btn-export')?.addEventListener('click', () => {
      store.setActiveTab('export');
    });
  }

  // Main tabs
  const mainTabs = document.getElementById('main-tabs');
  if (mainTabs) {
    createMainTabs(mainTabs, store.getState().ui.activeTab);
  }

  // Geometry selector
  const geometrySelectorContainer = document.createElement('div');
  sidebar.appendChild(geometrySelectorContainer);
  new GeometrySelector({
    container: geometrySelectorContainer,
  });

  // Shader editor
  const editorPanel = new ShaderEditorPanel({
    container: sidebar,
    onCompile: (fragment, vertex) => {
      const currentShader = store.getCurrentShader();
      const geometry = currentShader?.geometry ?? 'point';
      const result = shaderCompiler.compile(fragment, vertex, geometry);
      store.setCompilationErrors([...result.errors, ...result.warnings]);

      if (result.success && mapPreview) {
        // Hot-reload the shader
        mapPreview.updateShader(fragment, vertex || undefined);
      }
    },
  });

  // Map preview
  let mapPreview: MapPreview | null = null;
  mapPreview = new MapPreview({
    container: preview,
    onReady: () => {
      // Initial compilation
      const currentShader = store.getCurrentShader();
      if (currentShader) {
        const result = shaderCompiler.compile(
          currentShader.fragmentShader,
          currentShader.vertexShader,
          currentShader.geometry
        );
        store.setCompilationErrors([...result.errors, ...result.warnings]);
      }
    },
  });

  // Playback controls
  const playbackContainer = document.getElementById('playback-controls');
  if (playbackContainer) {
    new PlaybackControls({
      container: playbackContainer,
    });
  }

  // Try to restore auto-saved state
  if (autoSaveService.hasSavedData()) {
    const restored = autoSaveService.restore();
    if (restored) {
      Toast.info('Restored previous session');
    }
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl+S / Cmd+S - Save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      showSaveDialog();
    }

    // Ctrl+O / Cmd+O - Open
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
      e.preventDefault();
      showLoadDialog();
    }

    // Ctrl+N / Cmd+N - New
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      showNewProjectDialog();
    }

    // Space - Play/Pause (when not in editor)
    if (
      e.key === ' ' &&
      document.activeElement?.tagName !== 'INPUT' &&
      !document.activeElement?.closest('.monaco-editor')
    ) {
      e.preventDefault();
      store.togglePreviewPlayback();
    }
  });

  // Handle window resize
  window.addEventListener('resize', () => {
    editorPanel.layout();
    mapPreview?.resize();
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
