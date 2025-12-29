import type { GeometryType, IShaderRegistry, ShaderDefinition } from './types';

/**
 * Registry for storing and managing shader definitions.
 * Provides lookup by name and filtering by geometry type.
 */
export class ShaderRegistry implements IShaderRegistry {
  private shaders: Map<string, ShaderDefinition> = new Map();

  /**
   * Register a shader definition
   */
  register(definition: ShaderDefinition): void {
    if (this.shaders.has(definition.name)) {
      console.warn(
        `[ShaderRegistry] Shader "${definition.name}" already registered, overwriting.`
      );
    }
    this.shaders.set(definition.name, definition);
  }

  /**
   * Get a shader definition by name
   */
  get(name: string): ShaderDefinition | undefined {
    return this.shaders.get(name);
  }

  /**
   * Check if a shader exists
   */
  has(name: string): boolean {
    return this.shaders.has(name);
  }

  /**
   * List all registered shader names, optionally filtered by geometry type
   */
  list(geometry?: GeometryType): string[] {
    if (!geometry) {
      return Array.from(this.shaders.keys());
    }

    return Array.from(this.shaders.entries())
      .filter(([_, def]) => def.geometry === geometry)
      .map(([name]) => name);
  }

  /**
   * Get all shader definitions
   */
  getAll(): ShaderDefinition[] {
    return Array.from(this.shaders.values());
  }

  /**
   * Get shader definitions filtered by geometry type
   */
  getByGeometry(geometry: GeometryType): ShaderDefinition[] {
    return Array.from(this.shaders.values()).filter((def) => def.geometry === geometry);
  }

  /**
   * Get shader definitions filtered by tag
   */
  getByTag(tag: string): ShaderDefinition[] {
    return Array.from(this.shaders.values()).filter((def) => def.tags.includes(tag));
  }

  /**
   * Unregister a shader
   */
  unregister(name: string): boolean {
    return this.shaders.delete(name);
  }

  /**
   * Clear all registered shaders
   */
  clear(): void {
    this.shaders.clear();
  }

  /**
   * Get the count of registered shaders
   */
  get size(): number {
    return this.shaders.size;
  }
}

/**
 * Global shader registry instance
 */
export const globalRegistry = new ShaderRegistry();
