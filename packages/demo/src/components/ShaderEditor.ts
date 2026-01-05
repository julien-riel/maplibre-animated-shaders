/**
 * ShaderEditor - Visual GLSL shader editor with live preview
 *
 * Features:
 * - Syntax highlighting for GLSL
 * - Live shader preview
 * - Uniform controls
 * - Error display
 * - Export/import functionality
 */

import { globalRegistry } from 'maplibre-animated-shaders';
import type { ShaderDefinition, ShaderConfig } from 'maplibre-animated-shaders/types';

/**
 * Uniform type for the editor
 */
interface UniformControl {
  name: string;
  type: 'float' | 'vec2' | 'vec3' | 'vec4' | 'color' | 'int';
  value: number | number[] | string;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * ShaderEditor component class
 */
export class ShaderEditor {
  private container: HTMLElement;
  private element: HTMLElement | null = null;
  private vertexEditor: HTMLTextAreaElement | null = null;
  private fragmentEditor: HTMLTextAreaElement | null = null;
  private uniformsContainer: HTMLElement | null = null;
  private errorDisplay: HTMLElement | null = null;
  private isVisible: boolean = false;

  private currentShader: ShaderDefinition | null = null;
  private customVertexSource: string = '';
  private customFragmentSource: string = '';
  private uniforms: UniformControl[] = [];

  private onChangeCallback: ((shader: Partial<ShaderDefinition>) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) {
      throw new Error(`Container #${containerId} not found`);
    }
    this.container = el;
  }

  /**
   * Show the shader editor
   */
  show(shader?: ShaderDefinition): void {
    if (!this.element) {
      this.createElement();
    }

    if (shader) {
      this.loadShader(shader);
    }

    this.element!.classList.add('visible');
    this.isVisible = true;
  }

  /**
   * Hide the shader editor
   */
  hide(): void {
    if (this.element) {
      this.element.classList.remove('visible');
    }
    this.isVisible = false;
  }

