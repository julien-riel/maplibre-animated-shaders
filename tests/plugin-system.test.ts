/**
 * Tests for Plugin System
 *
 * Tests cover:
 * - Plugin validation
 * - Plugin registration/unregistration
 * - Namespace support
 * - Shader name resolution
 * - Lifecycle hooks
 * - Presets
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PluginManager, validatePlugin, NAMESPACE_SEPARATOR } from '../src/plugins';
import { ShaderRegistry } from '../src/ShaderRegistry';
import type { ShaderPlugin, ShaderDefinition, IShaderManager } from '../src/types';

/**
 * Create a minimal mock shader definition for testing
 */
function createMockShaderDefinition(name: string, geometry: 'point' | 'line' | 'polygon' = 'point'): ShaderDefinition {
  return {
    name,
    displayName: `Test ${name}`,
    description: `Test shader ${name}`,
    geometry,
    tags: ['test'],
    fragmentShader: 'void main() { gl_FragColor = vec4(1.0); }',
    defaultConfig: { speed: 1.0, intensity: 1.0 },
    configSchema: {
      speed: { type: 'number', default: 1.0 },
      intensity: { type: 'number', default: 1.0 },
    },
    getUniforms: () => ({}),
  };
}

/**
 * Create a valid test plugin
 */
function createTestPlugin(name: string, shaderNames: string[] = ['effect1', 'effect2']): ShaderPlugin {
  return {
    name,
    version: '1.0.0',
    author: 'Test Author',
    description: 'Test plugin',
    shaders: shaderNames.map((sn) => createMockShaderDefinition(sn)),
  };
}

/**
 * Create a mock IShaderManager
 */
function createMockShaderManager(): IShaderManager {
  return {
    register: vi.fn(),
    unregister: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    setSpeed: vi.fn(),
    updateConfig: vi.fn(),
    destroy: vi.fn(),
    getRegisteredLayers: vi.fn(() => []),
  };
}

