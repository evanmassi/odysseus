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

import { useSearchQuery } from './useSearchQuery';

import type { DisplayResults } from '../utils/searchFormatters';

export function useSearch() {
  const { query, filters, setSearchQuery, clearSearch, hasActiveFilters } = useSearchStore();

  const debouncedQuery = useDebounce(query);

  // Stable reference so React Query's key comparison doesn't refetch on every render
  const searchOptions = useMemo(
    () => ({
      query: debouncedQuery,
      filters,
    }),
    [debouncedQuery, filters]
  );

  const isSearchActive = !!debouncedQuery.trim() || hasActiveFilters();

  const searchResult = useSearchQuery(searchOptions, {
    enabled: isSearchActive,
  });

  // Highlight against the live query for immediate feedback, not the debounced one
  const formattedResults: DisplayResults | null = isSearchActive
    ? formatResultsForDisplay(searchResult.data, query)
    : null;

  return {
    query,
    filters,
    isSearching: searchResult.isLoading,
    results: formattedResults,
    search: setSearchQuery,
    clear: clearSearch,
    navigateToResult,
    refetch: searchResult.refetch,
  };
}
