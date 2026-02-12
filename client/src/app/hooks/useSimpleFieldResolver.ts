/**
 * Simple Field Resolver Hook
 *
 * Lightweight field resolver for Zod-based data structures.
 * Provides dynamic field access using dot notation paths.
 */

import { useCallback, useMemo } from 'react';

import { hasValue as hasValueGuard, isObject } from '@app/types/fieldTypeMapping';
import { logger } from '@shared/infrastructure/logger';
import { normalizeDateString } from '@shared/utils/dateUtils';

import type {
  NormalizedFieldValue,
  TubeFieldTypeMap,
  ValidFieldPath,
  ValidFieldValue,
} from '@app/types/fieldTypeMapping';
import type { TubeData } from '@shared/types/Tube';

/**
 * Two-state conflict analysis result
 * Treats empty as a distinct value - empty vs filled = conflict
 */
export interface FieldConflictAnalysis<T extends NormalizedFieldValue = NormalizedFieldValue> {
  /** State of the field across selected items */
  state: 'common' | 'conflict';

  /** Whether field has conflicting values (backward compatibility) */
  hasConflict: boolean;

  /** Common value if state is 'common', undefined if 'conflict' */
  commonValue: T | undefined;

  /** All unique values found (including empty treated as distinct value) */
  values: (T | undefined)[];

  /** Total number of items analyzed */
  totalSelected: number;

  /** Count of items with non-empty values */
  withValue: number;

  /** Count of items with empty values */
  withoutValue: number;

  /** Distribution of values (value -> count) */
  distribution: Map<T | undefined, number>;
}

/**
 * Simple field resolver interface with method overloads for type safety
 */
export interface SimpleFieldResolver {
  /** Get a field value from tube data using dot notation (type-safe overload) */
  getTubeValue<K extends ValidFieldPath>(tube: TubeData, fieldPath: K): TubeFieldTypeMap[K];
  /** Get a field value from tube data using dot notation (flexible overload) */
  getTubeValue<T extends NormalizedFieldValue = NormalizedFieldValue>(
    tube: TubeData,
    fieldPath: string
  ): T | undefined;

  /** Get field values from multiple tubes (type-safe overload) */
  getTubeValues<K extends ValidFieldPath>(tubes: TubeData[], fieldPath: K): TubeFieldTypeMap[K][];
  /** Get field values from multiple tubes (flexible overload) */
  getTubeValues<T extends NormalizedFieldValue = NormalizedFieldValue>(
    tubes: TubeData[],
    fieldPath: string
  ): (T | undefined)[];

  /** Check if a tube has a meaningful value for a field */
  tubeHasValue: (tube: TubeData, fieldPath: string) => boolean;

  /** Get unique values for a field across all tubes (type-safe overload) */
  getUniqueTubeValues<K extends ValidFieldPath>(
    tubes: TubeData[],
    fieldPath: K
  ): NonNullable<TubeFieldTypeMap[K]>[];
  /** Get unique values for a field across all tubes (flexible overload) */
  getUniqueTubeValues<T extends NormalizedFieldValue = NormalizedFieldValue>(
    tubes: TubeData[],
    fieldPath: string
  ): T[];

  /** Find tubes where field has specific value (type-safe overload) */
  findTubesByFieldValue<K extends ValidFieldPath>(
    tubes: TubeData[],
    fieldPath: K,
    value: TubeFieldTypeMap[K]
  ): TubeData[];
  /** Find tubes where field has specific value (flexible overload) */
  findTubesByFieldValue<T extends NormalizedFieldValue = NormalizedFieldValue>(
    tubes: TubeData[],
    fieldPath: string,
    value: T
  ): TubeData[];

  /** Analyze field conflicts in selected tubes using three-state model */
  analyzeFieldConflicts<T extends NormalizedFieldValue = NormalizedFieldValue>(
    tubes: TubeData[],
    fieldPath: string
  ): FieldConflictAnalysis<T>;
}

