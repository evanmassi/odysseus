/**
 * React Query + Field Resolver Integration Hook
 *
 * Combines React Query server state management with simple field resolver
 * for unified, type-safe data access patterns.
 */

import { useMemo } from 'react';

import { formatResearcherDropdownDisplay } from '@odysseus/shared-schemas';

import { useActiveResearchersQuery } from '@domains/researchers';
import { useTubes } from '@domains/tubes/hooks/useTubeQueries';

import { useSimpleFieldResolver, type SimpleFieldResolver } from './useSimpleFieldResolver';

import type { NormalizedFieldValue } from '@app/types/fieldTypeMapping';
import type { Researcher } from '@odysseus/shared-schemas';
import type { TubeData } from '@shared/types/Tube';

/**
 * Enhanced data access interface combining React Query with field resolution
 */
export interface UseFieldResolverQueryResult extends SimpleFieldResolver {
  /** React Query tubes data with field resolver integration */
  tubes: {
    data: TubeData[] | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
    /** Get field values from all tubes */
    getFieldValues: <T extends NormalizedFieldValue = NormalizedFieldValue>(
      fieldPath: string
    ) => T[];
    /** Find tubes where field has specific value */
    findByFieldValue: <T extends NormalizedFieldValue = NormalizedFieldValue>(
      fieldPath: string,
      value: T
    ) => TubeData[];
    /** Get unique values for a field across all tubes */
    getUniqueFieldValues: <T extends NormalizedFieldValue = NormalizedFieldValue>(
      fieldPath: string
    ) => T[];
    /** Analyze conflicts in selected tubes */
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
    /** Check if any of the specified fields have conflicts across selected tubes */
    hasAnyConflicts: (selectedTubes: TubeData[], fieldPaths: string[]) => boolean;
  };

  /** React Query researchers data */
  researchers: {
    data: Researcher[] | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
    /** Get active researchers only */
    activeResearchers: Researcher[];
    /** Find researcher by name (case insensitive) */
    findByName: (name: string) => Researcher | undefined;
    /** Get all researcher names sorted */
    getNames: () => string[];
  };

  /** Combined loading state */
  isLoading: boolean;

  /** Combined error state */
  hasErrors: boolean;
  errors: (Error | null)[];
}

