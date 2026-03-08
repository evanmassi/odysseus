/**
 * Tube Field Resolver
 *
 * Dynamic field access for tube data using dot notation paths,
 * with integrated query state and conflict analysis.
 */

import { useCallback, useMemo } from 'react';

import { useTubes } from '@domains/tubes/hooks/useTubeQueries';
import { hasValue, isObject } from '@domains/tubes/types/fieldTypes';
import { logger } from '@shared/infrastructure/logger';
import { normalizeDateString } from '@shared/utils/dateFormatters';

import type {
  NormalizedFieldValue,
  TubeFieldTypeMap,
  ValidFieldPath,
} from '@domains/tubes/types/fieldTypes';
import type { TubeData } from '@odysseus/shared-schemas';

// Treats empty as a distinct value — empty vs filled = conflict
export interface FieldConflictAnalysis<T extends NormalizedFieldValue = NormalizedFieldValue> {
  state: 'common' | 'conflict';
  hasConflict: boolean;
  commonValue: T | undefined;
  values: (T | undefined)[];
  totalSelected: number;
  withValue: number;
  withoutValue: number;
  distribution: Map<T | undefined, number>;
}

export interface TubeFieldResolverResult {
  getTubeValue<K extends ValidFieldPath>(tube: TubeData, fieldPath: K): TubeFieldTypeMap[K];
  getTubeValue<T extends NormalizedFieldValue = NormalizedFieldValue>(
    tube: TubeData,
    fieldPath: string
  ): T | undefined;

  getTubeValues<K extends ValidFieldPath>(tubes: TubeData[], fieldPath: K): TubeFieldTypeMap[K][];
  getTubeValues<T extends NormalizedFieldValue = NormalizedFieldValue>(
    tubes: TubeData[],
    fieldPath: string
  ): (T | undefined)[];

  tubeHasValue: (tube: TubeData, fieldPath: string) => boolean;

  getUniqueTubeValues<K extends ValidFieldPath>(
    tubes: TubeData[],
    fieldPath: K
  ): NonNullable<TubeFieldTypeMap[K]>[];
  getUniqueTubeValues<T extends NormalizedFieldValue = NormalizedFieldValue>(
    tubes: TubeData[],
    fieldPath: string
  ): T[];

  findTubesByFieldValue<K extends ValidFieldPath>(
    tubes: TubeData[],
    fieldPath: K,
    value: TubeFieldTypeMap[K]
  ): TubeData[];
  findTubesByFieldValue<T extends NormalizedFieldValue = NormalizedFieldValue>(
    tubes: TubeData[],
    fieldPath: string,
    value: T
  ): TubeData[];

  analyzeFieldConflicts<T extends NormalizedFieldValue = NormalizedFieldValue>(
    tubes: TubeData[],
    fieldPath: string
  ): FieldConflictAnalysis<T>;

  tubes: {
    data: TubeData[] | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
    getFieldValues: <T extends NormalizedFieldValue = NormalizedFieldValue>(
      fieldPath: string
    ) => T[];
    findByFieldValue: <T extends NormalizedFieldValue = NormalizedFieldValue>(
      fieldPath: string,
      value: T
    ) => TubeData[];
    getUniqueFieldValues: <T extends NormalizedFieldValue = NormalizedFieldValue>(
      fieldPath: string
    ) => T[];
    analyzeConflicts: <T extends NormalizedFieldValue = NormalizedFieldValue>(
      selectedTubes: TubeData[],
      fieldPath: string
    ) => {
      hasConflict: boolean;
      values: (T | undefined)[];
      commonValue: T | undefined;
      totalSelected: number;
      withValue: number;
    };
    hasAnyConflicts: (selectedTubes: TubeData[], fieldPaths: string[]) => boolean;
  };

  isLoading: boolean;
  hasErrors: boolean;
  errors: (Error | null)[];
}

function getNestedValue(obj: unknown, path: string): unknown {
  if (!isObject(obj) || !path) return undefined;

  return path.split('.').reduce<unknown>((current, key) => {
    if (isObject(current) && key in current) {
      return current[key];
    }
    return undefined;
  }, obj);
}