/**
 * Get nested property value using dot notation
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (!isObject(obj) || !path) return undefined;

  return path.split('.').reduce<unknown>((current, key) => {
    if (isObject(current) && key in current) {
      return current[key];
    }
    return undefined;
  }, obj);
}

/**
 * Local wrapper for hasValue type guard (maintains backward compatibility)
 */
function hasValue(value: unknown): boolean {
  return hasValueGuard(value);
}

/**
 * Hook providing simple field resolution for new Zod-based data structures
 */
export function useSimpleFieldResolver(): SimpleFieldResolver {
  const getTubeValue = useCallback(
    <T extends NormalizedFieldValue = NormalizedFieldValue>(
      tube: TubeData,
      fieldPath: string
    ): T | undefined => {
      try {
        const value = getNestedValue(tube, fieldPath);
        // Normalize Date objects to strings for consistent handling
        if (value instanceof Date) {
          return normalizeDateString(value) as T;
        }
        return value as T | undefined;
      } catch (error) {
        logger.warn(`Failed to get tube value for field '${fieldPath}'`, { error, fieldPath });
        return undefined;
      }
    },
    []
  );

  const getTubeValues = useCallback(
    <T extends NormalizedFieldValue = NormalizedFieldValue>(
      tubes: TubeData[],
      fieldPath: string
    ): (T | undefined)[] => {
      return tubes.map(tube => getTubeValue<T>(tube, fieldPath));
    },
    [getTubeValue]
  );

  const tubeHasValue = useCallback(
    (tube: TubeData, fieldPath: string): boolean => {
      const value = getTubeValue(tube, fieldPath);
      return hasValue(value);
    },
    [getTubeValue]
  );

  const getUniqueTubeValues = useCallback(
    <T extends NormalizedFieldValue = NormalizedFieldValue>(
      tubes: TubeData[],
      fieldPath: string
    ): T[] => {
      const allValues = getTubeValues<T>(tubes, fieldPath);
      const filteredValues = allValues.filter(
        (value): value is T => value !== undefined && value !== null && value !== ''
      );
      const uniqueValues = filteredValues.filter(
        (value, index, array) => array.indexOf(value) === index
      );
      return uniqueValues;
    },
    [getTubeValues]
  );

  const findTubesByFieldValue = useCallback(
    <T extends NormalizedFieldValue = NormalizedFieldValue>(
      tubes: TubeData[],
      fieldPath: string,
      value: T
    ): TubeData[] => {
      return tubes.filter(tube => {
        const fieldValue = getTubeValue<T>(tube, fieldPath);
        return fieldValue === value;
      });
    },
    [getTubeValue]
  );

  const analyzeFieldConflicts = useCallback(
    <T extends NormalizedFieldValue = NormalizedFieldValue>(
      tubes: TubeData[],
      fieldPath: string
    ): FieldConflictAnalysis<T> => {
      if (tubes.length === 0) {
        return {
          state: 'common',
          hasConflict: false,
          values: [],
          commonValue: undefined,
          totalSelected: 0,
          withValue: 0,
          withoutValue: 0,
          distribution: new Map(),
        };
      }

      const allValues = getTubeValues<T>(tubes, fieldPath);

      // Count empty vs non-empty (for metadata only)
      const nonEmptyValues = allValues.filter((value): value is T => hasValue(value));
      const emptyCount = allValues.length - nonEmptyValues.length;

      // Special handling for date fields to avoid timezone comparison bugs
      const isDateField = fieldPath === 'sample.date' || fieldPath.endsWith('.date');

      let normalizedValues: (T | undefined)[];
      const distribution = new Map<T | undefined, number>();

      if (isDateField) {
        // Normalize all dates to YYYY-MM-DD strings for comparison
        normalizedValues = allValues.map(v => {
          if (!hasValue(v)) return undefined;
          // Type guard: ensure value is string, Date, or null/undefined for date normalization
          if (typeof v === 'string' || v instanceof Date || v === null || v === undefined) {
            return normalizeDateString(v) as T;
          }
          // If value is not a valid date type, return undefined
          return undefined;
        });
      } else {
        // Use raw values for non-date fields
        normalizedValues = allValues.map(v => (hasValue(v) ? v : undefined));
      }

      // Build distribution map (including undefined for empty values)
      normalizedValues.forEach(value => {
        distribution.set(value, (distribution.get(value) ?? 0) + 1);
      });

      // Two-state logic: All identical = COMMON, any difference = CONFLICT
      const uniqueValues = Array.from(new Set(normalizedValues));

      let state: 'common' | 'conflict';
      let commonValue: T | undefined;

      if (uniqueValues.length === 1) {
        // All values are identical (including all empty)
        state = 'common';
        commonValue = uniqueValues[0];
      } else {
        // Values differ (including empty vs non-empty)
        state = 'conflict';
        commonValue = undefined;
      }

      return {
        state,
        hasConflict: state === 'conflict',
        values: uniqueValues,
        commonValue,
        totalSelected: tubes.length,
        withValue: nonEmptyValues.length,
        withoutValue: emptyCount,
        distribution,
      };
    },
    [getTubeValues]
  );

  return useMemo(
    () => ({
      getTubeValue,
      getTubeValues,
      tubeHasValue,
      getUniqueTubeValues,
      findTubesByFieldValue,
      analyzeFieldConflicts,
    }),
    [
      getTubeValue,
      getTubeValues,
      tubeHasValue,
      getUniqueTubeValues,
      findTubesByFieldValue,
      analyzeFieldConflicts,
    ]
  );
}

