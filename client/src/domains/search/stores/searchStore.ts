/**
 * Search Store
 *
 * Zustand store for search UI state: query input, filters, and sort preferences.
 */

import { create } from 'zustand';

import type { SearchFilters } from '@odysseus/shared-schemas';

export type SortField = 'location' | 'date' | 'cellType' | 'researcher' | 'lotNumber';
type SortDirection = 'asc' | 'desc';

interface SearchUIState {
  query: string;
  filters: SearchFilters;
  sortField: SortField;
  sortDirection: SortDirection;
}

interface SearchUIActions {
  setSearchQuery: (query: string) => void;
  setSearchFilters: (filters: SearchFilters) => void;
  clearSearch: () => void;
  clearFilters: () => void;
  setSortField: (field: SortField) => void;
  toggleSortDirection: () => void;
  toggleFilterValue: <K extends keyof SearchFilters>(filterKey: K, value: string) => void;
  hasActiveFilters: () => boolean;
}

interface SearchUIStore extends SearchUIState, SearchUIActions {}

export const useSearchStore = create<SearchUIStore>((set, get) => ({
  query: '',
  filters: {},
  sortField: 'location',
  sortDirection: 'asc',

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

  setSortField: field => set({ sortField: field }),

  toggleSortDirection: () => {
    const { sortDirection } = get();
    set({ sortDirection: sortDirection === 'asc' ? 'desc' : 'asc' });
  },

  toggleFilterValue: (filterKey, value) => {
    const { filters } = get();
    const currentArray = (filters[filterKey] as string[] | undefined) ?? [];

    const newArray = currentArray.includes(value)
      ? currentArray.filter(v => v !== value)
      : [...currentArray, value];

    const nextFilters = { ...filters } as Record<string, string[] | string | undefined>;
    if (newArray.length > 0) {
      nextFilters[filterKey] = newArray;
    } else {
      // Drop the key entirely; leaving it undefined still counts in Object.keys(filters).length.
      delete nextFilters[filterKey];
    }

    set({ filters: nextFilters as SearchFilters });
  },

  hasActiveFilters: () => {
    const { filters } = get();
    return Object.values(filters).some(value =>
      Array.isArray(value) ? value.length > 0 : value !== undefined
    );
  },
}));
