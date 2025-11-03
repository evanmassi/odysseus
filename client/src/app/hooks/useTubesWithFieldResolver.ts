/**
 * Simplified React Query + Field Resolver Integration Hook - Phase 1
 * 
 * Provides tubes data from React Query with simple field resolver capabilities.
 * Uses the new simple field resolver that works with Zod schemas.
 */

import { useMemo } from 'react';
import { useSimpleFieldResolver } from './useSimpleFieldResolver';
import { useTubesQuery } from '@domains/tubes';
import type { TubeData } from '@shared/types/tubeTypes';

/**
 * Hook combining tubes data with simple field resolver
 * Updated for Phase 1 with clean Zod schema integration
 */
export function useTubesWithFieldResolver() {
  const tubesQuery = useTubesQuery();
  const fieldResolver = useSimpleFieldResolver();

  return useMemo(() => ({
    // React Query data
    tubes: tubesQuery.data,
    isLoading: tubesQuery.isLoading,
    error: tubesQuery.error,
    refetch: tubesQuery.refetch,
    
    // Simple field resolver functions (updated API)
    getValue: fieldResolver.getTubeValue,
    getValues: fieldResolver.getTubeValues,
    hasValue: fieldResolver.tubeHasValue,
    
    // Utility functions for TubeInfoPanel
    analyzeFieldConflicts: <T>(selectedTubes: TubeData[], fieldPath: string) => {
      return fieldResolver.analyzeFieldConflicts<T>(selectedTubes, fieldPath);
    },
    
    // Get unique values for a field across all tubes
    getUniqueFieldValues: <T>(fieldPath: string): T[] => {
      if (!tubesQuery.data) return [];
      return fieldResolver.getUniqueTubeValues<T>(tubesQuery.data, fieldPath);
    },

    // Find tubes by field value
    findByFieldValue: <T>(fieldPath: string, value: T): TubeData[] => {
      if (!tubesQuery.data) return [];
      return fieldResolver.findTubesByFieldValue(tubesQuery.data, fieldPath, value);
    }
  }), [tubesQuery, fieldResolver]);
}
