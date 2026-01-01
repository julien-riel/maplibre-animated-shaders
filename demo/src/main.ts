/**
 * MapLibre GL Shaders - Playground
 * Interactive demo site for testing and configuring shaders
 * Supports stacked effects (Photoshop-style layers)
 */

import 'maplibre-gl/dist/maplibre-gl.css';
import './styles/main.css';
import { ShaderGallery } from './components/ShaderGallery';
import { ConfigPanel } from './components/ConfigPanel';
import { MapView } from './components/MapView';
import { EffectsStackPanel } from './components/EffectsStackPanel';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { globalRegistry, registerAllShaders } from '../../src';
import type { ShaderDefinition } from '../../src/types';
import type {
  EffectStackState,
  StackedEffect,
  EffectId,
  GeometryType,
} from './types/effectStack';
import {
  createInitialEffectStackState,
  findEffect,
  removeEffectFromStack,
} from './types/effectStack';

// Register all built-in shaders
registerAllShaders();

/**
 * Application state
 */
interface AppState {
  effectStack: EffectStackState;
  isGlobalPlaying: boolean;
}

const state: AppState = {
  effectStack: createInitialEffectStackState(),
  isGlobalPlaying: true,
};

/**
 * Create a new effect from a shader name
 */
function createEffect(shaderName: string, counter: number): StackedEffect {
  const shader = globalRegistry.get(shaderName);
  if (!shader) {
    throw new Error(`Shader "${shaderName}" not found`);
  }

  const id = `${shaderName}-${counter}`;

  return {
    id,
    shaderName,
    displayName: shader.displayName,
    geometry: shader.geometry as GeometryType,
    config: { ...shader.defaultConfig },
    visible: true,
    isPlaying: true,
    layerId: `effect-${id}`,
  };
}

/**
 * Initialize the application
 */
function init(): void {
  const app = document.getElementById('app');
  if (!app) return;

  // Create main layout with effects stack panel
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
      <aside class="config-panel" id="config-panel">
        <div class="effects-stack-panel" id="effects-stack"></div>
        <div class="config-controls" id="config-controls"></div>
      </aside>
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
  const effectsPanel = new EffectsStackPanel('effects-stack');
  const configPanel = new ConfigPanel('config-controls');
  const perfMonitor = new PerformanceMonitor('map-container');

  // Handle shader addition from gallery
  gallery.onAdd((shaderName) => {
    // Create new effect
    const effect = createEffect(shaderName, state.effectStack.nextIdCounter);
    state.effectStack.nextIdCounter++;
    state.effectStack.effects.push(effect);

    // Add effect to map
    mapView.addEffect(effect);

    // Update effects panel
    effectsPanel.update(state.effectStack);

    // Select the new effect
    state.effectStack.selectedEffectId = effect.id;
    effectsPanel.selectEffect(effect.id);
  });

  // Handle effect selection
  effectsPanel.onSelect((effectId) => {
    state.effectStack.selectedEffectId = effectId;

    if (effectId) {
      const effect = findEffect(state.effectStack, effectId);
      if (effect) {
        const shader = globalRegistry.get(effect.shaderName);
        if (shader) {
          configPanel.setEffect(effect, shader);
        }
      }
    } else {
      configPanel.clear();
    }
  });

  // Handle effect removal
  effectsPanel.onRemove((effectId) => {
    // Remove from map
    mapView.removeEffect(effectId);

    // Remove from state
    removeEffectFromStack(state.effectStack, effectId);

    // Update panel
    effectsPanel.update(state.effectStack);

    // Clear config if this was selected
    if (state.effectStack.selectedEffectId === effectId) {
      state.effectStack.selectedEffectId = null;
      configPanel.clear();
    }
  });

  // Handle effect reordering
  effectsPanel.onReorder((newOrder) => {
    state.effectStack.effects = newOrder;
    mapView.reorderEffects(newOrder);
  });

  // Handle visibility toggle
  effectsPanel.onVisibilityToggle((effectId, visible) => {
    const effect = findEffect(state.effectStack, effectId);
    if (effect) {
      effect.visible = visible;
      mapView.setEffectVisibility(effectId, visible);
      effectsPanel.update(state.effectStack);
    }
  });

  // Handle config changes
  configPanel.onChange((effectId, key, value) => {
    const effect = findEffect(state.effectStack, effectId);
    if (effect) {
      effect.config[key] = value;
      mapView.updateEffectConfig(effectId, effect.config);
    }
  });

  // Handle playback controls
  configPanel.onPlayPause((effectId, playing) => {
    const effect = findEffect(state.effectStack, effectId);
    if (effect) {
      effect.isPlaying = playing;
      mapView.setEffectPlaying(effectId, playing);
    }
  });

  // Connect performance monitor to map
  mapView.onReady(() => {
    perfMonitor.start();

    // Load from URL if applicable
    loadFromURL(mapView, effectsPanel, configPanel);
  });
}

/**
 * Load configuration from URL parameters
 */
function loadFromURL(
  mapView: MapView,
  effectsPanel: EffectsStackPanel,
  configPanel: ConfigPanel
): void {
  const params = new URLSearchParams(window.location.search);
  const shader = params.get('shader');
  const config = params.get('config');

  if (shader && globalRegistry.has(shader)) {
    // Create initial effect from URL
    const effect = createEffect(shader, state.effectStack.nextIdCounter);
    state.effectStack.nextIdCounter++;

    if (config) {
      try {
        effect.config = { ...effect.config, ...JSON.parse(decodeURIComponent(config)) };
      } catch {
        console.warn('Invalid config in URL');
      }
    }

    state.effectStack.effects.push(effect);
    mapView.addEffect(effect);
    effectsPanel.update(state.effectStack);

    // Select it
    state.effectStack.selectedEffectId = effect.id;
    effectsPanel.selectEffect(effect.id);

    const shaderDef = globalRegistry.get(shader);
    if (shaderDef) {
      configPanel.setEffect(effect, shaderDef);
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
