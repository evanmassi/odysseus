/**
 * Field Resolver Service - Moved from application layer
 */

import { hasValue, isObject } from '@app/types/fieldTypeMapping';

import type { FieldResolverHook } from '../hooks/useFieldResolver';
import type { TubeFieldTypeMap, ValidFieldPath, ValidFieldValue } from '@app/types/fieldTypeMapping';
import type { FieldResolutionOptions } from '@domains/tubes/types/FieldResolver';
import type { TubeData } from '@odysseus/shared-schemas';



export interface PerformanceMetrics {
  totalResolutions: number;
  averageResolutionTime: number;
  cacheHits: number;
  cacheMisses: number;
  errorCount: number;
}

export class FieldResolverService {
  /**
   * Resolve field value from tube data
   *
   * Overload 1: Type-safe access with known field paths
   */
  static resolveField<K extends ValidFieldPath>(
    tube: TubeData,
    fieldKey: K,
    options?: FieldResolutionOptions
  ): TubeFieldTypeMap[K];

  /**
   * Resolve field value from tube data
   *
   * Overload 2: Flexible access with dynamic field paths
   */
  static resolveField<T extends ValidFieldValue = ValidFieldValue>(
    tube: TubeData,
    fieldKey: string,
    options?: FieldResolutionOptions
  ): T | undefined;

  /**
   * Resolve field value from tube data (implementation)
   */
  static resolveField(
    tube: unknown,
    fieldKey: string,
    options?: FieldResolutionOptions
  ): unknown {
    if (!isObject(tube)) return undefined;

    const keys = fieldKey.split('.');
    let value: unknown = tube;

    for (const key of keys) {
      if (isObject(value) && key in value) {
        value = value[key];
      } else {
        return options?.defaultValue;
      }
    }

    return value;
  }

  /**
   * Format field value for display
   */
  static formatValue(value: unknown, _fieldKey: string): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toString();
    if (value instanceof Date) return value.toLocaleDateString();
    return String(value);
  }

  /**
   * Validate field value
   */
  static validateValue(value: unknown, _fieldKey: string): boolean {
    return hasValue(value);
  }

  getFieldResolver(): FieldResolverHook {
    return {
      getValue: <T extends ValidFieldValue = ValidFieldValue>(
        tube: TubeData,
        fieldKey: string,
        options?: FieldResolutionOptions
      ) => FieldResolverService.resolveField(tube, fieldKey, options) as T | undefined,

      getValues: <T extends ValidFieldValue = ValidFieldValue>(
        tubes: TubeData[],
        fieldKey: string,
        options?: FieldResolutionOptions
      ) => tubes.map(tube => FieldResolverService.resolveField(tube, fieldKey, options) as T | undefined),

      hasValue: (tube: TubeData, fieldKey: string) => {
        const value = FieldResolverService.resolveField(tube, fieldKey);
        return hasValue(value);
      },

      resolveField: <T extends ValidFieldValue = ValidFieldValue>(tube: TubeData, fieldKey: string) => ({
        value: FieldResolverService.resolveField(tube, fieldKey) as T | undefined,
        resolved: true,
        resolvedPath: fieldKey,
        exists: true
      }),

      getFieldPath: (_fieldKey: string) => _fieldKey,

      isValidField: (_fieldKey: string) => true,

      getAvailableFields: () => [],

      validateConfiguration: () => {},

      resolver: null,

      metrics: {
        totalResolutions: 0,
        averageResolutionTime: 0,
        cacheHits: 0,
        cacheMisses: 0,
        errorCount: 0
      } as PerformanceMetrics
    };
  }
}

// Application service singleton
let fieldResolverApplicationService: FieldResolverService | null = null;

export function getFieldResolverApplicationService(): FieldResolverService {
  if (!fieldResolverApplicationService) {
    fieldResolverApplicationService = new FieldResolverService();
  }
  return fieldResolverApplicationService;
}
