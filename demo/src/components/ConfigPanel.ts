/**
 * ConfigPanel - Dynamic configuration panel for shader parameters
 * Generates controls based on the shader's configSchema
 * Supports effect context for stacked effects
 * Includes advanced configuration for timing and interactivity
 */

import type { ShaderDefinition, ConfigSchema, ConfigParamSchema } from '../../../src/types';
import type { StackedEffect, EffectId, AdvancedEffectConfig, TimeOffsetMode } from '../types/effectStack';
import { createDefaultAdvancedConfig } from '../types/effectStack';
import { CodePreview } from './CodePreview';

/**
 * Data-driven expression presets for demonstration
 */
interface ExpressionPreset {
  id: string;
  name: string;
  description: string;
  /** Which config keys this preset modifies */
  configKeys: string[];
  /** The expression values to apply */
  expressions: Record<string, unknown>;
  /** Geometry type this preset applies to */
  geometry?: 'point' | 'line' | 'polygon' | 'all';
}

/**
 * Predefined expression presets to demonstrate data-driven capabilities
 */
const EXPRESSION_PRESETS: ExpressionPreset[] = [
  {
    id: 'color-from-property',
    name: 'Color from Property',
    description: 'Use the "color" property from each feature',
    configKeys: ['color'],
    expressions: {
      color: ['get', 'color'],
    },
    geometry: 'all',
  },
  {
    id: 'speed-from-property',
    name: 'Speed from Property',
    description: 'Use the "speed" property from each feature',
    configKeys: ['speed'],
    expressions: {
      speed: ['get', 'speed'],
    },
    geometry: 'all',
  },
  {
    id: 'intensity-from-property',
    name: 'Intensity from Property',
    description: 'Use the "intensity" property from each feature',
    configKeys: ['intensity'],
    expressions: {
      intensity: ['get', 'intensity'],
    },
    geometry: 'all',
  },
  {
    id: 'color-by-category',
    name: 'Color by Category',
    description: 'Different colors based on category (landmark, museum, etc.)',
    configKeys: ['color'],
    expressions: {
      color: ['match', ['get', 'category'],
        'landmark', '#f59e0b',
        'museum', '#8b5cf6',
        'park', '#22c55e',
        'transport', '#3b82f6',
        'shopping', '#ec4899',
        'culture', '#ef4444',
        'restaurant', '#f97316',
        '#888888'
      ],
    },
    geometry: 'point',
  },
  {
    id: 'intensity-by-priority',
    name: 'Intensity by Priority',
    description: 'High priority = bright, low priority = dim',
    configKeys: ['intensity'],
    expressions: {
      intensity: ['match', ['get', 'priority'],
        'high', 1.0,
        'medium', 0.6,
        'low', 0.3,
        0.5
      ],
    },
    geometry: 'all',
  },
  {
    id: 'speed-interpolated',
    name: 'Speed Interpolated',
    description: 'Smooth interpolation of speed based on feature speed property',
    configKeys: ['speed'],
    expressions: {
      speed: ['interpolate', ['linear'], ['get', 'speed'],
        0.3, 0.5,
        1.0, 1.0,
        2.0, 2.5
      ],
    },
    geometry: 'all',
  },
  {
    id: 'full-data-driven',
    name: 'Full Data-Driven',
    description: 'Use all properties: color, speed, intensity from features',
    configKeys: ['color', 'speed', 'intensity'],
    expressions: {
      color: ['get', 'color'],
      speed: ['get', 'speed'],
      intensity: ['get', 'intensity'],
    },
    geometry: 'all',
  },
  {
    id: 'color-by-line-type',
    name: 'Color by Line Type',
    description: 'Different colors for routes, metro, bus lines',
    configKeys: ['color'],
    expressions: {
      color: ['match', ['get', 'type'],
        'route', '#3b82f6',
        'metro', '#ef4444',
        'bus', '#22c55e',
        'cycling', '#f59e0b',
        'walking', '#8b5cf6',
        '#888888'
      ],
    },
    geometry: 'line',
  },
  {
    id: 'color-by-polygon-type',
    name: 'Color by Zone Type',
    description: 'Different colors for arrondissements and zones',
    configKeys: ['color'],
    expressions: {
      color: ['match', ['get', 'type'],
        'arrondissement', '#8b5cf6',
        'commercial', '#ec4899',
        'park', '#22c55e',
        '#888888'
      ],
    },
    geometry: 'polygon',
  },
];

