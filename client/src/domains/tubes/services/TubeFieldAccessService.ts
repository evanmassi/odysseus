/**
 * Tube Field Access Service - Domain Service Implementation
 *
 * Domain service that encapsulates the business logic for resolving nested field
 * access patterns in tube data structures. This service implements the core
 * business capability of accessing structured data through consistent field identifiers.
 *
 * Following DDD principles:
 * - Encapsulates complex field resolution business logic
 * - Provides consistent interface for domain field access
 * - Handles domain-specific validation and error handling
 * - Maintains business rules for field access patterns
 * - Enables safe navigation of nested data structures
 */

import {
  DomainError,
  FieldResolutionError,
  FieldPathError,
} from '@shared/domain/errors/DomainError';

import type {
  FieldResolver,
  FieldPathMapping,
  FieldResolutionOptions,
  FieldResolutionResult,
} from '../types/FieldResolver';
import type { TubeData } from '@shared/types/Tube';

/**
 * Performance monitoring for field resolution operations
 */
interface PerformanceMetrics {
  totalResolutions: number;
  averageResolutionTime: number;
  cacheHits: number;
  cacheMisses: number;
  errorCount: number;
}

/**
 * TubeFieldAccessService - Domain Service Implementation
 *
 * Implements FieldResolver to provide field resolution capabilities for tube data.
 * This service contains the business logic for safely navigating nested tube data
 * structures and resolving field values through configured path mappings.
 */
export class TubeFieldAccessService implements FieldResolver {
  private readonly pathMapping: FieldPathMapping;
  private readonly performanceMetrics: PerformanceMetrics;
  private readonly pathCache: Map<string, string[]>;

  constructor(pathMapping: FieldPathMapping) {
    this.pathMapping = { ...pathMapping }; // Defensive copy
    this.performanceMetrics = {
      totalResolutions: 0,
      averageResolutionTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errorCount: 0,
    };
    this.pathCache = new Map();

    // Validate configuration on construction
    this.validateConfiguration();
  }

