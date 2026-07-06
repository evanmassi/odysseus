/**
 * Tube Field Resolver
 *
 * Dynamic field access for tube data using dot notation paths,
 * with integrated query state and conflict analysis.
 */

import { useCallback, useMemo } from 'react';

import { hasValue, isObject } from '@domains/tubes/types/fieldTypes';
import { logger } from '@infra/logger';
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

  analyzeFieldConflicts<T extends NormalizedFieldValue = NormalizedFieldValue>(
    tubes: TubeData[],
    fieldPath: string
  ): FieldConflictAnalysis<T>;

  hasAnyConflicts: (selectedTubes: TubeData[], fieldPaths: string[]) => boolean;
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

/** Standalone conflict analysis — no hook subscription, no query dependency. */
export function analyzeFieldConflict<T extends NormalizedFieldValue = NormalizedFieldValue>(
  tubes: TubeData[],
  fieldPath: string
): FieldConflictAnalysis<T> {
  if (tubes.length === 0) {
    return {
      state: 'common',
      hasConflict: false,
      commonValue: undefined,
      values: [],
      totalSelected: 0,
      withValue: 0,
      withoutValue: 0,
      distribution: new Map(),
    };
  }

  // Normalize date strings so same-day values with differing formats don't read as a conflict
  const isDateField = fieldPath === 'sample.date' || fieldPath.endsWith('.date');

  const allValues = tubes.map(tube => {
    const value = getNestedValue(tube, fieldPath);
    if (value instanceof Date) {
      return normalizeDateString(value) as T | undefined;
    }
    if (isDateField && typeof value === 'string') {
      return normalizeDateString(value) as T | undefined;
    }
    return value as T | undefined;
  });

  let emptyCount = 0;
  const nonEmptyValues: T[] = [];
  for (const value of allValues) {
    if (!hasValue(value)) {
      emptyCount++;
    } else {
      nonEmptyValues.push(value);
    }
  }

  const normalizedValues: (T | undefined)[] = allValues.map(v => (hasValue(v) ? v : undefined));
  const distribution = new Map<T | undefined, number>();
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
}

export function useTubeFieldResolver(): TubeFieldResolverResult {
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

  const analyzeFieldConflicts = useCallback(
    <T extends NormalizedFieldValue = NormalizedFieldValue>(
      tubes: TubeData[],
      fieldPath: string
    ): FieldConflictAnalysis<T> => analyzeFieldConflict<T>(tubes, fieldPath),
    []
  );

  const hasAnyConflicts = useCallback(
    (selectedTubes: TubeData[], fieldPaths: string[]): boolean => {
      if (selectedTubes.length <= 1) return false;
      return fieldPaths.some(
        fieldPath => analyzeFieldConflicts(selectedTubes, fieldPath).hasConflict
      );
    },
    [analyzeFieldConflicts]
  );

  return useMemo(
    () => ({
      getTubeValue,
      analyzeFieldConflicts,
      hasAnyConflicts,
    }),
    [getTubeValue, analyzeFieldConflicts, hasAnyConflicts]
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
