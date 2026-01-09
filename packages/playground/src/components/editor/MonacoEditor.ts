/**
 * MonacoEditor - Monaco editor wrapper for GLSL
 */

import * as monaco from 'monaco-editor';
import type { GeometryType } from 'maplibre-animated-shaders';
import { registerGLSLLanguage } from './GLSLLanguage';
import { GLSLCompletionProvider, createCompletionProvider } from './GLSLCompletions';
import { GLSLHoverProvider, createHoverProvider } from './GLSLHoverProvider';
import type { CompilationError } from '../../state';

// Register GLSL language
let languageRegistered = false;

export interface MonacoEditorOptions {
  container: HTMLElement;
  value?: string;
  onChange?: (value: string) => void;
  onSave?: (value: string) => void;
  readOnly?: boolean;
}

/**
 * Monaco Editor wrapper
 */
export class MonacoEditor {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private completionProvider: GLSLCompletionProvider;
  private hoverProvider: GLSLHoverProvider;
  private decorations: string[] = [];
  private onChange?: (value: string) => void;

  constructor(options: MonacoEditorOptions) {
    // Register language if not already done
    if (!languageRegistered) {
      registerGLSLLanguage(monaco);
      languageRegistered = true;
    }

    // Create providers
    this.completionProvider = createCompletionProvider(monaco);
    this.hoverProvider = createHoverProvider(monaco);

    // Create editor
    this.editor = monaco.editor.create(options.container, {
      value: options.value || '',
      language: 'glsl',
      theme: 'vs-dark',
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontLigatures: true,
      lineNumbers: 'on',
      renderLineHighlight: 'all',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      wordWrap: 'on',
      readOnly: options.readOnly || false,
      glyphMargin: true,
      folding: true,
      lineDecorationsWidth: 10,
      scrollbar: {
        vertical: 'auto',
        horizontal: 'auto',
        useShadows: false,
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8,
      },
    });

    // Store onChange handler
    this.onChange = options.onChange;

    // Listen for content changes
    this.editor.onDidChangeModelContent(() => {
      if (this.onChange) {
        this.onChange(this.editor.getValue());
      }
    });

    // Add save shortcut
    if (options.onSave) {
      this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        options.onSave!(this.editor.getValue());
      });
    }

    // Add compile shortcut (Ctrl+Enter)
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (this.onChange) {
        this.onChange(this.editor.getValue());
      }
    });
  }

  /**
   * Get current value
   */
  getValue(): string {
    return this.editor.getValue();
  }

  /**
   * Set editor value
   */
  setValue(value: string): void {
    const position = this.editor.getPosition();
    this.editor.setValue(value);
    if (position) {
      this.editor.setPosition(position);
    }
  }

  /**
   * Set geometry type for context-aware completions
   */
  setGeometryType(geometry: GeometryType): void {
    this.completionProvider.setGeometryType(geometry);
    this.hoverProvider.setGeometryType(geometry);
  }

  /**
   * Show compilation errors in the editor
   */
  showErrors(errors: CompilationError[]): void {
    const model = this.editor.getModel();
    if (!model) return;

    // Create markers
    const markers: monaco.editor.IMarkerData[] = errors.map((err) => ({
      severity:
        err.type === 'error'
          ? monaco.MarkerSeverity.Error
          : monaco.MarkerSeverity.Warning,
      message: err.message,
      startLineNumber: err.line,
      startColumn: err.column || 1,
      endLineNumber: err.line,
      endColumn: model.getLineMaxColumn(err.line) || 1,
    }));

    monaco.editor.setModelMarkers(model, 'glsl', markers);

    // Add line decorations
    const newDecorations: monaco.editor.IModelDeltaDecoration[] = errors.map((err) => ({
      range: new monaco.Range(err.line, 1, err.line, 1),
      options: {
        isWholeLine: true,
        className: err.type === 'error' ? 'error-line-decoration' : 'warning-line-decoration',
        glyphMarginClassName:
          err.type === 'error' ? 'error-glyph-margin' : 'warning-glyph-margin',
      },
    }));

    this.decorations = this.editor.deltaDecorations(this.decorations, newDecorations);
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    const model = this.editor.getModel();
    if (model) {
      monaco.editor.setModelMarkers(model, 'glsl', []);
    }
    this.decorations = this.editor.deltaDecorations(this.decorations, []);
  }

  /**
   * Focus the editor
   */
  focus(): void {
    this.editor.focus();
  }

  /**
   * Get editor instance
   */
  getEditor(): monaco.editor.IStandaloneCodeEditor {
    return this.editor;
  }

  /**
   * Layout editor (call when container resizes)
   */
  layout(): void {
    this.editor.layout();
  }

  /**
   * Dispose editor
   */
  dispose(): void {
    this.editor.dispose();
  }
}

/**
 * Add custom CSS for error decorations
 */
export function addEditorStyles(): void {
  const style = document.createElement('style');
  style.textContent = `
    .error-line-decoration {
      background: rgba(248, 81, 73, 0.15);
    }
    .warning-line-decoration {
      background: rgba(210, 153, 34, 0.15);
    }
    .error-glyph-margin {
      background: #f85149;
      border-radius: 50%;
      margin-left: 4px;
      width: 8px !important;
      height: 8px !important;
      margin-top: 6px;
    }
    .warning-glyph-margin {
      background: #d29922;
      border-radius: 50%;
      margin-left: 4px;
      width: 8px !important;
      height: 8px !important;
      margin-top: 6px;
    }
  `;
  document.head.appendChild(style);
}
