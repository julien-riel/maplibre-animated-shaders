/**
 * GLSLCompletions - Autocomplete provider for GLSL in Monaco
 */

import type * as Monaco from 'monaco-editor';
import type { GeometryType } from 'maplibre-animated-shaders';
import {
  varyingsByGeometry,
  keywords,
  types,
  builtinFunctions,
  libraryFunctions,
  getAvailableLibraries,
} from './GLSLLanguage';

/**
 * Create completion item
 */
function createCompletionItem(
  monaco: typeof Monaco,
  label: string,
  kind: Monaco.languages.CompletionItemKind,
  detail: string,
  documentation?: string,
  insertText?: string
): Monaco.languages.CompletionItem {
  return {
    label,
    kind,
    detail,
    documentation: documentation ? { value: documentation } : undefined,
    insertText: insertText || label,
    insertTextRules: insertText?.includes('$')
      ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      : undefined,
    range: undefined as unknown as Monaco.IRange,
  };
}

/**
 * GLSL Completion Provider
 */
export class GLSLCompletionProvider implements Monaco.languages.CompletionItemProvider {
  private monaco: typeof Monaco;
  private geometryType: GeometryType = 'point';
  private includedLibraries: Set<string> = new Set();

  constructor(monaco: typeof Monaco) {
    this.monaco = monaco;
  }

  /**
   * Set current geometry type for context-aware completions
   */
  setGeometryType(geometry: GeometryType): void {
    this.geometryType = geometry;
  }

  /**
   * Update included libraries from shader source
   */
  updateIncludedLibraries(source: string): void {
    this.includedLibraries.clear();
    const regex = /#include\s*[<"](\w+)[>"]/g;
    let match;
    while ((match = regex.exec(source)) !== null) {
      this.includedLibraries.add(match[1]);
    }
  }

  /**
   * Check if we're in an #include context
   */
  private isIncludeContext(lineContent: string, column: number): boolean {
    const beforeCursor = lineContent.substring(0, column - 1);
    return /#include\s*[<"]?\w*$/.test(beforeCursor);
  }

  /**
   * Check if we're typing a varying name
   */
  private isVaryingContext(lineContent: string, column: number): boolean {
    const beforeCursor = lineContent.substring(0, column - 1);
    return /\bv_\w*$/.test(beforeCursor);
  }

  /**
   * Check if we're typing a uniform name
   */
  private isUniformContext(lineContent: string, column: number): boolean {
    const beforeCursor = lineContent.substring(0, column - 1);
    return /\bu_\w*$/.test(beforeCursor);
  }

  /**
   * Get library completions for #include
   */
  private getLibraryCompletions(): Monaco.languages.CompletionItem[] {
    const libraries = getAvailableLibraries();
    return libraries.map((lib) =>
      createCompletionItem(
        this.monaco,
        lib,
        this.monaco.languages.CompletionItemKind.Module,
        `GLSL library: ${lib}`,
        `Include the ${lib} library functions`,
        lib
      )
    );
  }

  /**
   * Get varying completions based on geometry type
   */
  private getVaryingCompletions(): Monaco.languages.CompletionItem[] {
    const varyings = varyingsByGeometry[this.geometryType] || [];
    return varyings.map((v) =>
      createCompletionItem(
        this.monaco,
        v.name,
        this.monaco.languages.CompletionItemKind.Variable,
        `${v.type} - ${v.description}`,
        `**${v.name}** (${v.type})\n\n${v.description}`,
        v.name
      )
    );
  }

  /**
   * Get common uniform completions
   */
  private getUniformCompletions(): Monaco.languages.CompletionItem[] {
    const uniforms = [
      { name: 'u_time', type: 'float', description: 'Animation time' },
      { name: 'u_matrix', type: 'mat4', description: 'Projection matrix' },
      { name: 'u_resolution', type: 'vec2', description: 'Canvas resolution' },
      { name: 'u_speed', type: 'float', description: 'Animation speed' },
      { name: 'u_intensity', type: 'float', description: 'Effect intensity' },
      { name: 'u_color', type: 'vec4', description: 'Base color' },
    ];
    return uniforms.map((u) =>
      createCompletionItem(
        this.monaco,
        u.name,
        this.monaco.languages.CompletionItemKind.Constant,
        `${u.type} - ${u.description}`,
        `**${u.name}** (${u.type})\n\n${u.description}`,
        u.name
      )
    );
  }

  /**
   * Get function completions from included libraries
   */
  private getFunctionCompletions(): Monaco.languages.CompletionItem[] {
    const items: Monaco.languages.CompletionItem[] = [];

    // Built-in GLSL functions
    builtinFunctions.forEach((fn) => {
      items.push(
        createCompletionItem(
          this.monaco,
          fn,
          this.monaco.languages.CompletionItemKind.Function,
          'Built-in GLSL function',
          undefined,
          `${fn}($0)`
        )
      );
    });

    // Library functions from included libraries
    this.includedLibraries.forEach((lib) => {
      const functions = libraryFunctions[lib as keyof typeof libraryFunctions] || [];
      functions.forEach((fn) => {
        items.push(
          createCompletionItem(
            this.monaco,
            fn,
            this.monaco.languages.CompletionItemKind.Function,
            `${lib} library function`,
            `Function from **${lib}** library`,
            `${fn}($0)`
          )
        );
      });
    });

    return items;
  }

  /**
   * Get keyword and type completions
   */
  private getKeywordCompletions(): Monaco.languages.CompletionItem[] {
    const items: Monaco.languages.CompletionItem[] = [];

    keywords.forEach((kw) => {
      items.push(
        createCompletionItem(
          this.monaco,
          kw,
          this.monaco.languages.CompletionItemKind.Keyword,
          'GLSL keyword'
        )
      );
    });

    types.forEach((t) => {
      items.push(
        createCompletionItem(
          this.monaco,
          t,
          this.monaco.languages.CompletionItemKind.TypeParameter,
          'GLSL type'
        )
      );
    });

    return items;
  }

  /**
   * Provide completions
   */
  provideCompletionItems(
    model: Monaco.editor.ITextModel,
    position: Monaco.Position
  ): Monaco.languages.CompletionList {
    const lineContent = model.getLineContent(position.lineNumber);
    const suggestions: Monaco.languages.CompletionItem[] = [];

    // Update included libraries
    this.updateIncludedLibraries(model.getValue());

    // Context-aware completions
    if (this.isIncludeContext(lineContent, position.column)) {
      suggestions.push(...this.getLibraryCompletions());
    } else if (this.isVaryingContext(lineContent, position.column)) {
      suggestions.push(...this.getVaryingCompletions());
    } else if (this.isUniformContext(lineContent, position.column)) {
      suggestions.push(...this.getUniformCompletions());
    } else {
      // General completions
      suggestions.push(...this.getKeywordCompletions());
      suggestions.push(...this.getFunctionCompletions());
      suggestions.push(...this.getVaryingCompletions());
      suggestions.push(...this.getUniformCompletions());
    }

    return { suggestions };
  }

  /**
   * Trigger characters
   */
  get triggerCharacters(): string[] {
    return ['<', '"', '_', '.'];
  }
}

/**
 * Create and register completion provider
 */
export function createCompletionProvider(monaco: typeof Monaco): GLSLCompletionProvider {
  const provider = new GLSLCompletionProvider(monaco);
  monaco.languages.registerCompletionItemProvider('glsl', provider);
  return provider;
}
