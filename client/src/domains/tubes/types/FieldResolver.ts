/**
 * Field Resolver Domain Service Contract
 * 
 * Defines the contract for resolving nested field access patterns in domain entities.
 * This interface represents the core business capability of accessing structured data
 * through consistent field identifiers.
 * 
 * Following DDD principles:
 * - Domain service interface defines business capabilities
 * - Abstracts complex field resolution logic from consumers
 * - Provides consistent API for nested data access
 * - Enables dependency inversion for testing and flexibility
 */

import { TubeData } from '@shared/types/tubeTypes';

/**
 * Field path mapping configuration type
 * Maps flat field keys to nested object paths
 */
export type FieldPathMapping = Record<string, string>;

/**
 * Field resolution options for advanced field access
 */
export interface FieldResolutionOptions {
  /** Default value to return if field is not found */
  defaultValue?: any;
  /** Whether to throw error on missing field (default: true) */
  throwOnMissing?: boolean;
  /** Transform function applied to resolved value */
  transform?: (value: any) => any;
}

/**
 * Field resolution result with metadata
 */
export interface FieldResolutionResult<T = any> {
  /** The resolved field value */
  value: T | undefined;
  /** Whether the field was successfully resolved */
  resolved: boolean;
  /** The nested path that was used for resolution */
  resolvedPath: string;
  /** Whether the field exists in the data structure */
  exists: boolean;
}

/**
 * Domain Service Contract: FieldResolver
 *
 * Encapsulates the business logic for resolving nested field access patterns.
 * Provides a consistent interface for accessing complex data structures through
 * simple field identifiers.
 *
 * Business Rules:
 * - Field keys must be predefined in field mapping configuration
 * - Nested paths are resolved safely (no runtime errors on missing properties)
 * - Type safety is maintained through generic return types
 * - Field existence can be checked without retrieving values
 * - Bulk operations are supported for performance
 */
export interface FieldResolver {
  /**
   * Resolve a single field value from a data object
   * 
   * @param data - The source data object to resolve from
   * @param fieldKey - The field identifier to resolve
   * @param options - Additional resolution options
   * @returns The resolved field value or undefined if not found
   * 
   * @throws FieldResolutionError if fieldKey is not valid
   * @throws FieldPathError if path resolution fails and throwOnMissing is true
   */
  getValue<T = any>(
    data: TubeData, 
    fieldKey: string, 
    options?: FieldResolutionOptions
  ): T | undefined;

  /**
   * Resolve field values from multiple data objects
   * Optimized for bulk operations to avoid repeated path resolution
   * 
   * @param data - Array of source data objects
   * @param fieldKey - The field identifier to resolve
   * @param options - Additional resolution options
   * @returns Array of resolved values (same order as input)
   */
  getValues<T = any>(
    data: TubeData[], 
    fieldKey: string,
    options?: FieldResolutionOptions
  ): (T | undefined)[];

  /**
   * Check if a field has a meaningful value (not null, undefined, or empty string)
   * 
   * @param data - The source data object
   * @param fieldKey - The field identifier to check
   * @returns True if field has a meaningful value
   */
  hasValue(data: TubeData, fieldKey: string): boolean;

  /**
   * Get the nested path for a given field key
   * Useful for debugging and advanced field manipulation
   * 
   * @param fieldKey - The field identifier
   * @returns The nested object path (e.g., 'sample.cellType')
   * 
   * @throws FieldResolutionError if fieldKey is not valid
   */
  getFieldPath(fieldKey: string): string;

  /**
   * Validate if a field key is supported by this resolver
   * 
   * @param fieldKey - The field identifier to validate
   * @returns True if field key is valid and can be resolved
   */
  isValidField(fieldKey: string): boolean;

  /**
   * Get detailed field resolution result with metadata
   * Useful for debugging and validation scenarios
   * 
   * @param data - The source data object
   * @param fieldKey - The field identifier to resolve
   * @returns Detailed resolution result with metadata
   */
  resolveField<T = any>(
    data: TubeData, 
    fieldKey: string
  ): FieldResolutionResult<T>;

  /**
   * Get all available field keys that can be resolved
   * Useful for validation and debugging
   * 
   * @returns Array of all valid field keys
   */
  getAvailableFields(): string[];

  /**
   * Validate field mapping configuration for consistency
   * Ensures all paths are resolvable and no circular references exist
   * 
   * @throws DomainError if configuration is invalid
   */
  validateConfiguration(): void;
}
