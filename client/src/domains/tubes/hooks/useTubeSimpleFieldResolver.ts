/**
 * Simple Field Resolver Hook
 *
 * Lightweight field resolver for Zod-based data structures.
 * Provides dynamic field access using dot notation paths.
 */

import { useCallback, useMemo } from 'react';

import { hasValue, isObject } from '@app/types/fieldTypeMapping';
import { logger } from '@shared/infrastructure/logger';
import { normalizeDateString } from '@shared/utils/dateUtils';

import type {
  NormalizedFieldValue,
  TubeFieldTypeMap,
  ValidFieldPath,
} from '@app/types/fieldTypeMapping';
import type { TubeData } from '@shared/types/Tube';

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

export interface SimpleFieldResolver {
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

export function useSimpleFieldResolver(): SimpleFieldResolver {
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
