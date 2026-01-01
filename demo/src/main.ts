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
    <div class="mobile-panel-overlay" id="mobile-overlay"></div>
    <nav class="mobile-nav">
      <div class="mobile-nav-tabs">
        <button class="mobile-nav-tab" data-panel="sidebar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          <span>Shaders</span>
        </button>
        <button class="mobile-nav-tab active" data-panel="map">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span>Map</span>
        </button>
        <button class="mobile-nav-tab" data-panel="config-panel">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span>Config</span>
        </button>
      </div>
    </nav>
  `;

  // Setup mobile navigation
  setupMobileNav();

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

/**
 * Setup mobile navigation tabs and panel interactions
 */
function setupMobileNav(): void {
  const tabs = document.querySelectorAll<HTMLButtonElement>('.mobile-nav-tab');
  const overlay = document.getElementById('mobile-overlay');
  const sidebar = document.getElementById('sidebar');
  const configPanel = document.getElementById('config-panel');

  let activePanel: string | null = null;

  /**
   * Close all mobile panels
   */
  const closePanels = (): void => {
    sidebar?.classList.remove('mobile-visible');
    configPanel?.classList.remove('mobile-visible');
    overlay?.classList.remove('visible');
    activePanel = null;

    tabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.panel === 'map');
    });
  };

  /**
   * Open a specific panel
   */
  const openPanel = (panelId: string): void => {
    closePanels();

    if (panelId === 'map') {
      return;
    }

    const panel = document.getElementById(panelId);
    if (panel) {
      panel.classList.add('mobile-visible');
      overlay?.classList.add('visible');
      activePanel = panelId;

      tabs.forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.panel === panelId);
      });
    }
  };

  // Handle tab clicks
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const panelId = tab.dataset.panel;
      if (!panelId) return;

      // Toggle panel if already active
      if (panelId === activePanel) {
        closePanels();
      } else {
        openPanel(panelId);
      }
    });
  });

  // Close panels when clicking overlay
  overlay?.addEventListener('click', closePanels);

  // Close panels when selecting a shader (for better UX)
  sidebar?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('.shader-item')) {
      // Small delay to let the selection happen
      setTimeout(() => {
        closePanels();
        // Auto-open config panel after selecting shader
        setTimeout(() => openPanel('config-panel'), 150);
      }, 100);
    }
  });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
