/**
 * Simple Field Resolver Hook - Phase 1 Implementation
 *
 * A lightweight field resolver that works with our new Zod-based data structures.
 * Provides dynamic field access without the complexity of the legacy system.
 */

import { useCallback, useMemo } from 'react';

import { normalizeDateString } from '@shared/utils/dateUtils';

import type { TubeData } from '@shared/types/tubeTypes';

/**
 * Two-state conflict analysis result
 * Treats empty as a distinct value - empty vs filled = conflict
 */
export interface FieldConflictAnalysis<T = any> {
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
 * Simple field resolver interface
 */
export interface SimpleFieldResolver {
  /** Get a field value from tube data using dot notation */
  getTubeValue: <T = any>(tube: TubeData, fieldPath: string) => T | undefined;

  /** Get field values from multiple tubes */
  getTubeValues: <T = any>(tubes: TubeData[], fieldPath: string) => (T | undefined)[];

  /** Check if a tube has a meaningful value for a field */
  tubeHasValue: (tube: TubeData, fieldPath: string) => boolean;

  /** Get unique values for a field across all tubes */
  getUniqueTubeValues: <T = any>(tubes: TubeData[], fieldPath: string) => T[];

  /** Find tubes where field has specific value */
  findTubesByFieldValue: <T = any>(tubes: TubeData[], fieldPath: string, value: T) => TubeData[];

  /** Analyze field conflicts in selected tubes using three-state model */
  analyzeFieldConflicts: <T = any>(tubes: TubeData[], fieldPath: string) => FieldConflictAnalysis<T>;
}

/**
 * Get nested property value using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? current[key] : undefined;
  }, obj);
}

/**
 * Check if a value is meaningful (not null, undefined, or empty string)
 */
function hasValue(value: any): boolean {
  return value !== undefined && value !== null && value !== '';
}

/**
 * Hook providing simple field resolution for new Zod-based data structures
 */
export function useSimpleFieldResolver(): SimpleFieldResolver {
  const getTubeValue = useCallback(<T = any>(tube: TubeData, fieldPath: string): T | undefined => {
    try {
      return getNestedValue(tube, fieldPath) as T;
    } catch (error) {
      console.warn(`Failed to get tube value for field '${fieldPath}':`, error);
      return undefined;
    }
  }, []);

  const getTubeValues = useCallback(<T = any>(tubes: TubeData[], fieldPath: string): (T | undefined)[] => {
    return tubes.map(tube => getTubeValue<T>(tube, fieldPath));
  }, [getTubeValue]);

  const tubeHasValue = useCallback((tube: TubeData, fieldPath: string): boolean => {
    const value = getTubeValue(tube, fieldPath);
    return hasValue(value);
  }, [getTubeValue]);

  const getUniqueTubeValues = useCallback(<T = any>(tubes: TubeData[], fieldPath: string): T[] => {
    const allValues = getTubeValues<T>(tubes, fieldPath);
    const filteredValues = allValues.filter((value): value is T => 
      value !== undefined && value !== null && value !== ''
    );
    const uniqueValues = filteredValues.filter((value, index, array) => 
      array.indexOf(value) === index
    );
    return uniqueValues;
  }, [getTubeValues]);

  const findTubesByFieldValue = useCallback(<T = any>(
    tubes: TubeData[], 
    fieldPath: string, 
    value: T
  ): TubeData[] => {
    return tubes.filter(tube => {
      const fieldValue = getTubeValue<T>(tube, fieldPath);
      return fieldValue === value;
    });
  }, [getTubeValue]);

  const analyzeFieldConflicts = useCallback(<T = any>(
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
        distribution: new Map()
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
      normalizedValues = allValues.map(v =>
        hasValue(v) ? (normalizeDateString(v as any) as T) : undefined
      );
    } else {
      // Use raw values for non-date fields
      normalizedValues = allValues.map(v => hasValue(v) ? v : undefined);
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
      distribution
    };
  }, [getTubeValues]);

  return useMemo(() => ({
    getTubeValue,
    getTubeValues,
    tubeHasValue,
    getUniqueTubeValues,
    findTubesByFieldValue,
    analyzeFieldConflicts
  }), [
    getTubeValue,
    getTubeValues,
    tubeHasValue,
    getUniqueTubeValues,
    findTubesByFieldValue,
    analyzeFieldConflicts
  ]);
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
  notes: 'sample.notes',

  // Researcher ID (foreign key)
  researcherId: 'researcherId',

  // Timestamps
  createdAt: 'timestamps.createdAt',
  updatedAt: 'timestamps.updatedAt',
} as const;

export type TubeFieldPath = typeof TUBE_FIELD_PATHS[keyof typeof TUBE_FIELD_PATHS];

/**
 * Type-safe tube field resolver
 */
export interface TypeSafeTubeResolver {
  getValue<K extends keyof typeof TUBE_FIELD_PATHS>(tube: TubeData, field: K): any;
  getValues<K extends keyof typeof TUBE_FIELD_PATHS>(tubes: TubeData[], field: K): any[];
  hasValue<K extends keyof typeof TUBE_FIELD_PATHS>(tube: TubeData, field: K): boolean;
}

/**
 * Hook providing type-safe field resolution using predefined paths
 */
export function useTypeSafeTubeResolver(): TypeSafeTubeResolver {
  const { getTubeValue, getTubeValues, tubeHasValue } = useSimpleFieldResolver();
  
  return useMemo(() => ({
    getValue: <K extends keyof typeof TUBE_FIELD_PATHS>(tube: TubeData, field: K) => {
      return getTubeValue(tube, TUBE_FIELD_PATHS[field]);
    },
    getValues: <K extends keyof typeof TUBE_FIELD_PATHS>(tubes: TubeData[], field: K) => {
      return getTubeValues(tubes, TUBE_FIELD_PATHS[field]);
    },
    hasValue: <K extends keyof typeof TUBE_FIELD_PATHS>(tube: TubeData, field: K) => {
      return tubeHasValue(tube, TUBE_FIELD_PATHS[field]);
    }
  }), [getTubeValue, getTubeValues, tubeHasValue]);
}
