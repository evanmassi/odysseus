/**
 * Search Hook
 *
 * Combines UI state, server state, and result formatting for search operations.
 */

import { useMemo } from 'react';

import { useDebounce } from '@shared/hooks';

import { useSearchStore } from '../stores/searchStore';
import { navigateToResult } from '../utils/navigateToResult';
import { formatResultsForDisplay } from '../utils/searchFormatters';

import { useSearchTubesQuery } from './useSearchQuery';

import type { DisplayResults } from '../utils/searchFormatters';

export function useSearch() {
  // UI State
  const { query, filters, setSearchQuery, setSearchFilters, clearSearch, hasActiveFilters } =
    useSearchStore();

  const debouncedQuery = useDebounce(query);

  // Memoize search options to prevent unnecessary React Query cache misses
  // React Query uses referential equality for query keys - must memoize objects
  const searchOptions = useMemo(
    () => ({
      query: debouncedQuery,
      filters,
    }),
    [debouncedQuery, filters]
  );

  // Server State
  const isSearchActive = !!debouncedQuery.trim() || hasActiveFilters();

  const searchResult = useSearchTubesQuery(searchOptions, {
    enabled: isSearchActive,
  });

  // Use original query for highlighting (immediate feedback), not debounced query
  const formattedResults: DisplayResults | null = isSearchActive
    ? formatResultsForDisplay(searchResult.data, query)
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
    clear: clearSearch,
    navigateToResult,

    // Raw query result (for advanced use cases)
    refetch: searchResult.refetch,
  };
}
