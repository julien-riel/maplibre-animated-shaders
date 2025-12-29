/**
 * ShaderGallery - Sidebar component displaying available shaders
 * Organized by geometry type (points, lines, polygons, global)
 */

import { globalRegistry } from '../../../src';
import type { ShaderDefinition, GeometryType } from '../../../src/types';

type SelectCallback = (shaderName: string) => void;

/**
 * Geometry type display configuration
 */
const geometryLabels: Record<GeometryType, { label: string; icon: string }> = {
  point: { label: 'Points', icon: '<circle cx="6" cy="6" r="4" fill="currentColor"/>' },
  line: { label: 'Lines', icon: '<line x1="2" y1="10" x2="10" y2="2" stroke="currentColor" stroke-width="2"/>' },
  polygon: { label: 'Polygons', icon: '<rect x="2" y="2" width="8" height="8" fill="currentColor"/>' },
  global: { label: 'Global Effects', icon: '<circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/>' },
};

/**
 * ShaderGallery component
 */
export class ShaderGallery {
  private container: HTMLElement;
  private selectCallbacks: SelectCallback[] = [];
  private selectedShader: string | null = null;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) {
      throw new Error(`Container #${containerId} not found`);
    }
    this.container = el;
    this.render();
  }

  /**
   * Register a callback for shader selection
   */
  onSelect(callback: SelectCallback): void {
    this.selectCallbacks.push(callback);
  }

  /**
   * Select a shader programmatically
   */
  select(shaderName: string): void {
    this.selectedShader = shaderName;
    this.updateSelection();
    this.notifySelect(shaderName);
  }

  /**
   * Render the gallery
   */
  private render(): void {
    const shaders = globalRegistry.getAll();
    const grouped = this.groupByGeometry(shaders);

    this.container.innerHTML = `
      <div class="sidebar-header">
        <h2>Shaders</h2>
      </div>
      <div class="shader-list">
        ${this.renderCategories(grouped)}
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Group shaders by geometry type
   */
  private groupByGeometry(shaders: ShaderDefinition[]): Map<GeometryType, ShaderDefinition[]> {
    const grouped = new Map<GeometryType, ShaderDefinition[]>();

    for (const shader of shaders) {
      const list = grouped.get(shader.geometry) || [];
      list.push(shader);
      grouped.set(shader.geometry, list);
    }

    return grouped;
  }

  /**
   * Render all categories
   */
  private renderCategories(grouped: Map<GeometryType, ShaderDefinition[]>): string {
    const order: GeometryType[] = ['point', 'line', 'polygon', 'global'];
    let html = '';

    for (const geometry of order) {
      const shaders = grouped.get(geometry);
      if (shaders && shaders.length > 0) {
        html += this.renderCategory(geometry, shaders);
      }
    }

    if (html === '') {
      html = `
        <div class="shader-empty">
          <p>No shaders registered yet.</p>
        </div>
      `;
    }

    return html;
  }

  /**
   * Render a single category
   */
  private renderCategory(geometry: GeometryType, shaders: ShaderDefinition[]): string {
    const config = geometryLabels[geometry];

    return `
      <div class="shader-category" data-geometry="${geometry}">
        <h3>
          <svg width="12" height="12" viewBox="0 0 12 12">${config.icon}</svg>
          ${config.label}
        </h3>
        ${shaders.map(shader => this.renderShaderItem(shader)).join('')}
      </div>
    `;
  }

  /**
   * Render a single shader item
   */
  private renderShaderItem(shader: ShaderDefinition): string {
    const isActive = this.selectedShader === shader.name;

    return `
      <div class="shader-item${isActive ? ' active' : ''}"
           data-shader="${shader.name}"
           title="${shader.description}">
        <div class="shader-preview" data-shader-preview="${shader.name}">
          ${this.getPreviewSVG(shader)}
        </div>
        <div class="shader-info">
          <div class="shader-name">${shader.displayName}</div>
          <div class="shader-tags">${shader.tags.slice(0, 3).join(', ')}</div>
        </div>
      </div>
    `;
  }

  /**
   * Generate a simple animated preview SVG
   */
  private getPreviewSVG(shader: ShaderDefinition): string {
    const colors = {
      point: '#3b82f6',
      line: '#22c55e',
      polygon: '#8b5cf6',
      global: '#f59e0b',
    };
    const color = colors[shader.geometry];

    if (shader.name === 'pulse') {
      return `
        <svg width="32" height="32" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="4" fill="${color}">
            <animate attributeName="r" values="4;12;4" dur="1.5s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/>
          </circle>
          <circle cx="16" cy="16" r="8" fill="none" stroke="${color}" stroke-width="1">
            <animate attributeName="r" values="8;14;8" dur="1.5s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.5s" repeatCount="indefinite"/>
          </circle>
        </svg>
      `;
    }

    // Default preview based on geometry
    switch (shader.geometry) {
      case 'point':
        return `
          <svg width="32" height="32" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="6" fill="${color}">
              <animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite"/>
            </circle>
          </svg>
        `;
      case 'line':
        return `
          <svg width="32" height="32" viewBox="0 0 32 32">
            <line x1="4" y1="28" x2="28" y2="4" stroke="${color}" stroke-width="3" stroke-dasharray="8 4">
              <animate attributeName="stroke-dashoffset" values="0;12" dur="0.5s" repeatCount="indefinite"/>
            </line>
          </svg>
        `;
      case 'polygon':
        return `
          <svg width="32" height="32" viewBox="0 0 32 32">
            <rect x="6" y="6" width="20" height="20" fill="${color}" rx="2">
              <animate attributeName="opacity" values="0.8;0.4;0.8" dur="1.2s" repeatCount="indefinite"/>
            </rect>
          </svg>
        `;
      case 'global':
        return `
          <svg width="32" height="32" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="12" fill="none" stroke="${color}" stroke-width="2">
              <animate attributeName="stroke-dasharray" values="0 100;75 25" dur="1.5s" repeatCount="indefinite"/>
            </circle>
          </svg>
        `;
    }
  }

  /**
   * Attach click event listeners
   */
  private attachEventListeners(): void {
    const items = this.container.querySelectorAll('.shader-item');

    items.forEach(item => {
      item.addEventListener('click', () => {
        const shaderName = item.getAttribute('data-shader');
        if (shaderName) {
          this.select(shaderName);
        }
      });
    });
  }

  /**
   * Update visual selection state
   */
  private updateSelection(): void {
    const items = this.container.querySelectorAll('.shader-item');

    items.forEach(item => {
      const shaderName = item.getAttribute('data-shader');
      if (shaderName === this.selectedShader) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  /**
   * Notify all select callbacks
   */
  private notifySelect(shaderName: string): void {
    this.selectCallbacks.forEach(cb => cb(shaderName));
  }

  /**
   * Refresh the gallery (call after shaders are registered)
   */
  refresh(): void {
    this.render();
  }
}
