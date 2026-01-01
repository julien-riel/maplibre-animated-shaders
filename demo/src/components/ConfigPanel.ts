/**
 * ConfigPanel - Dynamic configuration panel for shader parameters
 * Generates controls based on the shader's configSchema
 * Supports effect context for stacked effects
 */

import type { ShaderDefinition, ConfigSchema, ConfigParamSchema } from '../../../src/types';
import type { StackedEffect, EffectId } from '../types/effectStack';
import { CodePreview } from './CodePreview';

type ChangeCallback = (effectId: EffectId, key: string, value: unknown) => void;
type PlayPauseCallback = (effectId: EffectId, playing: boolean) => void;

/**
 * ConfigPanel component
 */
export class ConfigPanel {
  private container: HTMLElement;
  private changeCallbacks: ChangeCallback[] = [];
  private playPauseCallbacks: PlayPauseCallback[] = [];
  private currentShader: ShaderDefinition | null = null;
  private currentEffect: StackedEffect | null = null;
  private currentConfig: Record<string, unknown> = {};
  private isPlaying: boolean = true;
  private codePreview: CodePreview | null = null;
  private activeTab: 'config' | 'code' = 'config';

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
        ${this.activeTab === 'config' ? this.renderConfigControls() : ''}
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
}
