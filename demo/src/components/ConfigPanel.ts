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

type ChangeCallback = (effectId: EffectId, key: string, value: unknown) => void;
type PlayPauseCallback = (effectId: EffectId, playing: boolean) => void;
type AdvancedChangeCallback = (effectId: EffectId, advancedConfig: AdvancedEffectConfig) => void;

/**
 * ConfigPanel component
 */
export class ConfigPanel {
  private container: HTMLElement;
  private changeCallbacks: ChangeCallback[] = [];
  private playPauseCallbacks: PlayPauseCallback[] = [];
  private advancedChangeCallbacks: AdvancedChangeCallback[] = [];
  private currentShader: ShaderDefinition | null = null;
  private currentEffect: StackedEffect | null = null;
  private currentConfig: Record<string, unknown> = {};
  private currentAdvancedConfig: AdvancedEffectConfig = createDefaultAdvancedConfig();
  private isPlaying: boolean = true;
  private codePreview: CodePreview | null = null;
  private activeTab: 'config' | 'code' = 'config';
  private advancedExpanded: boolean = false;

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
        ${this.activeTab === 'config' ? this.renderConfigControls() + this.renderAdvancedSection() : ''}
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
}
