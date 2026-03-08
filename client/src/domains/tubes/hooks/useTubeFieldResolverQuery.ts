/**
 * Field Resolver Query Hook
 *
 * Combines React Query server state with field resolver for type-safe
 * tube and researcher data access.
 */

import { useMemo } from 'react';

import { formatResearcherDropdownDisplay } from '@odysseus/shared-schemas';

import { useActiveResearchersQuery } from '@domains/researchers';
import { useTubes } from '@domains/tubes/hooks/useTubeQueries';

import { useSimpleFieldResolver, type SimpleFieldResolver } from './useTubeSimpleFieldResolver';

import type { NormalizedFieldValue } from '@app/types/fieldTypeMapping';
import type { Researcher } from '@odysseus/shared-schemas';
import type { TubeData } from '@shared/types/Tube';

export interface UseFieldResolverQueryResult extends SimpleFieldResolver {
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

  researchers: {
    data: Researcher[] | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
    activeResearchers: Researcher[];
    findByName: (name: string) => Researcher | undefined;
    getNames: () => string[];
  };

  isLoading: boolean;
  hasErrors: boolean;
  errors: (Error | null)[];
}

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

      activeResearchers: researchers,

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
