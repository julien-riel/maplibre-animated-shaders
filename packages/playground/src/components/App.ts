/**
 * App - Main application component
 */

import { store } from '../state';
import type { UIState } from '../state';

export interface AppComponents {
  sidebar: HTMLElement;
  preview: HTMLElement;
  rightPanel: HTMLElement;
}

/**
 * Create the main application layout
 */
export function createApp(container: HTMLElement): AppComponents {
  container.innerHTML = `
    <header class="header">
      <div class="header-title">
        <h1>Shader Plugin Playground</h1>
        <span>v0.1.0</span>
      </div>
      <div class="header-actions" id="header-actions"></div>
    </header>
    <main class="main-layout">
      <aside class="sidebar" id="sidebar"></aside>
      <div class="preview-container" id="preview-container">
        <div class="preview-header">
          <h3>Preview</h3>
          <div class="playback-controls" id="playback-controls"></div>
        </div>
        <div class="map-wrapper" id="map-wrapper"></div>
      </div>
      <aside class="right-panel" id="right-panel">
        <div class="tabs" id="main-tabs"></div>
        <div class="panel-content" id="panel-content"></div>
      </aside>
    </main>
  `;

  return {
    sidebar: container.querySelector('#sidebar')!,
    preview: container.querySelector('#map-wrapper')!,
    rightPanel: container.querySelector('#right-panel')!,
  };
}

/**
 * Create header action buttons
 */
export function createHeaderActions(container: HTMLElement): void {
  container.innerHTML = `
    <button class="btn" id="btn-new" title="New Project">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="12" y1="18" x2="12" y2="12"/>
        <line x1="9" y1="15" x2="15" y2="15"/>
      </svg>
      <span>New</span>
    </button>
    <button class="btn" id="btn-save" title="Save Project">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/>
        <polyline points="7 3 7 8 15 8"/>
      </svg>
      <span>Save</span>
    </button>
    <button class="btn" id="btn-load" title="Load Project">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <span>Load</span>
    </button>
    <button class="btn btn-primary" id="btn-export" title="Export Package">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      <span>Export</span>
    </button>
  `;
}

/**
 * Create main tabs
 */
export function createMainTabs(container: HTMLElement, activeTab: UIState['activeTab']): void {
  const tabs = [
    { id: 'editor', label: 'Editor' },
    { id: 'schema', label: 'Config' },
    { id: 'metadata', label: 'Metadata' },
    { id: 'presets', label: 'Presets' },
    { id: 'export', label: 'Export' },
  ];

  container.innerHTML = tabs
    .map(
      (tab) =>
        `<button class="tab ${tab.id === activeTab ? 'active' : ''}" data-tab="${tab.id}">${tab.label}</button>`
    )
    .join('');

  container.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab') as UIState['activeTab'];
      store.setActiveTab(tabId);

      container.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}
