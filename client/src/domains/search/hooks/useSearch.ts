import { useMemo } from 'react';

import { useActiveResearchersQuery } from '@domains/researchers';
import { useDebounce } from '@shared/hooks';

import { useSearchStore } from '../stores/searchStore';
import { navigateToResult } from '../utils/navigateToResult';
import { formatResultsForDisplay } from '../utils/searchFormatters';

import { useSearchTubesQuery } from './useSearchQuery';

import type { DisplayResults } from '../utils/searchFormatters';

/**
 * Search Hook
 *
 * Combines UI state (Zustand), server state (React Query),
 * and result formatting for search operations.
 */
export function useSearch() {
  // UI State (Zustand)
  const { query, filters, setSearchQuery, setSearchFilters, clearSearch, hasActiveFilters } =
    useSearchStore();

  // Debounce query to prevent API call on every keystroke
  const debouncedQuery = useDebounce(query, 300);

  // Memoize search options to prevent unnecessary React Query cache misses
  // React Query uses referential equality for query keys - must memoize objects
  const searchOptions = useMemo(
    () => ({
      query: debouncedQuery,
      filters,
    }),
    [debouncedQuery, filters]
  );

  // Server State (React Query)
  const searchResult = useSearchTubesQuery(searchOptions, {
    enabled: !!debouncedQuery.trim() || hasActiveFilters(),
  });

  // Researcher data for name resolution
  const { data: researchers = [] } = useActiveResearchersQuery();

  // Format results using SearchEngine
  // Use original query for highlighting (immediate feedback), not debounced query
  // Only format results if search is actually active (has query or filters)
  const isSearchActive = !!debouncedQuery.trim() || hasActiveFilters();
  const formattedResults: DisplayResults | null = isSearchActive
    ? formatResultsForDisplay(searchResult.data, query, researchers)
    : null;

  return {
    // State
    query,
    filters,
    isSearching: searchResult.isLoading,
    error: searchResult.error,

    // Results (formatted and ready for display)
    results: formattedResults,
    hasResults: formattedResults?.hasResults ?? false,

    // Actions
    search: setSearchQuery,
    updateFilters: setSearchFilters,
    clear: () => {
      clearSearch();
      void searchResult.refetch(); // Clear results from React Query
    },
    navigateToResult,

    // Raw query result (for advanced use cases)
    refetch: searchResult.refetch,
  };
}