type ChangeCallback = (effectId: EffectId, key: string, value: unknown) => void;
type PlayPauseCallback = (effectId: EffectId, playing: boolean) => void;
type AdvancedChangeCallback = (effectId: EffectId, advancedConfig: AdvancedEffectConfig) => void;
type ExpressionPresetCallback = (effectId: EffectId, expressions: Record<string, unknown>) => void;

/**
 * ConfigPanel component
 */
export class ConfigPanel {
  private container: HTMLElement;
  private changeCallbacks: ChangeCallback[] = [];
  private playPauseCallbacks: PlayPauseCallback[] = [];
  private advancedChangeCallbacks: AdvancedChangeCallback[] = [];
  private expressionPresetCallbacks: ExpressionPresetCallback[] = [];
  private currentShader: ShaderDefinition | null = null;
  private currentEffect: StackedEffect | null = null;
  private currentConfig: Record<string, unknown> = {};
  private currentAdvancedConfig: AdvancedEffectConfig = createDefaultAdvancedConfig();
  private isPlaying: boolean = true;
  private codePreview: CodePreview | null = null;
  private activeTab: 'config' | 'code' = 'config';
  private advancedExpanded: boolean = false;
  private expressionsExpanded: boolean = false;
  private activeExpressions: Map<string, unknown> = new Map();

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) {
      throw new Error(`Container #${containerId} not found`);
    }
    this.container = el;
    this.renderEmpty();
  }

  /**
   * Set the current effect and its shader definition
   */
  setEffect(effect: StackedEffect, shader: ShaderDefinition): void {
    // Reset active expressions when changing effects
    // but keep them if it's the same effect (to preserve state during re-renders)
    const previousEffectId = this.currentEffect?.id;
    if (previousEffectId !== effect.id) {
      this.activeExpressions.clear();
    }

    this.currentEffect = effect;
    this.currentShader = shader;
    this.currentConfig = { ...effect.config };
    this.currentAdvancedConfig = effect.advancedConfig
      ? { ...effect.advancedConfig }
      : createDefaultAdvancedConfig();
    this.isPlaying = effect.isPlaying;

    this.render();
  }

  /**
   * Set the current shader and configuration (legacy support)
   * @deprecated Use setEffect instead
   */
  setShader(shader: ShaderDefinition, config: Record<string, unknown>): void {
    this.currentShader = shader;
    this.currentConfig = { ...config };
    this.render();
  }

  /**
   * Clear the panel (no effect selected)
   */
  clear(): void {
    this.currentEffect = null;
    this.currentShader = null;
    this.currentConfig = {};
    this.renderEmpty();
  }

  /**
   * Register a callback for config changes
   */
  onChange(callback: ChangeCallback): void {
    this.changeCallbacks.push(callback);
  }

  /**
   * Register a callback for play/pause events
   */
  onPlayPause(callback: PlayPauseCallback): void {
    this.playPauseCallbacks.push(callback);
  }

  /**
   * Register a callback for advanced config changes
   */
  onAdvancedChange(callback: AdvancedChangeCallback): void {
    this.advancedChangeCallbacks.push(callback);
  }

  /**
   * Register a callback for expression preset application
   */
  onExpressionPreset(callback: ExpressionPresetCallback): void {
    this.expressionPresetCallbacks.push(callback);
  }

  /**
   * Render empty state
   */
  private renderEmpty(): void {
    this.container.innerHTML = `
      <div class="panel-header">
        <h2>Configuration</h2>
      </div>
      <div class="panel-content">
        <div class="loading">
          <p>Select a shader to configure</p>
        </div>
      </div>
    `;
  }

  /**
   * Render the panel with current shader
   */
  private render(): void {
    if (!this.currentShader) {
      this.renderEmpty();
      return;
    }

    // Show effect ID if we have an effect
    const headerTitle = this.currentEffect
      ? `${this.currentShader.displayName}`
      : this.currentShader.displayName;

    this.container.innerHTML = `
      <div class="panel-header">
        <h2>${headerTitle}</h2>
        ${this.currentEffect ? `<span class="panel-effect-id">${this.currentEffect.id}</span>` : ''}
      </div>
      <div class="panel-tabs">
        <button class="panel-tab${this.activeTab === 'config' ? ' active' : ''}" data-tab="config">Controls</button>
        <button class="panel-tab${this.activeTab === 'code' ? ' active' : ''}" data-tab="code">Code</button>
      </div>
      <div class="panel-content" id="panel-content">
        ${this.activeTab === 'config' ? this.renderConfigControls() + this.renderDataDrivenSection() + this.renderAdvancedSection() : ''}
      </div>
      <div class="playback-controls">
        <button class="playback-btn${this.isPlaying ? '' : ' primary'}" id="btn-pause">
          ${this.isPlaying ? 'Pause' : 'Play'}
        </button>
        <button class="playback-btn" id="btn-reset">Reset</button>
      </div>
    `;

    if (this.activeTab === 'code') {
      this.codePreview = new CodePreview('panel-content');
      this.codePreview.update(this.currentShader.name, this.currentConfig);
    }

    this.attachEventListeners();
  }

  /**
   * Render configuration controls
   */
  private renderConfigControls(): string {
    if (!this.currentShader) return '';

    const schema = this.currentShader.configSchema;
    const groups = this.groupControls(schema);

    let html = '';
    for (const [group, params] of Object.entries(groups)) {
      html += `
        <div class="config-group">
          ${group !== 'default' ? `<div class="config-group-title">${group}</div>` : ''}
          ${params.map(([key, param]) => this.renderControl(key, param)).join('')}
        </div>
      `;
    }

    return html;
  }

  /**
   * Render data-driven expressions section
   */
  private renderDataDrivenSection(): string {
    if (!this.currentShader) return '';

    // Get the geometry type from the current shader
    const geometry = this.currentShader.geometry;

    // Filter presets by geometry
    const applicablePresets = EXPRESSION_PRESETS.filter(preset => {
      return preset.geometry === 'all' || preset.geometry === geometry;
    });

    // Get available config keys from the schema
    const availableKeys = Object.keys(this.currentShader.configSchema);

    // Further filter presets by available config keys
    const validPresets = applicablePresets.filter(preset => {
      return preset.configKeys.some(key => availableKeys.includes(key));
    });

    if (validPresets.length === 0) {
      return ''; // No applicable presets for this shader
    }

    return `
      <div class="expressions-section${this.expressionsExpanded ? ' expanded' : ''}" id="expressions-section">
        <div class="expressions-section-header" id="expressions-toggle">
          <div class="expressions-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            Data-Driven Expressions
          </div>
          <div class="expressions-section-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
        </div>
        <div class="expressions-section-content">
          <div class="expressions-description">
            Use MapLibre expressions to configure shader properties from feature data.
            ${this.activeExpressions.size > 0 ? `<span class="expressions-active-count">${this.activeExpressions.size} active</span>` : ''}
          </div>

          ${this.renderActiveExpressions()}

          <div class="expressions-presets">
            <div class="expressions-presets-title">Presets</div>
            <div class="expressions-preset-list">
              ${validPresets.map(preset => this.renderPresetButton(preset)).join('')}
            </div>
          </div>

          <div class="expressions-info">
            <div class="expressions-info-title">Available Feature Properties</div>
            <div class="expressions-properties">
              <span class="expression-property" title="Feature color (hex)">color</span>
              <span class="expression-property" title="Animation speed (0.3-2.0)">speed</span>
              <span class="expression-property" title="Effect intensity (0.3-1.0)">intensity</span>
              <span class="expression-property" title="Feature priority">priority</span>
              <span class="expression-property" title="Feature category">category</span>
              <span class="expression-property" title="Animation delay">delay</span>
              <span class="expression-property" title="Feature ID">id</span>
              <span class="expression-property" title="Feature name">name</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render active expressions display
   */
  private renderActiveExpressions(): string {
    if (this.activeExpressions.size === 0) {
      return '';
    }

    const items = Array.from(this.activeExpressions.entries()).map(([key, expr]) => {
      const exprStr = JSON.stringify(expr);
      return `
        <div class="active-expression-item">
          <span class="active-expression-key">${key}</span>
          <code class="active-expression-value" title="${exprStr}">${exprStr}</code>
          <button class="active-expression-remove" data-key="${key}" title="Remove expression">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      `;
    });

    return `
      <div class="active-expressions">
        <div class="active-expressions-title">Active Expressions</div>
        ${items.join('')}
        <button class="active-expressions-clear" id="clear-all-expressions">Clear All</button>
      </div>
    `;
  }

  /**
   * Render a single preset button
   */
  private renderPresetButton(preset: ExpressionPreset): string {
    // Check if any of this preset's expressions are currently active
    const isActive = preset.configKeys.some(key => this.activeExpressions.has(key));

    return `
      <button class="expression-preset-btn${isActive ? ' active' : ''}"
              data-preset-id="${preset.id}"
              title="${preset.description}">
        <span class="preset-name">${preset.name}</span>
        <span class="preset-keys">${preset.configKeys.join(', ')}</span>
      </button>
    `;
  }

  /**
   * Render advanced configuration section
   */
  private renderAdvancedSection(): string {
    const mode = this.currentAdvancedConfig.timeOffsetMode;
    const interactivity = this.currentAdvancedConfig.interactivity ?? {};

    return `
      <div class="advanced-section${this.advancedExpanded ? ' expanded' : ''}" id="advanced-section">
        <div class="advanced-section-header" id="advanced-toggle">
          <div class="advanced-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
            Advanced
          </div>
          <div class="advanced-section-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
        </div>
        <div class="advanced-section-content">
          <!-- Animation Timing -->
          <div class="config-subsection">
            <div class="config-subsection-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              Animation Timing
            </div>

            <div class="config-field">
              <div class="config-label">
                <span>Time Offset Mode</span>
              </div>
              <select class="config-select" id="adv-timeOffsetMode">
                <option value="none" ${mode === 'none' ? 'selected' : ''}>None (synchronized)</option>
                <option value="random" ${mode === 'random' ? 'selected' : ''}>Random</option>
                <option value="hash" ${mode === 'hash' ? 'selected' : ''}>Hash (stable by property)</option>
                <option value="property" ${mode === 'property' ? 'selected' : ''}>From property</option>
                <option value="range" ${mode === 'range' ? 'selected' : ''}>Random range</option>
              </select>
              <div class="config-hint">Desynchronize animations between features</div>
            </div>

            <div class="config-field" data-visible="${mode === 'hash' || mode === 'property'}">
              <div class="config-label">
                <span>Property Name</span>
              </div>
              <input type="text" class="config-input" id="adv-timeOffsetProperty"
                     value="${this.currentAdvancedConfig.timeOffsetProperty || ''}"
                     placeholder="e.g., id, delay">
              <div class="feature-properties-hint">
                ${this.renderPropertyTags()}
              </div>
            </div>

            <div class="config-row" data-visible="${mode === 'range'}">
              <div class="config-field">
                <div class="config-label-small">Min (s)</div>
                <input type="number" class="config-input" id="adv-timeOffsetMin"
                       value="${this.currentAdvancedConfig.timeOffsetMin ?? 0}"
                       step="0.1" min="0">
              </div>
              <div class="config-field">
                <div class="config-label-small">Max (s)</div>
                <input type="number" class="config-input" id="adv-timeOffsetMax"
                       value="${this.currentAdvancedConfig.timeOffsetMax ?? 2}"
                       step="0.1" min="0">
              </div>
            </div>

            <div class="config-field" data-visible="${mode !== 'none'}">
              <div class="config-label">
                <span>Period</span>
                <span class="config-value">${this.currentAdvancedConfig.period ?? 1}s</span>
              </div>
              <input type="range" id="adv-period" min="0.1" max="10" step="0.1"
                     value="${this.currentAdvancedConfig.period ?? 1}">
            </div>

            <div class="config-field" data-visible="${mode === 'random' || mode === 'range'}">
              <div class="config-label">
                <span>Random Seed</span>
              </div>
              <input type="text" class="config-input" id="adv-randomSeed"
                     value="${this.currentAdvancedConfig.randomSeed || ''}"
                     placeholder="Optional (for reproducibility)">
            </div>
          </div>

          <!-- Interactivity -->
          <div class="config-subsection">
            <div class="config-subsection-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 14l5-5-5-5"/>
                <path d="M19 9H5"/>
              </svg>
              Interactivity
            </div>

            <div class="config-field config-field-checkbox">
              <label class="config-label">
                <span>Enable per-feature control</span>
                <input type="checkbox" id="adv-perFeatureControl"
                       ${interactivity.perFeatureControl ? 'checked' : ''}>
              </label>
            </div>

            <div class="config-field" data-visible="${interactivity.perFeatureControl}">
              <div class="config-label">
                <span>Initial State</span>
              </div>
              <select class="config-select" id="adv-initialState">
                <option value="playing" ${interactivity.initialState === 'playing' ? 'selected' : ''}>Playing</option>
                <option value="paused" ${interactivity.initialState === 'paused' ? 'selected' : ''}>Paused</option>
              </select>
            </div>

            <div class="config-field" data-visible="${interactivity.perFeatureControl}">
              <div class="config-label">
                <span>On Click</span>
              </div>
              <select class="config-select" id="adv-onClick">
                <option value="" ${!interactivity.onClick ? 'selected' : ''}>None</option>
                <option value="toggle" ${interactivity.onClick === 'toggle' ? 'selected' : ''}>Toggle play/pause</option>
                <option value="play" ${interactivity.onClick === 'play' ? 'selected' : ''}>Play</option>
                <option value="pause" ${interactivity.onClick === 'pause' ? 'selected' : ''}>Pause</option>
                <option value="reset" ${interactivity.onClick === 'reset' ? 'selected' : ''}>Reset</option>
              </select>
            </div>

            <div class="config-field" data-visible="${interactivity.perFeatureControl}">
              <div class="config-label">
                <span>On Hover Enter</span>
              </div>
              <select class="config-select" id="adv-onHoverEnter">
                <option value="" ${!interactivity.onHover?.enter ? 'selected' : ''}>None</option>
                <option value="play" ${interactivity.onHover?.enter === 'play' ? 'selected' : ''}>Play</option>
                <option value="pause" ${interactivity.onHover?.enter === 'pause' ? 'selected' : ''}>Pause</option>
              </select>
            </div>

            <div class="config-field" data-visible="${interactivity.perFeatureControl}">
              <div class="config-label">
                <span>On Hover Leave</span>
              </div>
              <select class="config-select" id="adv-onHoverLeave">
                <option value="" ${!interactivity.onHover?.leave ? 'selected' : ''}>None</option>
                <option value="play" ${interactivity.onHover?.leave === 'play' ? 'selected' : ''}>Play</option>
                <option value="pause" ${interactivity.onHover?.leave === 'pause' ? 'selected' : ''}>Pause</option>
                <option value="reset" ${interactivity.onHover?.leave === 'reset' ? 'selected' : ''}>Reset</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render property tags for quick selection
   */
  private renderPropertyTags(): string {
    const properties = ['id', 'delay', 'speed', 'intensity', 'priority', 'category', 'type', 'name'];
    return properties.map(prop =>
      `<span class="property-tag" data-property="${prop}">${prop}</span>`
    ).join('');
  }

  /**
   * Group controls by category
   */
  private groupControls(schema: ConfigSchema): Record<string, [string, ConfigParamSchema][]> {
    const groups: Record<string, [string, ConfigParamSchema][]> = { default: [] };

    for (const [key, param] of Object.entries(schema)) {
      // Skip internal params
      if (key === 'enabled') continue;

      const group = 'default';
      if (!groups[group]) groups[group] = [];
      groups[group].push([key, param]);
    }

    return groups;
  }

  /**
   * Render a single control based on type
   */
  private renderControl(key: string, param: ConfigParamSchema): string {
    const value = this.currentConfig[key] ?? param.default;
    const label = param.label || this.formatLabel(key);

    switch (param.type) {
      case 'number':
        return this.renderNumberControl(key, param, value as number, label);
      case 'color':
        return this.renderColorControl(key, value as string, label);
      case 'boolean':
        return this.renderBooleanControl(key, value as boolean, label);
      case 'select':
        return this.renderSelectControl(key, param, value as string, label);
      default:
        return '';
    }
  }

  /**
   * Render number slider control
   */
  private renderNumberControl(key: string, param: ConfigParamSchema, value: number, label: string): string {
    const min = param.min ?? 0;
    const max = param.max ?? 100;
    const step = param.step ?? 1;
    const displayValue = Number.isInteger(step) ? value : value.toFixed(2);

    return `
      <div class="config-field">
        <div class="config-label">
          <span>${label}</span>
          <span class="config-value">${displayValue}</span>
        </div>
        <input type="range"
               id="config-${key}"
               data-key="${key}"
               min="${min}"
               max="${max}"
               step="${step}"
               value="${value}">
      </div>
    `;
  }

  /**
   * Render color picker control
   */
  private renderColorControl(key: string, value: string, label: string): string {
    return `
      <div class="config-field">
        <div class="config-label">
          <span>${label}</span>
          <span class="config-value">${value}</span>
        </div>
        <input type="color"
               id="config-${key}"
               data-key="${key}"
               value="${value}">
      </div>
    `;
  }

  /**
   * Render boolean checkbox control
   */
  private renderBooleanControl(key: string, value: boolean, label: string): string {
    return `
      <div class="config-field config-field-checkbox">
        <label class="config-label">
          <span>${label}</span>
          <input type="checkbox"
                 id="config-${key}"
                 data-key="${key}"
                 ${value ? 'checked' : ''}>
        </label>
      </div>
    `;
  }

  /**
   * Render select dropdown control
   */
  private renderSelectControl(key: string, param: ConfigParamSchema, value: string, label: string): string {
    const options = param.options || [];

    return `
      <div class="config-field">
        <div class="config-label">
          <span>${label}</span>
        </div>
        <select id="config-${key}" data-key="${key}" class="config-select">
          ${options.map(opt => `
            <option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>
          `).join('')}
        </select>
      </div>
    `;
  }

  /**
   * Format key as display label
   */
  private formatLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Tab switching
    const tabs = this.container.querySelectorAll('.panel-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab') as 'config' | 'code';
        if (tabName) {
          this.activeTab = tabName;
          this.render();
        }
      });
    });

    // Config controls
    const inputs = this.container.querySelectorAll('input[data-key], select[data-key]');
    inputs.forEach(input => {
      const key = input.getAttribute('data-key');
      if (!key) return;

      const eventType = input.type === 'checkbox' ? 'change' : 'input';
      input.addEventListener(eventType, () => {
        const htmlInput = input as HTMLInputElement;
        let value: unknown;

        if (htmlInput.type === 'checkbox') {
          value = htmlInput.checked;
        } else if (htmlInput.type === 'range') {
          value = parseFloat(htmlInput.value);
          // Update displayed value
          const valueSpan = this.container.querySelector(`#config-${key}`)?.parentElement?.querySelector('.config-value');
          if (valueSpan) {
            const step = parseFloat(htmlInput.step);
            valueSpan.textContent = Number.isInteger(step) ? String(value) : (value as number).toFixed(2);
          }
        } else if (htmlInput.tagName === 'SELECT') {
          value = htmlInput.value;
        } else {
          value = htmlInput.value;
        }

        this.currentConfig[key] = value;
        this.notifyChange(key, value);

        // Update code preview if visible
        if (this.activeTab === 'code' && this.codePreview && this.currentShader) {
          this.codePreview.update(this.currentShader.name, this.currentConfig);
        }
      });
    });

    // Playback controls
    const pauseBtn = this.container.querySelector('#btn-pause');
    pauseBtn?.addEventListener('click', () => {
      this.isPlaying = !this.isPlaying;
      if (pauseBtn) {
        pauseBtn.textContent = this.isPlaying ? 'Pause' : 'Play';
        pauseBtn.classList.toggle('primary', !this.isPlaying);
      }
      this.notifyPlayPause(this.isPlaying);
    });

    const resetBtn = this.container.querySelector('#btn-reset');
    resetBtn?.addEventListener('click', () => {
      if (this.currentShader) {
        this.currentConfig = { ...this.currentShader.defaultConfig };
        this.render();
        // Notify all changes
        for (const [key, value] of Object.entries(this.currentConfig)) {
          this.notifyChange(key, value);
        }
      }
    });

    // Advanced section toggle
    const advancedToggle = this.container.querySelector('#advanced-toggle');
    advancedToggle?.addEventListener('click', () => {
      this.advancedExpanded = !this.advancedExpanded;
      const section = this.container.querySelector('#advanced-section');
      section?.classList.toggle('expanded', this.advancedExpanded);
    });

    // Attach advanced section listeners
    this.attachAdvancedEventListeners();

    // Attach expressions section listeners
    this.attachExpressionsEventListeners();
  }

  /**
   * Attach event listeners for advanced section
   */
  private attachAdvancedEventListeners(): void {
    // Time offset mode
    const modeSelect = this.container.querySelector('#adv-timeOffsetMode') as HTMLSelectElement;
    modeSelect?.addEventListener('change', () => {
      this.currentAdvancedConfig.timeOffsetMode = modeSelect.value as TimeOffsetMode;
      this.notifyAdvancedChange();
      this.render(); // Re-render to show/hide conditional fields
    });

    // Property name
    const propInput = this.container.querySelector('#adv-timeOffsetProperty') as HTMLInputElement;
    propInput?.addEventListener('input', () => {
      this.currentAdvancedConfig.timeOffsetProperty = propInput.value;
      this.notifyAdvancedChange();
    });

    // Property tags (quick select)
    const propertyTags = this.container.querySelectorAll('.property-tag');
    propertyTags.forEach(tag => {
      tag.addEventListener('click', () => {
        const property = tag.getAttribute('data-property');
        if (property && propInput) {
          propInput.value = property;
          this.currentAdvancedConfig.timeOffsetProperty = property;
          this.notifyAdvancedChange();
        }
      });
    });

    // Range min/max
    const minInput = this.container.querySelector('#adv-timeOffsetMin') as HTMLInputElement;
    const maxInput = this.container.querySelector('#adv-timeOffsetMax') as HTMLInputElement;
    minInput?.addEventListener('input', () => {
      this.currentAdvancedConfig.timeOffsetMin = parseFloat(minInput.value);
      this.notifyAdvancedChange();
    });
    maxInput?.addEventListener('input', () => {
      this.currentAdvancedConfig.timeOffsetMax = parseFloat(maxInput.value);
      this.notifyAdvancedChange();
    });

    // Period
    const periodInput = this.container.querySelector('#adv-period') as HTMLInputElement;
    periodInput?.addEventListener('input', () => {
      this.currentAdvancedConfig.period = parseFloat(periodInput.value);
      const valueSpan = periodInput.parentElement?.querySelector('.config-value');
      if (valueSpan) {
        valueSpan.textContent = `${this.currentAdvancedConfig.period}s`;
      }
      this.notifyAdvancedChange();
    });

    // Random seed
    const seedInput = this.container.querySelector('#adv-randomSeed') as HTMLInputElement;
    seedInput?.addEventListener('input', () => {
      this.currentAdvancedConfig.randomSeed = seedInput.value;
      this.notifyAdvancedChange();
    });

    // Per-feature control
    const perFeatureCheckbox = this.container.querySelector('#adv-perFeatureControl') as HTMLInputElement;
    perFeatureCheckbox?.addEventListener('change', () => {
      this.currentAdvancedConfig.interactivity = {
        ...this.currentAdvancedConfig.interactivity,
        perFeatureControl: perFeatureCheckbox.checked,
      };
      this.notifyAdvancedChange();
      this.render(); // Re-render to show/hide conditional fields
    });

    // Initial state
    const initialStateSelect = this.container.querySelector('#adv-initialState') as HTMLSelectElement;
    initialStateSelect?.addEventListener('change', () => {
      this.currentAdvancedConfig.interactivity = {
        ...this.currentAdvancedConfig.interactivity,
        initialState: initialStateSelect.value as 'playing' | 'paused',
      };
      this.notifyAdvancedChange();
    });

    // On click action
    const onClickSelect = this.container.querySelector('#adv-onClick') as HTMLSelectElement;
    onClickSelect?.addEventListener('change', () => {
      const value = onClickSelect.value || undefined;
      this.currentAdvancedConfig.interactivity = {
        ...this.currentAdvancedConfig.interactivity,
        onClick: value as 'toggle' | 'play' | 'pause' | 'reset' | undefined,
      };
      this.notifyAdvancedChange();
    });

    // Hover enter
    const hoverEnterSelect = this.container.querySelector('#adv-onHoverEnter') as HTMLSelectElement;
    hoverEnterSelect?.addEventListener('change', () => {
      const value = hoverEnterSelect.value || undefined;
      this.currentAdvancedConfig.interactivity = {
        ...this.currentAdvancedConfig.interactivity,
        onHover: {
          ...this.currentAdvancedConfig.interactivity?.onHover,
          enter: value as 'play' | 'pause' | undefined,
        },
      };
      this.notifyAdvancedChange();
    });

    // Hover leave
    const hoverLeaveSelect = this.container.querySelector('#adv-onHoverLeave') as HTMLSelectElement;
    hoverLeaveSelect?.addEventListener('change', () => {
      const value = hoverLeaveSelect.value || undefined;
      this.currentAdvancedConfig.interactivity = {
        ...this.currentAdvancedConfig.interactivity,
        onHover: {
          ...this.currentAdvancedConfig.interactivity?.onHover,
          leave: value as 'play' | 'pause' | 'reset' | undefined,
        },
      };
      this.notifyAdvancedChange();
    });
  }

  /**
   * Attach event listeners for expressions section
   */
  private attachExpressionsEventListeners(): void {
    // Toggle section
    const expressionsToggle = this.container.querySelector('#expressions-toggle');
    expressionsToggle?.addEventListener('click', () => {
      this.expressionsExpanded = !this.expressionsExpanded;
      const section = this.container.querySelector('#expressions-section');
      section?.classList.toggle('expanded', this.expressionsExpanded);
    });

    // Preset buttons
    const presetBtns = this.container.querySelectorAll('.expression-preset-btn');
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const presetId = btn.getAttribute('data-preset-id');
        const preset = EXPRESSION_PRESETS.find(p => p.id === presetId);

        if (preset) {
          // Check if this preset is already active - if so, remove its expressions
          const isCurrentlyActive = preset.configKeys.some(key => this.activeExpressions.has(key));

          if (isCurrentlyActive) {
            // Remove expressions for this preset
            for (const key of preset.configKeys) {
              this.activeExpressions.delete(key);
            }
          } else {
            // Add expressions for this preset
            for (const [key, expr] of Object.entries(preset.expressions)) {
              this.activeExpressions.set(key, expr);
            }
          }

          // Notify and re-render
          this.notifyExpressionPreset();
          this.render();
        }
      });
    });

    // Remove individual expression buttons
    const removeBtns = this.container.querySelectorAll('.active-expression-remove');
    removeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = btn.getAttribute('data-key');
        if (key) {
          this.activeExpressions.delete(key);
          this.notifyExpressionPreset();
          this.render();
        }
      });
    });

    // Clear all expressions button
    const clearAllBtn = this.container.querySelector('#clear-all-expressions');
    clearAllBtn?.addEventListener('click', () => {
      this.activeExpressions.clear();
      this.notifyExpressionPreset();
      this.render();
    });
  }

  /**
   * Notify config change callbacks
   */
  private notifyChange(key: string, value: unknown): void {
    if (this.currentEffect) {
      this.changeCallbacks.forEach(cb => cb(this.currentEffect!.id, key, value));
    }
  }

  /**
   * Notify play/pause callbacks
   */
  private notifyPlayPause(playing: boolean): void {
    if (this.currentEffect) {
      this.playPauseCallbacks.forEach(cb => cb(this.currentEffect!.id, playing));
    }
  }

  /**
   * Notify advanced config change callbacks
   */
  private notifyAdvancedChange(): void {
    if (this.currentEffect) {
      this.advancedChangeCallbacks.forEach(cb =>
        cb(this.currentEffect!.id, { ...this.currentAdvancedConfig })
      );
    }
  }

  /**
   * Notify expression preset callbacks
   */
  private notifyExpressionPreset(): void {
    if (this.currentEffect) {
      // Build expressions object from active expressions
      const expressions: Record<string, unknown> = {};
      for (const [key, value] of this.activeExpressions.entries()) {
        expressions[key] = value;
      }
      this.expressionPresetCallbacks.forEach(cb =>
        cb(this.currentEffect!.id, expressions)
      );
    }
  }
}