describe('Plugin System', () => {
  describe('validatePlugin', () => {
    it('should validate a correct plugin', () => {
      const plugin = createTestPlugin('valid-plugin');
      const result = validatePlugin(plugin);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject plugin without name', () => {
      const plugin = createTestPlugin('');
      const result = validatePlugin(plugin);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'MISSING_NAME')).toBe(true);
    });

    it('should reject plugin with namespace separator in name', () => {
      const plugin = createTestPlugin('invalid:name');
      const result = validatePlugin(plugin);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'MISSING_NAME')).toBe(true);
    });

    it('should reject plugin without version', () => {
      const plugin = createTestPlugin('test');
      (plugin as { version: string | undefined }).version = undefined;
      const result = validatePlugin(plugin);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'MISSING_VERSION')).toBe(true);
    });

    it('should reject plugin with invalid semver version', () => {
      const plugin = createTestPlugin('test');
      plugin.version = 'not-a-version';
      const result = validatePlugin(plugin);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_VERSION')).toBe(true);
    });

    it('should accept semver with prerelease tag', () => {
      const plugin = createTestPlugin('test');
      plugin.version = '1.0.0-beta.1';
      const result = validatePlugin(plugin);

      expect(result.valid).toBe(true);
    });

    it('should accept semver with build metadata', () => {
      const plugin = createTestPlugin('test');
      plugin.version = '1.0.0+build.123';
      const result = validatePlugin(plugin);

      expect(result.valid).toBe(true);
    });

    it('should reject plugin without shaders', () => {
      const plugin = createTestPlugin('test', []);
      const result = validatePlugin(plugin);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'NO_SHADERS')).toBe(true);
    });

    it('should reject plugin with duplicate shader names', () => {
      const plugin = createTestPlugin('test', ['effect', 'effect']);
      const result = validatePlugin(plugin);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'DUPLICATE_SHADER')).toBe(true);
    });

    it('should warn about missing author', () => {
      const plugin = createTestPlugin('test');
      delete plugin.author;
      const result = validatePlugin(plugin);

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.code === 'MISSING_AUTHOR')).toBe(true);
    });

    it('should warn about missing description', () => {
      const plugin = createTestPlugin('test');
      delete plugin.description;
      const result = validatePlugin(plugin);

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.code === 'MISSING_DESCRIPTION')).toBe(true);
    });
  });

  describe('PluginManager', () => {
    let registry: ShaderRegistry;
    let pluginManager: PluginManager;
    let mockManager: IShaderManager;

    beforeEach(() => {
      registry = new ShaderRegistry();
      pluginManager = new PluginManager(registry, { debug: false });
      mockManager = createMockShaderManager();
      pluginManager.setManager(mockManager);
    });

    afterEach(() => {
      pluginManager.clear();
    });

    describe('use()', () => {
      it('should register a valid plugin', () => {
        const plugin = createTestPlugin('my-plugin');

        pluginManager.use(plugin);

        expect(pluginManager.hasPlugin('my-plugin')).toBe(true);
        expect(pluginManager.listPlugins()).toContain('my-plugin');
      });

      it('should register shaders with namespace prefix', () => {
        const plugin = createTestPlugin('my-plugin', ['effect1']);

        pluginManager.use(plugin);

        expect(registry.has('my-plugin:effect1')).toBe(true);
      });

      it('should allow disabling namespace with useNamespace: false', () => {
        const plugin = createTestPlugin('my-plugin', ['effect1']);
        plugin.useNamespace = false;

        pluginManager.use(plugin);

        expect(registry.has('effect1')).toBe(true);
        expect(registry.has('my-plugin:effect1')).toBe(false);
      });

      it('should throw error for invalid plugin', () => {
        const plugin = createTestPlugin('');

        expect(() => pluginManager.use(plugin)).toThrow('Invalid plugin');
      });

      it('should throw error when registering same plugin twice', () => {
        const plugin = createTestPlugin('my-plugin');

        pluginManager.use(plugin);

        expect(() => pluginManager.use(plugin)).toThrow('already registered');
      });

      it('should throw error on shader name conflict', () => {
        const plugin1 = createTestPlugin('plugin1', ['shared']);
        const plugin2 = createTestPlugin('plugin2', ['shared']);
        plugin1.useNamespace = false;
        plugin2.useNamespace = false;

        pluginManager.use(plugin1);

        expect(() => pluginManager.use(plugin2)).toThrow('conflict');
      });

      it('should call onRegister hook', () => {
        const onRegister = vi.fn();
        const plugin = createTestPlugin('my-plugin');
        plugin.onRegister = onRegister;

        pluginManager.use(plugin);

        expect(onRegister).toHaveBeenCalledWith(mockManager);
      });
    });

    describe('unuse()', () => {
      it('should unregister a plugin', () => {
        const plugin = createTestPlugin('my-plugin', ['effect1']);
        pluginManager.use(plugin);

        const result = pluginManager.unuse('my-plugin');

        expect(result).toBe(true);
        expect(pluginManager.hasPlugin('my-plugin')).toBe(false);
        expect(registry.has('my-plugin:effect1')).toBe(false);
      });

      it('should return false for non-existent plugin', () => {
        const result = pluginManager.unuse('non-existent');

        expect(result).toBe(false);
      });

      it('should call onUnregister hook', () => {
        const onUnregister = vi.fn();
        const plugin = createTestPlugin('my-plugin');
        plugin.onUnregister = onUnregister;

        pluginManager.use(plugin);
        pluginManager.unuse('my-plugin');

        expect(onUnregister).toHaveBeenCalledWith(mockManager);
      });
    });

    describe('resolveShaderName()', () => {
      beforeEach(() => {
        const plugin = createTestPlugin('my-plugin', ['effect1', 'effect2']);
        pluginManager.use(plugin);
      });

      it('should resolve fully qualified name', () => {
        const resolved = pluginManager.resolveShaderName('my-plugin:effect1');

        expect(resolved).toBe('my-plugin:effect1');
      });

      it('should resolve short name to fully qualified name', () => {
        const resolved = pluginManager.resolveShaderName('effect1');

        expect(resolved).toBe('my-plugin:effect1');
      });

      it('should return undefined for unknown shader', () => {
        const resolved = pluginManager.resolveShaderName('unknown-shader');

        expect(resolved).toBeUndefined();
      });
    });

    describe('getPlugin()', () => {
      it('should return plugin by name', () => {
        const plugin = createTestPlugin('my-plugin');
        pluginManager.use(plugin);

        const retrieved = pluginManager.getPlugin('my-plugin');

        expect(retrieved).toBe(plugin);
      });

      it('should return undefined for non-existent plugin', () => {
        const retrieved = pluginManager.getPlugin('non-existent');

        expect(retrieved).toBeUndefined();
      });
    });

    describe('getPluginState()', () => {
      it('should return plugin state with registration info', () => {
        const plugin = createTestPlugin('my-plugin', ['effect1']);
        pluginManager.use(plugin);

        const state = pluginManager.getPluginState('my-plugin');

        expect(state).toBeDefined();
        expect(state?.plugin).toBe(plugin);
        expect(state?.active).toBe(true);
        expect(state?.registeredShaders).toContain('my-plugin:effect1');
        expect(state?.registeredAt).toBeLessThanOrEqual(Date.now());
      });
    });

    describe('getShaderPlugin()', () => {
      it('should return plugin that provides a shader', () => {
        const plugin = createTestPlugin('my-plugin', ['effect1']);
        pluginManager.use(plugin);

        const result = pluginManager.getShaderPlugin('my-plugin:effect1');

        expect(result).toBe(plugin);
      });

      it('should return undefined for unknown shader', () => {
        const result = pluginManager.getShaderPlugin('unknown');

        expect(result).toBeUndefined();
      });
    });

    describe('presets', () => {
      it('should retrieve preset from plugin', () => {
        const plugin = createTestPlugin('my-plugin', ['effect1']);
        plugin.presets = {
          'fire': { shader: 'effect1', config: { color: '#ff0000', intensity: 2.0 } },
          'ice': { shader: 'effect1', config: { color: '#0000ff', intensity: 0.5 } },
        };
        pluginManager.use(plugin);

        const preset = pluginManager.getPreset('my-plugin', 'fire');

        expect(preset).toBeDefined();
        expect(preset?.shader).toBe('effect1');
        expect(preset?.config).toEqual({ color: '#ff0000', intensity: 2.0 });
      });

      it('should return undefined for non-existent preset', () => {
        const plugin = createTestPlugin('my-plugin');
        pluginManager.use(plugin);

        const preset = pluginManager.getPreset('my-plugin', 'non-existent');

        expect(preset).toBeUndefined();
      });

      it('should list all available presets', () => {
        const plugin1 = createTestPlugin('plugin1', ['effect1']);
        plugin1.presets = {
          'preset1': { shader: 'effect1', config: {} },
        };
        const plugin2 = createTestPlugin('plugin2', ['effect2']);
        plugin2.presets = {
          'preset2': { shader: 'effect2', config: {} },
          'preset3': { shader: 'effect2', config: {} },
        };

        pluginManager.use(plugin1);
        pluginManager.use(plugin2);

        const allPresets = pluginManager.getAllPresets();

        expect(allPresets).toHaveLength(3);
        expect(allPresets).toContainEqual({ plugin: 'plugin1', preset: 'preset1', shader: 'effect1' });
        expect(allPresets).toContainEqual({ plugin: 'plugin2', preset: 'preset2', shader: 'effect2' });
        expect(allPresets).toContainEqual({ plugin: 'plugin2', preset: 'preset3', shader: 'effect2' });
      });
    });

    describe('getStats()', () => {
      it('should return plugin statistics', () => {
        const plugin1 = createTestPlugin('plugin1', ['e1', 'e2']);
        plugin1.presets = { 'p1': { shader: 'e1', config: {} } };
        const plugin2 = createTestPlugin('plugin2', ['e3']);
        plugin2.presets = { 'p2': { shader: 'e3', config: {} }, 'p3': { shader: 'e3', config: {} } };

        pluginManager.use(plugin1);
        pluginManager.use(plugin2);

        const stats = pluginManager.getStats();

        expect(stats.pluginCount).toBe(2);
        expect(stats.shaderCount).toBe(3);
        expect(stats.presetCount).toBe(3);
      });
    });

    describe('clear()', () => {
      it('should remove all plugins', () => {
        pluginManager.use(createTestPlugin('plugin1'));
        pluginManager.use(createTestPlugin('plugin2'));

        pluginManager.clear();

        expect(pluginManager.listPlugins()).toHaveLength(0);
        expect(registry.list()).toHaveLength(0);
      });
    });
  });

  describe('NAMESPACE_SEPARATOR', () => {
    it('should be a colon', () => {
      expect(NAMESPACE_SEPARATOR).toBe(':');
    });
  });
});
