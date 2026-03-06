/**
 * Search Store
 *
 * Zustand store for search UI state: query input, filters, and sort preferences.
 */

import { create } from 'zustand';

import type { SearchFilters } from '@odysseus/shared-schemas';

export type SortField = 'location' | 'date' | 'cellType' | 'researcher' | 'lotNumber';
export type SortDirection = 'asc' | 'desc';

interface SearchUIState {
  // UI Form State
  query: string;
  filters: SearchFilters;

  // Sort State
  sortField: SortField;
  sortDirection: SortDirection;
}

interface SearchUIActions {
  // Form State Actions
  setSearchQuery: (query: string) => void;
  setSearchFilters: (filters: SearchFilters) => void;
  clearSearch: () => void;
  clearFilters: () => void;

  // Sort Actions
  setSortField: (field: SortField) => void;
  toggleSortDirection: () => void;

  // Filter Helper Actions
  toggleFilterValue: <K extends keyof SearchFilters>(filterKey: K, value: string) => void;
  hasActiveFilters: () => boolean;
}

interface SearchUIStore extends SearchUIState, SearchUIActions {}

export const useSearchStore = create<SearchUIStore>((set, get) => ({
  query: '',
  filters: {},
  sortField: 'location',
  sortDirection: 'asc',

  // Form State Actions
  setSearchQuery: query => set({ query }),

  setSearchFilters: filters => set({ filters }),

  clearSearch: () => {
    set({
      query: '',
      filters: {},
    });
  },

  clearFilters: () => {
    set({ filters: {} });
  },

  // Sort Actions
  setSortField: field => set({ sortField: field }),

  toggleSortDirection: () => {
    const { sortDirection } = get();
    set({ sortDirection: sortDirection === 'asc' ? 'desc' : 'asc' });
  },

  // Filter Helper Actions
  toggleFilterValue: (filterKey, value) => {
    const { filters } = get();
    const currentArray = (filters[filterKey] as string[] | undefined) ?? [];

    const newArray = currentArray.includes(value)
      ? currentArray.filter(v => v !== value)
      : [...currentArray, value];

    set({
      filters: {
        ...filters,
        [filterKey]: newArray.length > 0 ? newArray : undefined,
      },
    });
  },

  hasActiveFilters: () => {
    const { filters } = get();
    return Object.values(filters).some(value =>
      Array.isArray(value) ? value.length > 0 : value !== undefined
    );
  },
}));
