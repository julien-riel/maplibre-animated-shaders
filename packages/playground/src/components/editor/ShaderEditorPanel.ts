/**
 * ShaderEditorPanel - Container for Monaco editor with tabs
 */

import type { GeometryType } from 'maplibre-animated-shaders';
import { MonacoEditor, addEditorStyles } from './MonacoEditor';
import { store } from '../../state';
import type { CompilationError } from '../../state';

export interface ShaderEditorPanelOptions {
  container: HTMLElement;
  onCompile: (fragment: string, vertex: string | null) => void;
}

/**
 * ShaderEditorPanel component
 */
export class ShaderEditorPanel {
  private container: HTMLElement;
  private fragmentEditor: MonacoEditor | null = null;
  private vertexEditor: MonacoEditor | null = null;
  private onCompile: (fragment: string, vertex: string | null) => void;
  private compileTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(options: ShaderEditorPanelOptions) {
    this.container = options.container;
    this.onCompile = options.onCompile;
    addEditorStyles();
    this.render();
    this.initEditors();
    this.subscribeToStore();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="editor-container">
        <div class="editor-tabs">
          <button class="editor-tab active" data-tab="fragment">Fragment</button>
          <button class="editor-tab" data-tab="vertex">Vertex (Custom)</button>
        </div>
        <div class="monaco-wrapper" id="fragment-editor"></div>
        <div class="monaco-wrapper" id="vertex-editor" style="display: none;"></div>
        <div class="error-panel" id="error-panel" style="display: none;"></div>
      </div>
    `;

    // Tab switching
    const tabs = this.container.querySelectorAll('.editor-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const tabId = tab.getAttribute('data-tab') as 'fragment' | 'vertex';
        this.switchTab(tabId);
      });
    });
  }

  private initEditors(): void {
    const fragmentContainer = this.container.querySelector('#fragment-editor') as HTMLElement;
    const vertexContainer = this.container.querySelector('#vertex-editor') as HTMLElement;

    const currentShader = store.getCurrentShader();

    // Create fragment editor
    this.fragmentEditor = new MonacoEditor({
      container: fragmentContainer,
      value: currentShader?.fragmentShader || '',
      onChange: (value) => {
        store.updateFragmentShader(value);
        this.scheduleCompile();
      },
    });

    // Create vertex editor
    this.vertexEditor = new MonacoEditor({
      container: vertexContainer,
      value: currentShader?.vertexShader || '',
      onChange: (value) => {
        store.updateVertexShader(value || null);
        this.scheduleCompile();
      },
    });

    // Set initial geometry type
    const state = store.getState();
    this.setGeometryType(state.currentShader);
  }

  private subscribeToStore(): void {
    store.on('state:changed', ({ state }) => {
      // Update editors when shader changes
      const currentShader = state.shaders[state.currentShader];
      if (currentShader && this.fragmentEditor && this.vertexEditor) {
        if (this.fragmentEditor.getValue() !== currentShader.fragmentShader) {
          this.fragmentEditor.setValue(currentShader.fragmentShader);
        }
        if (this.vertexEditor.getValue() !== (currentShader.vertexShader || '')) {
          this.vertexEditor.setValue(currentShader.vertexShader || '');
        }
        this.setGeometryType(state.currentShader);
      }

      // Update error display
      this.showErrors(state.ui.compilationErrors);
    });
  }

  private switchTab(tab: 'fragment' | 'vertex'): void {
    store.setActiveShaderTab(tab);

    // Update tab buttons
    const tabs = this.container.querySelectorAll('.editor-tab');
    tabs.forEach((t) => {
      t.classList.toggle('active', t.getAttribute('data-tab') === tab);
    });

    // Show/hide editors
    const fragmentContainer = this.container.querySelector('#fragment-editor') as HTMLElement;
    const vertexContainer = this.container.querySelector('#vertex-editor') as HTMLElement;

    fragmentContainer.style.display = tab === 'fragment' ? 'block' : 'none';
    vertexContainer.style.display = tab === 'vertex' ? 'block' : 'none';

    // Focus active editor
    if (tab === 'fragment') {
      this.fragmentEditor?.focus();
      this.fragmentEditor?.layout();
    } else {
      this.vertexEditor?.focus();
      this.vertexEditor?.layout();
    }
  }

  /**
   * Set geometry type for context-aware completions
   */
  setGeometryType(geometry: GeometryType): void {
    this.fragmentEditor?.setGeometryType(geometry);
    this.vertexEditor?.setGeometryType(geometry);
  }

  /**
   * Schedule compilation with debounce
   */
  private scheduleCompile(): void {
    if (this.compileTimeout) {
      clearTimeout(this.compileTimeout);
    }
    this.compileTimeout = setTimeout(() => {
      this.compile();
    }, 300);
  }

  /**
   * Trigger compilation
   */
  compile(): void {
    const fragment = this.fragmentEditor?.getValue() || '';
    const vertex = this.vertexEditor?.getValue() || null;
    this.onCompile(fragment, vertex);
  }

  /**
   * Show compilation errors
   */
  showErrors(errors: CompilationError[]): void {
    const errorPanel = this.container.querySelector('#error-panel') as HTMLElement;

    // Update Monaco markers
    const fragmentErrors = errors.filter((e) => e.source === 'fragment');
    const vertexErrors = errors.filter((e) => e.source === 'vertex');

    this.fragmentEditor?.showErrors(fragmentErrors);
    this.vertexEditor?.showErrors(vertexErrors);

    // Update error panel
    if (errors.length === 0) {
      errorPanel.style.display = 'none';
      return;
    }

    errorPanel.style.display = 'block';
    errorPanel.innerHTML = errors
      .map(
        (err) => `
        <div class="error-item ${err.type}">
          <span class="error-line">${err.source}:${err.line}</span>
          <span class="error-message">${err.message}</span>
        </div>
      `
      )
      .join('');
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.fragmentEditor?.clearErrors();
    this.vertexEditor?.clearErrors();

    const errorPanel = this.container.querySelector('#error-panel') as HTMLElement;
    errorPanel.style.display = 'none';
  }

  /**
   * Layout editors
   */
  layout(): void {
    this.fragmentEditor?.layout();
    this.vertexEditor?.layout();
  }

  /**
   * Dispose editors
   */
  dispose(): void {
    this.fragmentEditor?.dispose();
    this.vertexEditor?.dispose();
    if (this.compileTimeout) {
      clearTimeout(this.compileTimeout);
    }
  }
}