/**
 * Hook that combines React Query data fetching with field resolver capabilities
 *
 * Usage:
 * ```tsx
 * function TubeAnalysisPanel() {
 *   const { tubes, getTubeValue, researchers } = useFieldResolverQuery();
 *
 *   if (tubes.isLoading) return <LoadingSpinner />;
 *
 *   const cellTypes = tubes.getUniqueFieldValues('sample.cellType');
 *   const tcells = tubes.findByFieldValue('sample.cellType', 'T-cells');
 *
 *   return (
 *     <div>
 *       <h3>Cell Types: {cellTypes.join(', ')}</h3>
 *       <p>T-cells count: {tcells.length}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useFieldResolverQuery(): UseFieldResolverQueryResult {
  const tubesQuery = useTubes();
  const researchersQuery = useActiveResearchersQuery();
  const fieldResolver = useSimpleFieldResolver();

  const tubeUtils = useMemo(() => {
    const tubes = tubesQuery.data ?? [];

    return {
      data: tubesQuery.data,
      isLoading: tubesQuery.isLoading,
      error: tubesQuery.error,
      refetch: tubesQuery.refetch,

      getFieldValues: <T extends NormalizedFieldValue = NormalizedFieldValue>(
        fieldPath: string
      ): T[] => {
        return fieldResolver.getTubeValues<T>(tubes, fieldPath).filter(v => v !== undefined) as T[];
      },

      findByFieldValue: <T extends NormalizedFieldValue = NormalizedFieldValue>(
        fieldPath: string,
        value: T
      ): TubeData[] => {
        return fieldResolver.findTubesByFieldValue(tubes, fieldPath, value);
      },

      getUniqueFieldValues: <T extends NormalizedFieldValue = NormalizedFieldValue>(
        fieldPath: string
      ): T[] => {
        return fieldResolver.getUniqueTubeValues<T>(tubes, fieldPath);
      },

      analyzeConflicts: <T extends NormalizedFieldValue = NormalizedFieldValue>(
        selectedTubes: TubeData[],
        fieldPath: string
      ) => {
        return fieldResolver.analyzeFieldConflicts<T>(selectedTubes, fieldPath);
      },

      hasAnyConflicts: (selectedTubes: TubeData[], fieldPaths: string[]): boolean => {
        if (selectedTubes.length <= 1) return false;
        return fieldPaths.some(
          fieldPath => fieldResolver.analyzeFieldConflicts(selectedTubes, fieldPath).hasConflict
        );
      },
    };
  }, [tubesQuery, fieldResolver]);

  const researcherUtils = useMemo(() => {
    const researchers = researchersQuery.data ?? [];

    return {
      data: researchersQuery.data,
      isLoading: researchersQuery.isLoading,
      error: researchersQuery.error,
      refetch: researchersQuery.refetch,

      activeResearchers: researchers, // Already filtered to active only

      findByName: (name: string) => {
        return researchers.find(r => {
          const fullName = formatResearcherDropdownDisplay(r);
          return fullName.toLowerCase().includes(name.toLowerCase());
        });
      },

      getNames: () => {
        return researchers.map(r => formatResearcherDropdownDisplay(r)).sort();
      },
    };
  }, [researchersQuery]);

  const isLoading = tubesQuery.isLoading || researchersQuery.isLoading;
  const errors = useMemo(
    () => [tubesQuery.error, researchersQuery.error],
    [tubesQuery.error, researchersQuery.error]
  );
  const hasErrors = errors.some(error => error !== null);

  return useMemo(
    () => ({
      ...fieldResolver,
      tubes: tubeUtils,
      researchers: researcherUtils,
      isLoading,
      hasErrors,
      errors,
    }),
    [fieldResolver, tubeUtils, researcherUtils, isLoading, hasErrors, errors]
  );
}

/**
 * Lightweight version focused only on tubes with field resolution
 */
export function useFieldResolverTubes() {
  const tubesQuery = useTubes();
  const fieldResolver = useSimpleFieldResolver();

  return useMemo(() => {
    const tubes = tubesQuery.data ?? [];

    return {
      tubes: tubesQuery.data,
      isLoading: tubesQuery.isLoading,
      error: tubesQuery.error,
      refetch: tubesQuery.refetch,
      getValue: fieldResolver.getTubeValue,
      getValues: fieldResolver.getTubeValues,
      hasValue: fieldResolver.tubeHasValue,

      getFieldValues: <T extends NormalizedFieldValue = NormalizedFieldValue>(
        fieldPath: string
      ): T[] => {
        return fieldResolver.getTubeValues<T>(tubes, fieldPath).filter(v => v !== undefined) as T[];
      },

      findByFieldValue: <T extends NormalizedFieldValue = NormalizedFieldValue>(
        fieldPath: string,
        value: T
      ): TubeData[] => {
        return fieldResolver.findTubesByFieldValue(tubes, fieldPath, value);
      },

      getUniqueFieldValues: <T extends NormalizedFieldValue = NormalizedFieldValue>(
        fieldPath: string
      ): T[] => {
        return fieldResolver.getUniqueTubeValues<T>(tubes, fieldPath);
      },

      analyzeFieldConflicts: <T extends NormalizedFieldValue = NormalizedFieldValue>(
        selectedTubes: TubeData[],
        fieldPath: string
      ) => {
        return fieldResolver.analyzeFieldConflicts<T>(selectedTubes, fieldPath);
      },
    };
  }, [tubesQuery, fieldResolver]);
}
