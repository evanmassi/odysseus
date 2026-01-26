// Hooks
export { useSearch } from './hooks/useSearch';
export { useSearchTubesQuery } from './hooks/useSearchQuery';

// Services
export { SearchService } from './services/SearchService';

// Engine
export { SearchEngine } from './engine/SearchEngine';
export type { HighlightedSegment, DisplayResults } from './engine/SearchEngine';

// Utilities
export { groupTubesByRelevance } from './lib/searchUtils';

// UI Store (UI State Only)
export { useSearchStore } from './stores/searchStore';
export type { SortField, SortDirection } from './stores/searchStore';

// Types and Schemas
export type {
  SearchFilters,
  AdvancedSearchOptions,
  SearchResult,
  GroupedResult,
  SearchResults,
  SearchSuggestionsResponse,
  SaveSearchResponse,
  SavedSearch,
  SavedSearchesResponse,
  FilterOptionsResponse,
} from '@odysseus/shared-schemas';

export {
  SearchFiltersSchema,
  AdvancedSearchOptionsSchema,
  SearchResultSchema,
  GroupedResultSchema,
  SearchResultsSchema,
  SearchSuggestionsResponseSchema,
  SaveSearchResponseSchema,
  SavedSearchSchema,
  SavedSearchesResponseSchema,
  FilterOptionsResponseSchema,
} from '@odysseus/shared-schemas';