  // CORE RESOLUTION METHODS

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Implements FieldResolver domain interface
  getValue<T = any>(
    data: TubeData,
    fieldKey: string,
    options: FieldResolutionOptions = {}
  ): T | undefined {
    const startTime = performance.now();

    try {
      this.performanceMetrics.totalResolutions++;

      // Validate inputs
      this.validateFieldKey(fieldKey);
      this.validateDataObject(data);

      const path = this.getFieldPath(fieldKey);
      const value = this.resolvePath(data, path);

      // Apply transformation if provided
      const finalValue = options.transform ? options.transform(value) : value;

      // Handle missing values
      if (finalValue === undefined || finalValue === null) {
        if (options.throwOnMissing === true) {
          throw new FieldPathError(path, fieldKey, {
            dataId: data.id,
            options,
          });
        }
        return options.defaultValue as T;
      }

      this.updatePerformanceMetrics(startTime);
      return finalValue as T;
    } catch (error) {
      this.performanceMetrics.errorCount++;
      this.updatePerformanceMetrics(startTime);

      if (error instanceof DomainError) {
        throw error;
      }

      // Wrap unexpected errors in domain error
      throw new FieldPathError(this.pathMapping[fieldKey] || 'unknown', fieldKey, {
        originalError: error instanceof Error ? error.message : String(error),
        dataId: data.id,
        options,
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Implements FieldResolver domain interface
  getValues<T = any>(
    data: TubeData[],
    fieldKey: string,
    options: FieldResolutionOptions = {}
  ): (T | undefined)[] {
    // Validate inputs
    this.validateFieldKey(fieldKey);

    if (!Array.isArray(data)) {
      throw new DomainError('Data must be an array for bulk resolution', 'INVALID_INPUT');
    }

    // Use single path resolution for all items (performance optimization)
    const path = this.getFieldPath(fieldKey);
    const compiledPath = this.compilePath(path);

    return data.map(item => {
      try {
        this.validateDataObject(item);
        const value = this.resolveCompiledPath(item, compiledPath);
        const finalValue = options.transform ? options.transform(value) : value;

        if (finalValue === undefined || finalValue === null) {
          return options.defaultValue as T;
        }

        return finalValue as T;
      } catch (error) {
        if (options.throwOnMissing === true) {
          throw error;
        }
        return options.defaultValue as T;
      }
    });
  }

  hasValue(data: TubeData, fieldKey: string): boolean {
    try {
      const value = this.getValue(data, fieldKey, {
        throwOnMissing: false,
        defaultValue: null,
      });

      // Business rule: meaningful value check
      return (
        value !== null &&
        value !== undefined &&
        value !== '' &&
        !(Array.isArray(value) && value.length === 0)
      );
    } catch (error) {
      return false;
    }
  }

  getFieldPath(fieldKey: string): string {
    const path = this.pathMapping[fieldKey];

    if (!path) {
      throw new FieldResolutionError(fieldKey, this.getAvailableFields(), {
        service: 'TubeFieldAccessService',
      });
    }

    return path;
  }

  isValidField(fieldKey: string): boolean {
    return fieldKey in this.pathMapping;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Implements FieldResolver domain interface
  resolveField<T = any>(data: TubeData, fieldKey: string): FieldResolutionResult<T> {
    let resolved = false;
    let value: T | undefined = undefined;
    let resolvedPath = '';
    let exists = false;

    try {
      this.validateFieldKey(fieldKey);
      resolvedPath = this.getFieldPath(fieldKey);

      // Check if the path exists in the data structure
      exists = this.pathExists(data, resolvedPath);

      if (exists) {
        value = this.resolvePath(data, resolvedPath) as T;
        resolved = true;
      }
    } catch (error) {
      // Resolution failed, but we still return metadata
      resolved = false;
    }

    return {
      value,
      resolved,
      resolvedPath,
      exists,
    };
  }

  getAvailableFields(): string[] {
    return Object.keys(this.pathMapping).sort();
  }

  validateConfiguration(): void {
    if (!this.pathMapping || typeof this.pathMapping !== 'object') {
      throw new DomainError('Field path mapping must be a valid object', 'INVALID_CONFIGURATION');
    }

    const keys = Object.keys(this.pathMapping);
    if (keys.length === 0) {
      throw new DomainError('Field path mapping cannot be empty', 'EMPTY_CONFIGURATION');
    }

    // Validate each mapping
    Object.entries(this.pathMapping).forEach(([fieldKey, path]) => {
      if (!fieldKey || fieldKey.trim() === '') {
        throw new DomainError('Field key cannot be empty', 'INVALID_FIELD_KEY', { fieldKey });
      }

      if (!path || path.trim() === '') {
        throw new DomainError(
          `Path cannot be empty for field key: ${fieldKey}`,
          'INVALID_FIELD_PATH',
          { fieldKey }
        );
      }

      // Validate path format
      if (!/^[a-zA-Z0-9_.]+$/.test(path)) {
        throw new DomainError(
          `Invalid path format for field key '${fieldKey}': ${path}`,
          'INVALID_PATH_FORMAT',
          { fieldKey, path }
        );
      }
    });
  }

  // PERFORMANCE & MONITORING

  /**
   * Get performance metrics for monitoring and optimization
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Reset performance metrics (useful for testing)
   */
  resetMetrics(): void {
    this.performanceMetrics.totalResolutions = 0;
    this.performanceMetrics.averageResolutionTime = 0;
    this.performanceMetrics.cacheHits = 0;
    this.performanceMetrics.cacheMisses = 0;
    this.performanceMetrics.errorCount = 0;
  }

  /**
   * Clear path cache (useful for testing or configuration changes)
   */
  clearCache(): void {
    this.pathCache.clear();
  }

  // PRIVATE HELPER METHODS

  /**
   * Safely resolve a nested path in an object
   */
  private resolvePath(obj: unknown, path: string): unknown {
    const compiledPath = this.compilePath(path);
    return this.resolveCompiledPath(obj, compiledPath);
  }

  /**
   * Resolve using pre-compiled path segments for performance
   */
  private resolveCompiledPath(obj: unknown, pathSegments: string[]): unknown {
    let current: unknown = obj;

    for (const segment of pathSegments) {
      if (current === null || current === undefined) {
        return undefined;
      }

      if (typeof current === 'object' && current !== null && segment in current) {
        current = (current as Record<string, unknown>)[segment];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Compile path string into segments with caching for performance
   */
  private compilePath(path: string): string[] {
    let compiled = this.pathCache.get(path);

    if (compiled) {
      this.performanceMetrics.cacheHits++;
      return compiled;
    }

    this.performanceMetrics.cacheMisses++;
    compiled = path.split('.');
    this.pathCache.set(path, compiled);

    return compiled;
  }

  /**
   * Check if a path exists in the data structure (without retrieving value)
   */
  private pathExists(obj: unknown, path: string): boolean {
    const compiledPath = this.compilePath(path);
    let current: unknown = obj;

    for (const segment of compiledPath) {
      if (current === null || current === undefined) {
        return false;
      }

      if (typeof current !== 'object' || current === null) {
        return false;
      }

      if (!(segment in current)) {
        return false;
      }

      current = (current as Record<string, unknown>)[segment];
    }

    return true;
  }

  /**
   * Validate field key input
   */
  private validateFieldKey(fieldKey: string): void {
    if (!fieldKey || typeof fieldKey !== 'string') {
      throw new DomainError('Field key must be a non-empty string', 'INVALID_FIELD_KEY', {
        fieldKey,
      });
    }
  }

  /**
   * Validate data object input
   */
  private validateDataObject(data: unknown): void {
    if (!data || typeof data !== 'object') {
      throw new DomainError('Data must be a valid object', 'INVALID_DATA_OBJECT', {
        dataType: typeof data,
      });
    }
  }

  /**
   * Update performance metrics with timing information
   */
  private updatePerformanceMetrics(startTime: number): void {
    const duration = performance.now() - startTime;
    const total = this.performanceMetrics.totalResolutions;
    const currentAvg = this.performanceMetrics.averageResolutionTime;

    // Calculate rolling average
    this.performanceMetrics.averageResolutionTime = (currentAvg * (total - 1) + duration) / total;
  }
}

/**
 * Factory function for creating TubeFieldAccessService instances
 */
export function createTubeFieldAccessService(
  pathMapping: FieldPathMapping
): TubeFieldAccessService {
  return new TubeFieldAccessService(pathMapping);
}

/**
 * Singleton instance for default tube field access
 * Can be overridden for testing or different configurations
 */
let defaultInstance: TubeFieldAccessService | null = null;

export function getDefaultTubeFieldAccessService(
  pathMapping?: FieldPathMapping
): TubeFieldAccessService {
  if (!defaultInstance || pathMapping) {
    // Use dynamic import to avoid circular dependencies
    if (pathMapping) {
      defaultInstance = new TubeFieldAccessService(pathMapping);
    } else {
      throw new Error(
        'Default field mapping not available. Use getFieldResolverApplicationService() instead.'
      );
    }
  }

  return defaultInstance;
}

/**
 * Reset default instance (useful for testing)
 */
export function resetDefaultTubeFieldAccessService(): void {
  defaultInstance = null;
}
