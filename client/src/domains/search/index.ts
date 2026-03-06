/**
 * Search Domain Public API
 *
 * Advanced tube search with filtering, grouping, and result navigation.
 */

export { useSearch } from './hooks/useSearch';

export { useSearchStore } from './stores/searchStore';
export type { SortField } from './stores/searchStore';

export type { SearchResults } from '@odysseus/shared-schemas';
