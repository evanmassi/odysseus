import { NAMING_PATTERNS } from '@odysseus/shared-schemas';
import { create } from 'zustand';

import { useTubeStore } from '@domains/tubes';
import { toPositionKey } from '@shared/types/grid';

import type { TubeData } from '@domains/tubes/types';
import type { SearchFilters} from '@odysseus/shared-schemas';

/**
 * UI-Only Search Store
 *
 * This store now only manages UI state:
 * - Search input and filters (form state)
 * - Search history (local UI state)
 * - Sort preferences (UI state)
 * - Navigation actions (UI behavior)
 *
 * Server state (search results, loading states) is now handled by React Query.
 */

export type SortField = 'location' | 'date' | 'cellType' | 'researcher' | 'lotNumber';
export type SortDirection = 'asc' | 'desc';

interface SearchUIState {
  // UI Form State
  query: string;
  filters: SearchFilters;

  // Sort State
  sortField: SortField;
  sortDirection: SortDirection;

  // Local UI State
  history: string[];
}

interface SearchUIActions {
  // Form State Actions
  setSearchQuery: (query: string) => void;
  setSearchFilters: (filters: SearchFilters) => void;
  clearSearch: () => void;

  // Sort Actions
  setSortField: (field: SortField) => void;
  setSortDirection: (direction: SortDirection) => void;
  toggleSortDirection: () => void;

  // Filter Helper Actions (for array-based filters)
  toggleFilterValue: <K extends keyof SearchFilters>(
    filterKey: K,
    value: string
  ) => void;
  hasActiveFilters: () => boolean;
  getActiveFilterCount: () => number;

  // History Actions
  addToSearchHistory: (query: string) => void;

  // Navigation Actions (UI Behavior)
  navigateToGroup: (tubes: TubeData[]) => Promise<void>;
}

interface SearchUIStore extends SearchUIState, SearchUIActions {}

/**
 * UI-Only Search Store Implementation
 *
 * Server state (search results, loading) is now handled by React Query hooks.
 * This store focuses purely on UI state and local storage.
 */

export const useSearchStore = create<SearchUIStore>((set, get) => ({
  // UI State
  query: '',
  filters: {},
  sortField: 'location',
  sortDirection: 'asc',
  history: [],

  // Form State Actions
  setSearchQuery: (query) => set({ query }),

  setSearchFilters: (filters) => set({ filters }),

  clearSearch: () => {
    set({
      query: '',
      filters: {},
    });
  },

  // Sort Actions
  setSortField: (field) => set({ sortField: field }),

  setSortDirection: (direction) => set({ sortDirection: direction }),

  toggleSortDirection: () => {
    const { sortDirection } = get();
    set({ sortDirection: sortDirection === 'asc' ? 'desc' : 'asc' });
  },

  // Filter Helper Actions (for checkbox toggle behavior)
  toggleFilterValue: (filterKey, value) => {
    const { filters } = get();
    const currentArray = (filters[filterKey] as string[] | undefined) || [];

    const newArray = currentArray.includes(value)
      ? currentArray.filter(v => v !== value) // Remove if exists
      : [...currentArray, value];              // Add if doesn't exist

    set({
      filters: {
        ...filters,
        [filterKey]: newArray.length > 0 ? newArray : undefined, // Remove key if empty
      }
    });
  },

  hasActiveFilters: () => {
    const { filters } = get();
    return Object.values(filters).some(value =>
      Array.isArray(value) ? value.length > 0 : value !== undefined
    );
  },

  getActiveFilterCount: () => {
    const { filters } = get();
    return Object.values(filters).reduce((count, value) => {
      if (Array.isArray(value)) {
        return count + value.length;
      }
      return value !== undefined ? count + 1 : count;
    }, 0);
  },

  // History Actions
  addToSearchHistory: (query) => {
    const { history } = get();
    const newHistory = [query, ...history.filter(h => h !== query)].slice(0, 10);
    set({ history: newHistory });
  },

  // Navigation Actions (UI Behavior)
  navigateToGroup: async (tubes) => {
    if (tubes.length === 0) return;

    // Get the first tube to determine navigation target
    const firstTube = tubes[0];
    const tankId = firstTube.location.tankId || NAMING_PATTERNS.TANK.ID_PATTERN(1);
    const rackId = firstTube.location.rackId;
    const boxId = firstTube.location.boxId;

    // Use atomic navigation service
    const { gridNavigationService } = await import('@domains/grid');
    await gridNavigationService.navigateToLocation({ tankId, rackId, boxId });

    const tubeStore = useTubeStore.getState();

    // Select the tubes for immediate visibility
    const positionKeys = tubes.map(tube =>
      toPositionKey(
        { tankId: tube.location.tankId || tankId, rackId: tube.location.rackId, boxId: tube.location.boxId },
        tube.location.position
      )
    );
    tubeStore.setSelection(new Set(positionKeys));
  },
}));
