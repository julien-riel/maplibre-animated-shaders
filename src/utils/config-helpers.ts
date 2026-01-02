/**
 * Configuration Helper Utilities
 *
 * Type-safe utilities for accessing shader configuration values.
 */

import type { ShaderConfig } from '../types';

/**
 * Get a numeric configuration value from a config object.
 * Searches through multiple possible property names and returns the first defined value.
 *
 * @param config - The shader configuration object
 * @param propertyNames - Array of possible property names to search
 * @param defaultValue - Default value if no property is found
 * @returns The found value or the default
 *
 * @example
 * ```typescript
 * // Instead of:
 * const size = (config as Record<string, unknown>).maxRadius ??
 *              (config as Record<string, unknown>).radius ?? 50;
 *
 * // Use:
 * const size = getConfigNumber(config, ['maxRadius', 'radius', 'size'], 50);
 * ```
 */
export function getConfigNumber(
  config: ShaderConfig,
  propertyNames: string[],
  defaultValue: number
): number {
  for (const name of propertyNames) {
    const value = config[name];
    if (typeof value === 'number') {
      return value;
    }
  }
  return defaultValue;
}

/**
 * Get a string configuration value from a config object.
 *
 * @param config - The shader configuration object
 * @param propertyNames - Array of possible property names to search
 * @param defaultValue - Default value if no property is found
 * @returns The found value or the default
 */
export function getConfigString(
  config: ShaderConfig,
  propertyNames: string[],
  defaultValue: string
): string {
  for (const name of propertyNames) {
    const value = config[name];
    if (typeof value === 'string') {
      return value;
    }
  }
  return defaultValue;
}

/**
 * Get a boolean configuration value from a config object.
 *
 * @param config - The shader configuration object
 * @param propertyNames - Array of possible property names to search
 * @param defaultValue - Default value if no property is found
 * @returns The found value or the default
 */
export function getConfigBoolean(
  config: ShaderConfig,
  propertyNames: string[],
  defaultValue: boolean
): boolean {
  for (const name of propertyNames) {
    const value = config[name];
    if (typeof value === 'boolean') {
      return value;
    }
  }
  return defaultValue;
}

/**
 * Get any configuration value from a config object with type narrowing.
 *
 * @param config - The shader configuration object
 * @param propertyName - The property name to get
 * @param defaultValue - Default value if property is not found
 * @returns The found value or the default
 */
export function getConfigValue<T>(config: ShaderConfig, propertyName: string, defaultValue: T): T {
  const value = config[propertyName];
  if (value !== undefined && value !== null) {
    return value as T;
  }
  return defaultValue;
}