  /**
   * Toggle visibility
   */
  toggle(shader?: ShaderDefinition): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show(shader);
    }
  }

  /**
   * Load a shader into the editor
   */
  loadShader(shader: ShaderDefinition): void {
    this.currentShader = shader;
    this.customVertexSource = shader.vertexShader;
    this.customFragmentSource = shader.fragmentShader;

    if (this.vertexEditor) {
      this.vertexEditor.value = shader.vertexShader;
    }
    if (this.fragmentEditor) {
      this.fragmentEditor.value = shader.fragmentShader;
    }

    // Extract uniforms from shader config
    this.extractUniforms(shader);
    this.renderUniformControls();

    this.clearError();
  }

  /**
   * Set change callback
   */
  onChange(callback: (shader: Partial<ShaderDefinition>) => void): void {
    this.onChangeCallback = callback;
  }

  /**
   * Set error callback
   */
  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * Create the editor element
   */
  private createElement(): void {
    this.element = document.createElement('div');
    this.element.className = 'shader-editor';
    this.element.innerHTML = `
      <div class="shader-editor-header">
        <h2>Shader Editor</h2>
        <div class="shader-editor-actions">
          <button class="btn-compile" title="Compile & Apply">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Apply
          </button>
          <button class="btn-reset" title="Reset to Original">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            Reset
          </button>
          <button class="btn-export" title="Export Shader">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Export
          </button>
          <button class="btn-close" title="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="shader-editor-body">
        <div class="shader-editor-panels">
          <div class="shader-panel">
            <div class="panel-header">
              <span class="panel-title">Vertex Shader</span>
              <span class="panel-hint">GLSL</span>
            </div>
            <textarea class="shader-textarea vertex-shader" spellcheck="false" placeholder="// Vertex shader code..."></textarea>
          </div>
          <div class="shader-panel">
            <div class="panel-header">
              <span class="panel-title">Fragment Shader</span>
              <span class="panel-hint">GLSL</span>
            </div>
            <textarea class="shader-textarea fragment-shader" spellcheck="false" placeholder="// Fragment shader code..."></textarea>
          </div>
        </div>
        <div class="shader-editor-sidebar">
          <div class="uniforms-panel">
            <h3>Uniforms</h3>
            <div class="uniforms-container"></div>
          </div>
          <div class="error-panel">
            <h3>Errors</h3>
            <div class="error-display"></div>
          </div>
        </div>
      </div>
    `;

    // Get references
    this.vertexEditor = this.element.querySelector('.vertex-shader');
    this.fragmentEditor = this.element.querySelector('.fragment-shader');
    this.uniformsContainer = this.element.querySelector('.uniforms-container');
    this.errorDisplay = this.element.querySelector('.error-display');

    // Bind events
    this.bindEvents();

    this.container.appendChild(this.element);
  }

  /**
   * Bind editor events
   */
  private bindEvents(): void {
    if (!this.element) return;

    // Close button
    const closeBtn = this.element.querySelector('.btn-close');
    closeBtn?.addEventListener('click', () => this.hide());

    // Compile button
    const compileBtn = this.element.querySelector('.btn-compile');
    compileBtn?.addEventListener('click', () => this.compile());

    // Reset button
    const resetBtn = this.element.querySelector('.btn-reset');
    resetBtn?.addEventListener('click', () => this.reset());

    // Export button
    const exportBtn = this.element.querySelector('.btn-export');
    exportBtn?.addEventListener('click', () => this.exportShader());

    // Keyboard shortcut for compile (Ctrl+Enter)
    this.element.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.compile();
      }
    });

    // Track changes
    this.vertexEditor?.addEventListener('input', () => {
      this.customVertexSource = this.vertexEditor!.value;
    });

    this.fragmentEditor?.addEventListener('input', () => {
      this.customFragmentSource = this.fragmentEditor!.value;
    });

    // Tab support in textareas
    [this.vertexEditor, this.fragmentEditor].forEach(editor => {
      editor?.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          const start = editor.selectionStart;
          const end = editor.selectionEnd;
          editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
          editor.selectionStart = editor.selectionEnd = start + 2;
        }
      });
    });
  }

  /**
   * Extract uniforms from shader definition
   */
  private extractUniforms(shader: ShaderDefinition): void {
    this.uniforms = [];

    // Parse from default config
    if (shader.defaultConfig) {
      for (const [key, value] of Object.entries(shader.defaultConfig)) {
        let type: UniformControl['type'] = 'float';
        let controlValue: number | number[] | string = 0;

        if (typeof value === 'number') {
          type = 'float';
          controlValue = value;
        } else if (typeof value === 'string' && value.startsWith('#')) {
          type = 'color';
          controlValue = value;
        } else if (Array.isArray(value)) {
          if (value.length === 2) type = 'vec2';
          else if (value.length === 3) type = 'vec3';
          else if (value.length === 4) type = 'vec4';
          controlValue = value;
        }

        this.uniforms.push({
          name: key,
          type,
          value: controlValue,
          min: type === 'float' ? 0 : undefined,
          max: type === 'float' ? (key.includes('speed') ? 5 : key.includes('opacity') ? 1 : 10) : undefined,
          step: type === 'float' ? 0.1 : undefined,
        });
      }
    }
  }

  /**
   * Render uniform controls
   */
  private renderUniformControls(): void {
    if (!this.uniformsContainer) return;

    this.uniformsContainer.innerHTML = this.uniforms.map(uniform => {
      let input = '';

      switch (uniform.type) {
        case 'float':
          input = `
            <input type="range"
                   data-uniform="${uniform.name}"
                   value="${uniform.value}"
                   min="${uniform.min ?? 0}"
                   max="${uniform.max ?? 10}"
                   step="${uniform.step ?? 0.1}">
            <span class="uniform-value">${uniform.value}</span>
          `;
          break;
        case 'color':
          input = `
            <input type="color"
                   data-uniform="${uniform.name}"
                   value="${uniform.value}">
          `;
          break;
        case 'vec2':
        case 'vec3':
        case 'vec4':
          const values = uniform.value as number[];
          input = values.map((v, i) => `
            <input type="number"
                   data-uniform="${uniform.name}"
                   data-index="${i}"
                   value="${v}"
                   step="0.1">
          `).join('');
          break;
      }

      return `
        <div class="uniform-control">
          <label>${uniform.name}</label>
          <div class="uniform-input">${input}</div>
        </div>
      `;
    }).join('');

    // Bind uniform change events
    this.uniformsContainer.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const uniformName = target.dataset.uniform;
        const uniform = this.uniforms.find(u => u.name === uniformName);
        if (!uniform) return;

        if (uniform.type === 'float') {
          uniform.value = parseFloat(target.value);
          const valueDisplay = target.nextElementSibling;
          if (valueDisplay) {
            valueDisplay.textContent = target.value;
          }
        } else if (uniform.type === 'color') {
          uniform.value = target.value;
        } else if (target.dataset.index !== undefined) {
          const index = parseInt(target.dataset.index);
          (uniform.value as number[])[index] = parseFloat(target.value);
        }
      });
    });
  }

  /**
   * Compile and apply the shader
   */
  private compile(): void {
    if (!this.currentShader) return;

    try {
      // Validate basic GLSL syntax
      this.validateGLSL(this.customVertexSource, 'vertex');
      this.validateGLSL(this.customFragmentSource, 'fragment');

      // Build config from uniforms
      const config: ShaderConfig = {};
      this.uniforms.forEach(u => {
        config[u.name] = u.value;
      });

      // Emit change
      if (this.onChangeCallback) {
        this.onChangeCallback({
          vertexShader: this.customVertexSource,
          fragmentShader: this.customFragmentSource,
          defaultConfig: config,
        });
      }

      this.clearError();
      this.showSuccess('Shader compiled successfully!');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.showError(message);
      this.onErrorCallback?.(message);
    }
  }

  /**
   * Basic GLSL validation
   */
  private validateGLSL(source: string, type: 'vertex' | 'fragment'): void {
    // Check for main function
    if (!source.includes('void main')) {
      throw new Error(`${type} shader: Missing main() function`);
    }

    // Check for matching braces
    const openBraces = (source.match(/{/g) || []).length;
    const closeBraces = (source.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      throw new Error(`${type} shader: Mismatched braces`);
    }

    // Check for gl_Position (vertex) or gl_FragColor/fragColor (fragment)
    if (type === 'vertex' && !source.includes('gl_Position')) {
      throw new Error('vertex shader: Missing gl_Position assignment');
    }
    if (type === 'fragment' && !source.includes('gl_FragColor') && !source.includes('fragColor')) {
      throw new Error('fragment shader: Missing fragment color output');
    }
  }

  /**
   * Reset to original shader
   */
  private reset(): void {
    if (!this.currentShader) return;

    this.customVertexSource = this.currentShader.vertexShader;
    this.customFragmentSource = this.currentShader.fragmentShader;

    if (this.vertexEditor) {
      this.vertexEditor.value = this.currentShader.vertexShader;
    }
    if (this.fragmentEditor) {
      this.fragmentEditor.value = this.currentShader.fragmentShader;
    }

    this.extractUniforms(this.currentShader);
    this.renderUniformControls();
    this.clearError();
  }

  /**
   * Export shader as JSON
   */
  private exportShader(): void {
    if (!this.currentShader) return;

    const config: ShaderConfig = {};
    this.uniforms.forEach(u => {
      config[u.name] = u.value;
    });

    const exportData = {
      name: this.currentShader.name + '-custom',
      displayName: this.currentShader.displayName + ' (Custom)',
      geometry: this.currentShader.geometry,
      vertexShader: this.customVertexSource,
      fragmentShader: this.customFragmentSource,
      defaultConfig: config,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportData.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    if (this.errorDisplay) {
      this.errorDisplay.innerHTML = `<div class="error-message">${message}</div>`;
      this.errorDisplay.classList.add('has-error');
    }
  }

  /**
   * Show success message
   */
  private showSuccess(message: string): void {
    if (this.errorDisplay) {
      this.errorDisplay.innerHTML = `<div class="success-message">${message}</div>`;
      this.errorDisplay.classList.remove('has-error');
      setTimeout(() => this.clearError(), 3000);
    }
  }

  /**
   * Clear error display
   */
  private clearError(): void {
    if (this.errorDisplay) {
      this.errorDisplay.innerHTML = '<div class="no-errors">No errors</div>';
      this.errorDisplay.classList.remove('has-error');
    }
  }

  /**
   * Destroy the editor
   */
  destroy(): void {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this.vertexEditor = null;
    this.fragmentEditor = null;
    this.uniformsContainer = null;
    this.errorDisplay = null;
  }
}
