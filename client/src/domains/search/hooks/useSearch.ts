import { useMemo } from 'react';

import { SearchFilters } from '@odysseus/shared-schemas';

import { useActiveResearchersQuery } from '@domains/researchers';
import { TubeData } from '@domains/tubes/types';
import { useDebounce } from '@shared/hooks';

import { SearchEngine } from '../engine/SearchEngine';
import { useSearchStore } from '../stores/searchStore';

import { useSearchTubesQuery } from './useSearchQuery';



import type { DisplayResults } from '../engine/SearchEngine';


/**
 * Unified Search Hook
 *
 * Single hook that combines all search functionality:
 * - UI state management (Zustand)
 * - Server state management (React Query)
 * - Result formatting (SearchEngine)
 * - Navigation actions
 *
 * This simplifies component code by providing a single API
 * for all search operations.
 *
 * @example
 * ```tsx
 * function SearchContainer() {
 *   const { query, results, isSearching, search, navigateToResult } = useSearch();
 *
 *   return (
 *     <input value={query} onChange={(e) => search(e.target.value)} />
 *     {isSearching && <Spinner />}
 *     {results?.grouped.map(group => <Result group={group} onClick={navigateToResult} />)}
 *   );
 * }
 * ```
 */
export function useSearch() {
  // UI State (Zustand)
  const {
    query,
    filters,
    setSearchQuery,
    setSearchFilters,
    clearSearch,
    hasActiveFilters
  } = useSearchStore();

  // Debounce query to prevent API call on every keystroke
  const debouncedQuery = useDebounce(query, 300);

  // Memoize search options to prevent unnecessary React Query cache misses
  // React Query uses referential equality for query keys - must memoize objects
  const searchOptions = useMemo(() => ({
    query: debouncedQuery,
    filters
  }), [debouncedQuery, filters]);

  // Server State (React Query)
  const searchResult = useSearchTubesQuery(
    searchOptions,
    {
      enabled: !!debouncedQuery.trim() || hasActiveFilters()
    }
  );

  // Researcher data for name resolution
  const { data: researchers = [] } = useActiveResearchersQuery();

  // Format results using SearchEngine
  // Use original query for highlighting (immediate feedback), not debounced query
  const formattedResults: DisplayResults | null = SearchEngine.formatResultsForDisplay(
    searchResult.data,
    query,
    researchers
  );

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
      searchResult.refetch(); // Clear results from React Query
    },
    navigateToResult: SearchEngine.navigateToResult,

    // Raw query result (for advanced use cases)
    refetch: searchResult.refetch,
  };
}
