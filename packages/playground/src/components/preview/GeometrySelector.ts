/**
 * GeometrySelector - Selector for geometry types
 */

import type { GeometryType } from 'maplibre-animated-shaders';
import { store } from '../../state';
import { Icons } from '../shared/IconButton';

export interface GeometrySelectorOptions {
  container: HTMLElement;
  onChange?: (geometry: GeometryType) => void;
}

const GEOMETRIES: { id: GeometryType; label: string; icon: string }[] = [
  { id: 'point', label: 'Point', icon: Icons.point },
  { id: 'line', label: 'Line', icon: Icons.line },
  { id: 'polygon', label: 'Polygon', icon: Icons.polygon },
  { id: 'global', label: 'Global', icon: Icons.global },
];

/**
 * GeometrySelector component
 */
export class GeometrySelector {
  private container: HTMLElement;
  private onChange?: (geometry: GeometryType) => void;

  constructor(options: GeometrySelectorOptions) {
    this.container = options.container;
    this.onChange = options.onChange;
    this.render();
    this.subscribeToStore();
  }

  private render(): void {
    const state = store.getState();
    this.container.className = 'geometry-selector';

    this.container.innerHTML = GEOMETRIES.map(
      (geo) => `
        <button
          class="geometry-btn ${geo.id === state.currentShader ? 'active' : ''}"
          data-geometry="${geo.id}"
          title="${geo.label}"
        >
          <span class="geometry-icon">${geo.icon}</span>
          <span class="geometry-label">${geo.label}</span>
        </button>
      `
    ).join('');

    // Add click handlers
    const buttons = this.container.querySelectorAll('.geometry-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const geometry = btn.getAttribute('data-geometry') as GeometryType;
        this.selectGeometry(geometry);
      });
    });
  }

  private subscribeToStore(): void {
    store.on('state:changed', ({ state }) => {
      this.updateActiveButton(state.currentShader);
    });
  }

  private selectGeometry(geometry: GeometryType): void {
    store.setCurrentShader(geometry);
    this.updateActiveButton(geometry);
    this.onChange?.(geometry);
  }

  private updateActiveButton(geometry: GeometryType): void {
    const buttons = this.container.querySelectorAll('.geometry-btn');
    buttons.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-geometry') === geometry);
    });
  }

  /**
   * Get currently selected geometry
   */
  getSelectedGeometry(): GeometryType {
    return store.getState().currentShader;
  }
}