export function useTubeFieldResolver(): TubeFieldResolverResult {
  const { data, isLoading, error, refetch } = useTubes();

  const getTubeValue = useCallback(
    <T extends NormalizedFieldValue = NormalizedFieldValue>(
      tube: TubeData,
      fieldPath: string
    ): T | undefined => {
      try {
        const value = getNestedValue(tube, fieldPath);
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

      const nonEmptyValues = allValues.filter((value): value is T => hasValue(value));
      const emptyCount = allValues.length - nonEmptyValues.length;

      // Special handling for date fields to avoid timezone comparison bugs
      const isDateField = fieldPath === 'sample.date' || fieldPath.endsWith('.date');

      let normalizedValues: (T | undefined)[];
      const distribution = new Map<T | undefined, number>();

      if (isDateField) {
        normalizedValues = allValues.map(v => {
          if (!hasValue(v)) return undefined;
          if (typeof v === 'string' || v instanceof Date || v === null || v === undefined) {
            return normalizeDateString(v) as T;
          }
          return undefined;
        });
      } else {
        normalizedValues = allValues.map(v => (hasValue(v) ? v : undefined));
      }

      normalizedValues.forEach(value => {
        distribution.set(value, (distribution.get(value) ?? 0) + 1);
      });

      const uniqueValues = Array.from(new Set(normalizedValues));

      let state: 'common' | 'conflict';
      let commonValue: T | undefined;

      if (uniqueValues.length === 1) {
        state = 'common';
        commonValue = uniqueValues[0];
      } else {
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

  const tubeUtils = useMemo(() => {
    const tubes = data ?? [];

    return {
      data,
      isLoading,
      error,
      refetch,

      getFieldValues: <T extends NormalizedFieldValue = NormalizedFieldValue>(
        fieldPath: string
      ): T[] => {
        return getTubeValues<T>(tubes, fieldPath).filter(v => v !== undefined) as T[];
      },

      findByFieldValue: <T extends NormalizedFieldValue = NormalizedFieldValue>(
        fieldPath: string,
        value: T
      ): TubeData[] => {
        return findTubesByFieldValue(tubes, fieldPath, value);
      },

      getUniqueFieldValues: <T extends NormalizedFieldValue = NormalizedFieldValue>(
        fieldPath: string
      ): T[] => {
        return getUniqueTubeValues<T>(tubes, fieldPath);
      },

      analyzeConflicts: <T extends NormalizedFieldValue = NormalizedFieldValue>(
        selectedTubes: TubeData[],
        fieldPath: string
      ) => {
        return analyzeFieldConflicts<T>(selectedTubes, fieldPath);
      },

      hasAnyConflicts: (selectedTubes: TubeData[], fieldPaths: string[]): boolean => {
        if (selectedTubes.length <= 1) return false;
        return fieldPaths.some(
          fieldPath => analyzeFieldConflicts(selectedTubes, fieldPath).hasConflict
        );
      },
    };
  }, [
    data,
    isLoading,
    error,
    refetch,
    getTubeValues,
    findTubesByFieldValue,
    getUniqueTubeValues,
    analyzeFieldConflicts,
  ]);

  const errors = useMemo(() => [error], [error]);
  const hasErrors = error !== null;

  return useMemo(
    () => ({
      getTubeValue,
      getTubeValues,
      tubeHasValue,
      getUniqueTubeValues,
      findTubesByFieldValue,
      analyzeFieldConflicts,
      tubes: tubeUtils,
      isLoading,
      hasErrors,
      errors,
    }),
    [
      getTubeValue,
      getTubeValues,
      tubeHasValue,
      getUniqueTubeValues,
      findTubesByFieldValue,
      analyzeFieldConflicts,
      tubeUtils,
      isLoading,
      hasErrors,
      errors,
    ]
  );
}

export const TUBE_FIELD_PATHS = {
  tankId: 'location.tankId',
  rackId: 'location.rackId',
  boxId: 'location.boxId',
  position: 'location.position',

  cellType: 'sample.cellType',
  donorInternalId: 'sample.donorInternalId',
  donorSourceId: 'sample.donorSourceId',
  concentration: 'sample.concentration',
  concentrationUnit: 'sample.concentrationUnit',
  date: 'sample.date',
  mediaType: 'sample.mediaType',
  mediaSupplements: 'sample.mediaSupplements',
  mediaSelection: 'sample.mediaSelection',
  cultureCondition: 'sample.cultureCondition',
  lotNumber: 'sample.lotNumber',
  species: 'sample.species',
  source: 'sample.source',
  catalogNumber: 'sample.catalogNumber',
  passageNumber: 'sample.passageNumber',
  notes: 'sample.notes',

  researcherId: 'researcherId',

  createdAt: 'timestamps.createdAt',
  updatedAt: 'timestamps.updatedAt',
} as const;
