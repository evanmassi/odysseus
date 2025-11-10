/**
 * React Query + Field Resolver Integration Hook - Phase 1
 * 
 * Combines React Query server state management with simple field resolver
 * for unified, type-safe data access patterns.
 * 
 * This replaces the legacy field resolver system with a lightweight,
 * Zod-compatible implementation focused on Phase 1 needs.
 */

import { useMemo } from 'react';

import { formatResearcherDropdownDisplay } from '@odysseus/shared-schemas';

import { useActiveResearchersQuery } from '@domains/researchers';
import { useTubesQuery } from '@domains/tubes/hooks/useTubesQuery';

import { useSimpleFieldResolver, type SimpleFieldResolver } from './useSimpleFieldResolver';

import type { Researcher } from '@odysseus/shared-schemas';
import type { TubeData } from '@shared/types/tubeTypes';


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
    getFieldValues: <T>(fieldPath: string) => T[];
    /** Find tubes where field has specific value */
    findByFieldValue: <T>(fieldPath: string, value: T) => TubeData[];
    /** Get unique values for a field across all tubes */
    getUniqueFieldValues: <T>(fieldPath: string) => T[];
    /** Analyze conflicts in selected tubes */
    analyzeConflicts: <T>(selectedTubes: TubeData[], fieldPath: string) => {
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
  // Get React Query data
  const tubesQuery = useTubesQuery();
  const researchersQuery = useActiveResearchersQuery();

  // Get simple field resolver capabilities
  const fieldResolver = useSimpleFieldResolver();

  // Enhanced tube utilities
  const tubeUtils = useMemo(() => {
    const tubes = tubesQuery.data || [];

    return {
      data: tubesQuery.data,
      isLoading: tubesQuery.isLoading,
      error: tubesQuery.error,
      refetch: tubesQuery.refetch,

      getFieldValues: <T>(fieldPath: string): T[] => {
        return fieldResolver.getTubeValues<T>(tubes, fieldPath).filter(v => v !== undefined) as T[];
      },

      findByFieldValue: <T>(fieldPath: string, value: T): TubeData[] => {
        return fieldResolver.findTubesByFieldValue(tubes, fieldPath, value);
      },

      getUniqueFieldValues: <T>(fieldPath: string): T[] => {
        return fieldResolver.getUniqueTubeValues<T>(tubes, fieldPath);
      },

      analyzeConflicts: <T>(selectedTubes: TubeData[], fieldPath: string) => {
        return fieldResolver.analyzeFieldConflicts<T>(selectedTubes, fieldPath);
      },

      /** Check if any of the specified fields have conflicts across selected tubes */
      hasAnyConflicts: (selectedTubes: TubeData[], fieldPaths: string[]): boolean => {
        if (selectedTubes.length <= 1) return false;
        return fieldPaths.some(fieldPath =>
          fieldResolver.analyzeFieldConflicts(selectedTubes, fieldPath).hasConflict
        );
      }
    };
  }, [tubesQuery, fieldResolver]);

  // Enhanced researcher utilities  
  const researcherUtils = useMemo(() => {
    const researchers = researchersQuery.data || [];

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
      }
    };
  }, [researchersQuery]);

  // Combined loading and error states
  const isLoading = tubesQuery.isLoading || researchersQuery.isLoading;
  const errors = useMemo(() => [tubesQuery.error, researchersQuery.error], [tubesQuery.error, researchersQuery.error]);
  const hasErrors = errors.some(error => error !== null);

  return useMemo(() => ({
    // Simple field resolver capabilities
    ...fieldResolver,

    // Enhanced data access
    tubes: tubeUtils,
    researchers: researcherUtils,

    // Combined states
    isLoading,
    hasErrors,
    errors
  }), [fieldResolver, tubeUtils, researcherUtils, isLoading, hasErrors, errors]);
}

/**
 * Lightweight version focused only on tubes with field resolution
 */
export function useFieldResolverTubes() {
  const tubesQuery = useTubesQuery();
  const fieldResolver = useSimpleFieldResolver();

  return useMemo(() => {
    const tubes = tubesQuery.data || [];

    return {
      // React Query state
      tubes: tubesQuery.data,
      isLoading: tubesQuery.isLoading,
      error: tubesQuery.error,
      refetch: tubesQuery.refetch,

      // Field resolver functions
      getValue: fieldResolver.getTubeValue,
      getValues: fieldResolver.getTubeValues,
      hasValue: fieldResolver.tubeHasValue,
      
      // Field-based utilities
      getFieldValues: <T>(fieldPath: string): T[] => {
        return fieldResolver.getTubeValues<T>(tubes, fieldPath).filter(v => v !== undefined) as T[];
      },

      findByFieldValue: <T>(fieldPath: string, value: T): TubeData[] => {
        return fieldResolver.findTubesByFieldValue(tubes, fieldPath, value);
      },

      getUniqueFieldValues: <T>(fieldPath: string): T[] => {
        return fieldResolver.getUniqueTubeValues<T>(tubes, fieldPath);
      },

      // Conflict analysis for TubeInfoPanel
      analyzeFieldConflicts: <T>(selectedTubes: TubeData[], fieldPath: string) => {
        return fieldResolver.analyzeFieldConflicts<T>(selectedTubes, fieldPath);
      }
    };
  }, [tubesQuery, fieldResolver]);
}


