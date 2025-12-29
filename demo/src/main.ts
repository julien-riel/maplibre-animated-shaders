/**
 * MapLibre GL Shaders - Playground
 * Interactive demo site for testing and configuring shaders
 */

import 'maplibre-gl/dist/maplibre-gl.css';
import './styles/main.css';
import { ShaderGallery } from './components/ShaderGallery';
import { ConfigPanel } from './components/ConfigPanel';
import { MapView } from './components/MapView';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { globalRegistry, registerAllShaders } from '../../src';

// Register all built-in shaders
registerAllShaders();

/**
 * Application state
 */
interface AppState {
  selectedShader: string | null;
  config: Record<string, unknown>;
  isPlaying: boolean;
}

const state: AppState = {
  selectedShader: 'pulse',
  config: {},
  isPlaying: true,
};

/**
 * Initialize the application
 */
function init(): void {
  const app = document.getElementById('app');
  if (!app) return;

  // Create main layout
  app.innerHTML = `
    <header class="header">
      <div class="header-title">
        <h1>MapLibre GL Shaders</h1>
        <span>v0.1.0</span>
      </div>
      <nav class="header-links">
        <a href="https://github.com/julien-riel/maplibre-animated-shaders" target="_blank">GitHub</a>
        <a href="https://github.com/julien-riel/maplibre-animated-shaders#readme" target="_blank">Docs</a>
      </nav>
    </header>
    <main class="main-layout">
      <aside class="sidebar" id="sidebar"></aside>
      <div class="map-container" id="map-container">
        <div id="map"></div>
      </div>
      <aside class="config-panel" id="config-panel"></aside>
    </main>
  `;

  // Initialize components
  const mapView = new MapView('map');
  const gallery = new ShaderGallery('sidebar');
  const configPanel = new ConfigPanel('config-panel');
  const perfMonitor = new PerformanceMonitor('map-container');

  // Handle shader selection
  gallery.onSelect((shaderName) => {
    state.selectedShader = shaderName;
    const shader = globalRegistry.get(shaderName);
    if (shader) {
      state.config = { ...shader.defaultConfig };
      configPanel.setShader(shader, state.config);
      mapView.applyShader(shaderName, state.config);
    }
  });

  // Handle config changes
  configPanel.onChange((key, value) => {
    state.config[key] = value;
    mapView.updateConfig(state.config);
  });

  // Handle playback controls
  configPanel.onPlayPause((playing) => {
    state.isPlaying = playing;
    if (playing) {
      mapView.play();
    } else {
      mapView.pause();
    }
  });

  // Connect performance monitor to map
  mapView.onReady(() => {
    perfMonitor.start();

    // Select default shader
    if (state.selectedShader) {
      gallery.select(state.selectedShader);
    }
  });

  // Handle URL params for shareable configs
  loadFromURL();
}

/**
 * Load configuration from URL parameters
 */
function loadFromURL(): void {
  const params = new URLSearchParams(window.location.search);
  const shader = params.get('shader');
  const config = params.get('config');

  if (shader && globalRegistry.has(shader)) {
    state.selectedShader = shader;
  }

  if (config) {
    try {
      state.config = JSON.parse(decodeURIComponent(config));
    } catch {
      console.warn('Invalid config in URL');
    }
  }
}

/**
 * Update URL with current configuration
 */
export function updateURL(shader: string, config: Record<string, unknown>): void {
  const params = new URLSearchParams();
  params.set('shader', shader);
  params.set('config', encodeURIComponent(JSON.stringify(config)));

  const newURL = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', newURL);
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
