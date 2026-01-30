/**
 * Search Store Tests
 *
 * Tests UI-only search state management including query, filters, sorting, and history.
 */

import { act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useSearchStore } from './searchStore';

// Mock dependencies
vi.mock('@odysseus/shared-schemas', () => ({
  NAMING_PATTERNS: {
    TANK: {
      ID_PATTERN: (n: number) => `tank-${n}`,
    },
  },
}));

vi.mock('@domains/tubes', () => ({
  useTubeStore: {
    getState: vi.fn(() => ({
      setSelection: vi.fn(),
    })),
  },
}));

vi.mock('@shared/types/GridSelection', () => ({
  toPositionKey: vi.fn(
    (location, position) => `${location.tankId}-${location.rackId}-${location.boxId}-${position}`
  ),
}));

vi.mock('@domains/grid', () => ({
  gridNavigationService: {
    navigateToLocation: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('searchStore', () => {
  beforeEach(() => {
    // Reset store to initial state by setting all values explicitly
    act(() => {
      const store = useSearchStore.getState();
      store.clearSearch();
      store.setSortField('location');
      store.setSortDirection('asc');
      // Clear history by replacing with empty array
      useSearchStore.setState({ history: [] });
    });
  });

  describe('Initial State', () => {
    it('should have empty query initially', () => {
      const state = useSearchStore.getState();
      expect(state.query).toBe('');
    });

    it('should have empty filters initially', () => {
      const state = useSearchStore.getState();
      expect(state.filters).toEqual({});
    });

    it('should have default sort settings', () => {
      const state = useSearchStore.getState();
      expect(state.sortField).toBe('location');
      expect(state.sortDirection).toBe('asc');
    });

    it('should have empty history initially', () => {
      const state = useSearchStore.getState();
      expect(state.history).toEqual([]);
    });
  });

  describe('setSearchQuery()', () => {
    it('should update query', () => {
      act(() => {
        useSearchStore.getState().setSearchQuery('test query');
      });

      expect(useSearchStore.getState().query).toBe('test query');
    });

    it('should handle empty query', () => {
      act(() => {
        useSearchStore.getState().setSearchQuery('something');
        useSearchStore.getState().setSearchQuery('');
      });

      expect(useSearchStore.getState().query).toBe('');
    });
  });

  describe('setSearchFilters()', () => {
    it('should set filters', () => {
      const filters = { cellType: ['iPSC', 'MSC'], researcherId: ['r-1'] };

      act(() => {
        useSearchStore.getState().setSearchFilters(filters);
      });

      expect(useSearchStore.getState().filters).toEqual(filters);
    });

    it('should replace existing filters', () => {
      act(() => {
        useSearchStore.getState().setSearchFilters({ cellType: ['A'] });
        useSearchStore.getState().setSearchFilters({ researcherId: ['B'] });
      });

      const filters = useSearchStore.getState().filters;
      expect(filters.cellType).toBeUndefined();
      expect(filters.researcherId).toEqual(['B']);
    });
  });

  describe('clearSearch()', () => {
    it('should clear query and filters', () => {
      act(() => {
        useSearchStore.getState().setSearchQuery('test');
        useSearchStore.getState().setSearchFilters({ cellType: ['iPSC'] });
        useSearchStore.getState().clearSearch();
      });

      const state = useSearchStore.getState();
      expect(state.query).toBe('');
      expect(state.filters).toEqual({});
    });
  });

  describe('clearFilters()', () => {
    it('should clear only filters', () => {
      act(() => {
        useSearchStore.getState().setSearchQuery('test');
        useSearchStore.getState().setSearchFilters({ cellType: ['iPSC'] });
        useSearchStore.getState().clearFilters();
      });

      const state = useSearchStore.getState();
      expect(state.query).toBe('test');
      expect(state.filters).toEqual({});
    });
  });

  describe('Sort Actions', () => {
    it('should set sort field', () => {
      act(() => {
        useSearchStore.getState().setSortField('date');
      });

      expect(useSearchStore.getState().sortField).toBe('date');
    });

    it('should set sort direction', () => {
      act(() => {
        useSearchStore.getState().setSortDirection('desc');
      });

      expect(useSearchStore.getState().sortDirection).toBe('desc');
    });

    it('should toggle sort direction', () => {
      act(() => {
        useSearchStore.getState().toggleSortDirection();
      });
      expect(useSearchStore.getState().sortDirection).toBe('desc');

      act(() => {
        useSearchStore.getState().toggleSortDirection();
      });
      expect(useSearchStore.getState().sortDirection).toBe('asc');
    });
  });

  describe('toggleFilterValue()', () => {
    it('should add value to empty filter', () => {
      act(() => {
        useSearchStore.getState().toggleFilterValue('cellType', 'iPSC');
      });

      expect(useSearchStore.getState().filters.cellType).toEqual(['iPSC']);
    });

    it('should add value to existing filter', () => {
      act(() => {
        useSearchStore.getState().setSearchFilters({ cellType: ['iPSC'] });
        useSearchStore.getState().toggleFilterValue('cellType', 'MSC');
      });

      expect(useSearchStore.getState().filters.cellType).toEqual(['iPSC', 'MSC']);
    });

    it('should remove value if already exists', () => {
      act(() => {
        useSearchStore.getState().setSearchFilters({ cellType: ['iPSC', 'MSC'] });
        useSearchStore.getState().toggleFilterValue('cellType', 'iPSC');
      });

      expect(useSearchStore.getState().filters.cellType).toEqual(['MSC']);
    });

    it('should remove filter key when array becomes empty', () => {
      act(() => {
        useSearchStore.getState().setSearchFilters({ cellType: ['iPSC'] });
        useSearchStore.getState().toggleFilterValue('cellType', 'iPSC');
      });

      expect(useSearchStore.getState().filters.cellType).toBeUndefined();
    });
  });

  describe('hasActiveFilters()', () => {
    it('should return false for empty filters', () => {
      expect(useSearchStore.getState().hasActiveFilters()).toBe(false);
    });

    it('should return true when filters exist', () => {
      act(() => {
        useSearchStore.getState().setSearchFilters({ cellType: ['iPSC'] });
      });

      expect(useSearchStore.getState().hasActiveFilters()).toBe(true);
    });

    it('should return false for empty arrays', () => {
      act(() => {
        useSearchStore.getState().setSearchFilters({ cellType: [] });
      });

      expect(useSearchStore.getState().hasActiveFilters()).toBe(false);
    });
  });

  describe('getActiveFilterCount()', () => {
    it('should return 0 for empty filters', () => {
      expect(useSearchStore.getState().getActiveFilterCount()).toBe(0);
    });

    it('should count array items', () => {
      act(() => {
        useSearchStore.getState().setSearchFilters({ cellType: ['iPSC', 'MSC'] });
      });

      expect(useSearchStore.getState().getActiveFilterCount()).toBe(2);
    });

    it('should count multiple filter types', () => {
      act(() => {
        useSearchStore.getState().setSearchFilters({
          cellType: ['iPSC'],
          researcherId: ['r-1', 'r-2'],
        });
      });

      expect(useSearchStore.getState().getActiveFilterCount()).toBe(3);
    });
  });

  describe('addToSearchHistory()', () => {
    it('should add query to history', () => {
      act(() => {
        useSearchStore.getState().addToSearchHistory('test query');
      });

      expect(useSearchStore.getState().history).toContain('test query');
    });

    it('should add to front of history', () => {
      act(() => {
        useSearchStore.getState().addToSearchHistory('first');
        useSearchStore.getState().addToSearchHistory('second');
      });

      const history = useSearchStore.getState().history;
      expect(history[0]).toBe('second');
      expect(history[1]).toBe('first');
    });

    it('should remove duplicates and move to front', () => {
      act(() => {
        useSearchStore.getState().addToSearchHistory('query1');
        useSearchStore.getState().addToSearchHistory('query2');
        useSearchStore.getState().addToSearchHistory('query1');
      });

      const history = useSearchStore.getState().history;
      expect(history).toEqual(['query1', 'query2']);
    });

    it('should limit history to 10 items', () => {
      act(() => {
        for (let i = 1; i <= 12; i++) {
          useSearchStore.getState().addToSearchHistory(`query${i}`);
        }
      });

      expect(useSearchStore.getState().history).toHaveLength(10);
      expect(useSearchStore.getState().history[0]).toBe('query12');
    });
  });

  describe('navigateToGroup()', () => {
    it('should handle empty tube array', async () => {
      await act(async () => {
        await useSearchStore.getState().navigateToGroup([]);
      });

      // Should not throw or cause issues
    });

    it('should navigate to tube location', async () => {
      const { gridNavigationService } = await import('@domains/grid');
      const mockTube = {
        id: 'tube-1',
        location: { tankId: 'tank-1', rackId: 'rack-1', boxId: 'box-1', position: 5 },
        sample: {},
      };

      await act(async () => {
        await useSearchStore.getState().navigateToGroup([mockTube as never]);
      });

      expect(gridNavigationService.navigateToLocation).toHaveBeenCalledWith({
        tankId: 'tank-1',
        rackId: 'rack-1',
        boxId: 'box-1',
      });
    });
  });
});
