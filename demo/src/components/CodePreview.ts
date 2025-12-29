/**
 * CodePreview - Generates code snippet for shader integration
 * Shows how to use the current shader with the current configuration
 */

/**
 * CodePreview component
 */
export class CodePreview {
  private container: HTMLElement;
  private currentShader: string = '';
  private currentConfig: Record<string, unknown> = {};

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) {
      throw new Error(`Container #${containerId} not found`);
    }
    this.container = el;
  }

  /**
   * Update the code preview with current shader and config
   */
  update(shaderName: string, config: Record<string, unknown>): void {
    this.currentShader = shaderName;
    this.currentConfig = config;
    this.render();
  }

  /**
   * Render the code preview
   */
  private render(): void {
    const code = this.generateCode();

    this.container.innerHTML = `
      <div class="code-preview">
        <div class="code-header">
          <span>Integration Code</span>
          <button class="code-copy-btn" id="copy-code">Copy</button>
        </div>
        <div class="code-content">
          <pre><code>${this.highlightSyntax(code)}</code></pre>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Generate the integration code
   */
  private generateCode(): string {
    const configStr = this.formatConfig(this.currentConfig);

    return `import { createShaderManager, registerAllShaders } from 'maplibre-gl-shaders';
import maplibregl from 'maplibre-gl';

// Register all built-in shaders
registerAllShaders();

// Create your map
const map = new maplibregl.Map({
  container: 'map',
  style: 'https://demotiles.maplibre.org/style.json',
  center: [2.35, 48.85],
  zoom: 12
});

map.on('load', () => {
  // Add your data source
  map.addSource('my-points', {
    type: 'geojson',
    data: yourGeoJSONData
  });

  // Add a circle layer
  map.addLayer({
    id: 'my-layer',
    type: 'circle',
    source: 'my-points',
    paint: {
      'circle-radius': 8,
      'circle-color': '#3b82f6'
    }
  });

  // Apply the shader
  const manager = createShaderManager(map);
  manager.register('my-layer', '${this.currentShader}', ${configStr});
});`;
  }

  /**
   * Format config object as code string
   */
  private formatConfig(config: Record<string, unknown>): string {
    const entries = Object.entries(config)
      .filter(([key]) => key !== 'enabled')
      .map(([key, value]) => {
        if (typeof value === 'string') {
          return `    ${key}: '${value}'`;
        } else if (typeof value === 'boolean') {
          return `    ${key}: ${value}`;
        } else {
          return `    ${key}: ${value}`;
        }
      });

    if (entries.length === 0) {
      return '{}';
    }

    return `{\n${entries.join(',\n')}\n  }`;
  }

  /**
   * Basic syntax highlighting
   */
  private highlightSyntax(code: string): string {
    return code
      // Keywords
      .replace(/\b(import|from|const|let|var|function|return|new|if|else)\b/g,
        '<span class="keyword">$1</span>')
      // Strings
      .replace(/'([^']*)'/g, '<span class="string">\'$1\'</span>')
      // Comments
      .replace(/(\/\/.*)/g, '<span class="comment">$1</span>')
      // Numbers
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>')
      // Properties
      .replace(/(\w+):/g, '<span class="property">$1</span>:')
      // Methods
      .replace(/\.(\w+)\(/g, '.<span class="method">$1</span>(');
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    const copyBtn = this.container.querySelector('#copy-code');
    copyBtn?.addEventListener('click', async () => {
      const code = this.generateCode();
      try {
        await navigator.clipboard.writeText(code);
        if (copyBtn) {
          const originalText = copyBtn.textContent;
          copyBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.textContent = originalText;
          }, 2000);
        }
      } catch {
        console.error('Failed to copy code');
      }
    });
  }
}
