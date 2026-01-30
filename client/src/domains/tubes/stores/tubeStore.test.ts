/**
 * Tube Store Tests
 *
 * Tests client-side UI state management for tube navigation and selection.
 */

import { act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { useTubeStore } from './tubeStore';

import type { PositionKey } from '@shared/types/GridSelection';

// Helper to create valid PositionKey values for tests
const pk = (n: number): PositionKey => `tank-1:rack-1:box-A:${n}` as PositionKey;
const pkSet = (...positions: number[]): Set<PositionKey> => new Set(positions.map(pk));

describe('tubeStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useTubeStore.getState().resetStore();
    });
  });

  describe('Initial State', () => {
    it('should have correct default values', () => {
      const state = useTubeStore.getState();

      expect(state.currentTank).toBe('tank-1');
      expect(state.currentRack).toBe('1');
      expect(state.currentBox).toBe('A');
      expect(state.selectedPositions.size).toBe(0);
      expect(state.selectionAnchor).toBeNull();
      expect(state.lastSelectionMethod).toBe('standard');
      expect(state.isConnected).toBe(true);
    });

    it('should have empty selection set initially', () => {
      const state = useTubeStore.getState();

      expect(state.selectedPositions).toBeInstanceOf(Set);
      expect(state.selectedPositions.size).toBe(0);
    });
  });

  describe('setCurrentTank()', () => {
    it('should update current tank', () => {
      act(() => {
        useTubeStore.getState().setCurrentTank('tank-2');
      });

      expect(useTubeStore.getState().currentTank).toBe('tank-2');
    });

    it('should clear selection when tank changes', () => {
      act(() => {
        const store = useTubeStore.getState();
        store.setSelection(pkSet(1, 2, 3));
        store.setSelectionAnchor(1);
      });

      expect(useTubeStore.getState().selectedPositions.size).toBe(3);

      act(() => {
        useTubeStore.getState().setCurrentTank('tank-3');
      });

      expect(useTubeStore.getState().selectedPositions.size).toBe(0);
      expect(useTubeStore.getState().selectionAnchor).toBeNull();
    });

    it('should not clear selection when setting same tank', () => {
      act(() => {
        const store = useTubeStore.getState();
        store.setSelection(pkSet(1, 2));
        store.setCurrentTank('tank-1'); // Same as initial
      });

      expect(useTubeStore.getState().selectedPositions.size).toBe(2);
    });
  });

  describe('setCurrentRack()', () => {
    it('should update current rack', () => {
      act(() => {
        useTubeStore.getState().setCurrentRack('5');
      });

      expect(useTubeStore.getState().currentRack).toBe('5');
    });

    it('should clear selection when rack changes', () => {
      act(() => {
        const store = useTubeStore.getState();
        store.setSelection(pkSet(10, 20));
        store.setSelectionAnchor(10);
      });

      act(() => {
        useTubeStore.getState().setCurrentRack('2');
      });

      expect(useTubeStore.getState().selectedPositions.size).toBe(0);
      expect(useTubeStore.getState().selectionAnchor).toBeNull();
    });

    it('should not clear selection when setting same rack', () => {
      act(() => {
        const store = useTubeStore.getState();
        store.setSelection(pkSet(5));
        store.setCurrentRack('1'); // Same as initial
      });

      expect(useTubeStore.getState().selectedPositions.size).toBe(1);
    });
  });

  describe('setCurrentBox()', () => {
    it('should update current box', () => {
      act(() => {
        useTubeStore.getState().setCurrentBox('C');
      });

      expect(useTubeStore.getState().currentBox).toBe('C');
    });

    it('should clear selection when box changes', () => {
      act(() => {
        const store = useTubeStore.getState();
        store.setSelection(pkSet(1, 5, 9));
        store.setSelectionAnchor(5);
      });

      act(() => {
        useTubeStore.getState().setCurrentBox('B');
      });

      expect(useTubeStore.getState().selectedPositions.size).toBe(0);
      expect(useTubeStore.getState().selectionAnchor).toBeNull();
    });

    it('should not clear selection when setting same box', () => {
      act(() => {
        const store = useTubeStore.getState();
        store.setSelection(pkSet(7, 8, 9));
        store.setCurrentBox('A'); // Same as initial
      });

      expect(useTubeStore.getState().selectedPositions.size).toBe(3);
    });
  });

  describe('togglePosition()', () => {
    it('should add position to selection', () => {
      act(() => {
        useTubeStore.getState().togglePosition(pk(5));
      });

      const positions = useTubeStore.getState().selectedPositions;
      expect(positions.has(pk(5))).toBe(true);
      expect(positions.size).toBe(1);
    });

    it('should remove position if already selected', () => {
      act(() => {
        useTubeStore.getState().togglePosition(pk(5));
      });

      expect(useTubeStore.getState().selectedPositions.has(pk(5))).toBe(true);

      act(() => {
        useTubeStore.getState().togglePosition(pk(5));
      });

      expect(useTubeStore.getState().selectedPositions.has(pk(5))).toBe(false);
    });

    it('should toggle multiple positions independently', () => {
      act(() => {
        const store = useTubeStore.getState();
        store.togglePosition(pk(1));
        store.togglePosition(pk(2));
        store.togglePosition(pk(3));
      });

      expect(useTubeStore.getState().selectedPositions.size).toBe(3);

      act(() => {
        useTubeStore.getState().togglePosition(pk(2));
      });

      const positions = useTubeStore.getState().selectedPositions;
      expect(positions.size).toBe(2);
      expect(positions.has(pk(1))).toBe(true);
      expect(positions.has(pk(2))).toBe(false);
      expect(positions.has(pk(3))).toBe(true);
    });
  });

  describe('setSelection()', () => {
    it('should replace entire selection', () => {
      act(() => {
        useTubeStore.getState().setSelection(pkSet(1, 2));
      });

      act(() => {
        useTubeStore.getState().setSelection(pkSet(10, 20, 30));
      });

      const positions = useTubeStore.getState().selectedPositions;
      expect(positions.size).toBe(3);
      expect(positions.has(pk(1))).toBe(false);
      expect(positions.has(pk(10))).toBe(true);
    });

    it('should accept empty set', () => {
      act(() => {
        useTubeStore.getState().setSelection(pkSet(1, 2, 3));
      });

      act(() => {
        useTubeStore.getState().setSelection(new Set());
      });

      expect(useTubeStore.getState().selectedPositions.size).toBe(0);
    });
  });

  describe('clearSelection()', () => {
    it('should clear all selected positions', () => {
      act(() => {
        useTubeStore.getState().setSelection(pkSet(1, 2, 3, 4, 5));
      });

      expect(useTubeStore.getState().selectedPositions.size).toBe(5);

      act(() => {
        useTubeStore.getState().clearSelection();
      });

      expect(useTubeStore.getState().selectedPositions.size).toBe(0);
    });

    it('should reset selection anchor', () => {
      act(() => {
        useTubeStore.getState().setSelectionAnchor(10);
      });

      expect(useTubeStore.getState().selectionAnchor).toBe(10);

      act(() => {
        useTubeStore.getState().clearSelection();
      });

      expect(useTubeStore.getState().selectionAnchor).toBeNull();
    });

    it('should handle clearing empty selection gracefully', () => {
      act(() => {
        useTubeStore.getState().clearSelection();
      });

      expect(useTubeStore.getState().selectedPositions.size).toBe(0);
      expect(useTubeStore.getState().selectionAnchor).toBeNull();
    });
  });

  describe('setSelectionAnchor()', () => {
    it('should set anchor position', () => {
      act(() => {
        useTubeStore.getState().setSelectionAnchor(25);
      });

      expect(useTubeStore.getState().selectionAnchor).toBe(25);
    });

    it('should allow setting null anchor', () => {
      act(() => {
        useTubeStore.getState().setSelectionAnchor(15);
      });

      act(() => {
        useTubeStore.getState().setSelectionAnchor(null);
      });

      expect(useTubeStore.getState().selectionAnchor).toBeNull();
    });
  });

  describe('setLastSelectionMethod()', () => {
    it('should update selection method', () => {
      act(() => {
        useTubeStore.getState().setLastSelectionMethod('drag');
      });

      expect(useTubeStore.getState().lastSelectionMethod).toBe('drag');
    });

    it('should track standard selection method', () => {
      act(() => {
        useTubeStore.getState().setLastSelectionMethod('drag');
      });

      act(() => {
        useTubeStore.getState().setLastSelectionMethod('standard');
      });

      expect(useTubeStore.getState().lastSelectionMethod).toBe('standard');
    });
  });

  describe('resetStore()', () => {
    it('should reset all state to initial values', () => {
      // Modify all state
      act(() => {
        const store = useTubeStore.getState();
        store.setCurrentTank('tank-99');
        store.setCurrentRack('15');
        store.setCurrentBox('Z');
        store.setSelection(pkSet(1, 2, 3, 4, 5));
        store.setSelectionAnchor(3);
        store.setLastSelectionMethod('drag');
      });

      // Verify state changed
      expect(useTubeStore.getState().currentTank).toBe('tank-99');

      // Reset
      act(() => {
        useTubeStore.getState().resetStore();
      });

      // Verify all reset to defaults
      const state = useTubeStore.getState();
      expect(state.currentTank).toBe('tank-1');
      expect(state.currentRack).toBe('1');
      expect(state.currentBox).toBe('A');
      expect(state.selectedPositions.size).toBe(0);
      expect(state.selectionAnchor).toBeNull();
      expect(state.lastSelectionMethod).toBe('standard');
    });
  });

  describe('Selection Immutability', () => {
    it('should create new Set on toggle (immutability)', () => {
      act(() => {
        useTubeStore.getState().togglePosition(pk(1));
      });

      const firstSet = useTubeStore.getState().selectedPositions;

      act(() => {
        useTubeStore.getState().togglePosition(pk(2));
      });

      const secondSet = useTubeStore.getState().selectedPositions;

      expect(firstSet).not.toBe(secondSet);
    });

    it('should create new Set on location change', () => {
      act(() => {
        useTubeStore.getState().setSelection(pkSet(1, 2, 3));
      });

      const firstSet = useTubeStore.getState().selectedPositions;

      act(() => {
        useTubeStore.getState().setCurrentBox('B');
      });

      const secondSet = useTubeStore.getState().selectedPositions;

      expect(firstSet).not.toBe(secondSet);
    });
  });
});