/**
 * Common field paths for tube data (for type safety)
 */
export const TUBE_FIELD_PATHS = {
  // Location fields
  tankId: 'location.tankId',
  rackId: 'location.rackId',
  boxId: 'location.boxId',
  position: 'location.position',

  // Sample fields
  cellType: 'sample.cellType',
  donorInternalId: 'sample.donorInternalId',
  donorSourceId: 'sample.donorSourceId',
  concentration: 'sample.concentration',
  concentrationUnit: 'sample.concentrationUnit',
  date: 'sample.date',
  media: 'sample.media',
  cultureCondition: 'sample.cultureCondition',
  lotNumber: 'sample.lotNumber',
  species: 'sample.species',
  vendor: 'sample.vendor',
  catalogNumber: 'sample.catalogNumber',
  passageNumber: 'sample.passageNumber',
  notes: 'sample.notes',

  // Researcher ID (foreign key)
  researcherId: 'researcherId',

  // Timestamps
  createdAt: 'timestamps.createdAt',
  updatedAt: 'timestamps.updatedAt',
} as const;

export type TubeFieldPath = (typeof TUBE_FIELD_PATHS)[keyof typeof TUBE_FIELD_PATHS];

/**
 * Type-safe tube field resolver
 */
export interface TypeSafeTubeResolver {
  getValue<K extends keyof typeof TUBE_FIELD_PATHS>(
    tube: TubeData,
    field: K
  ): ValidFieldValue | undefined;
  getValues<K extends keyof typeof TUBE_FIELD_PATHS>(
    tubes: TubeData[],
    field: K
  ): (ValidFieldValue | undefined)[];
  hasValue<K extends keyof typeof TUBE_FIELD_PATHS>(tube: TubeData, field: K): boolean;
}

/**
 * Hook providing type-safe field resolution using predefined paths
 */
export function useTypeSafeTubeResolver(): TypeSafeTubeResolver {
  const { getTubeValue, getTubeValues, tubeHasValue } = useSimpleFieldResolver();

  return useMemo(
    () => ({
      getValue: <K extends keyof typeof TUBE_FIELD_PATHS>(tube: TubeData, field: K) => {
        return getTubeValue(tube, TUBE_FIELD_PATHS[field]);
      },
      getValues: <K extends keyof typeof TUBE_FIELD_PATHS>(tubes: TubeData[], field: K) => {
        return getTubeValues(tubes, TUBE_FIELD_PATHS[field]);
      },
      hasValue: <K extends keyof typeof TUBE_FIELD_PATHS>(tube: TubeData, field: K) => {
        return tubeHasValue(tube, TUBE_FIELD_PATHS[field]);
      },
    }),
    [getTubeValue, getTubeValues, tubeHasValue]
  );
}
