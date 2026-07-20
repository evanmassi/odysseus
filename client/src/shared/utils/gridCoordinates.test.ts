/**
 * Grid Coordinate Utilities Tests
 *
 * Covers position↔coordinate conversion (incl. non-9 grids), rectangle expansion, and linear ranges.
 */
import { describe, it, expect } from 'vitest';

import {
  coordinatesToPosition,
  getPositionsInRectangle,
  getSelectionRange,
  positionToCoordinates,
} from './gridCoordinates';

describe('positionToCoordinates / coordinatesToPosition', () => {
  it('maps positions to zero-based coordinates on a 9-wide grid', () => {
    expect(positionToCoordinates(1, 9)).toEqual({ row: 0, col: 0 });
    expect(positionToCoordinates(9, 9)).toEqual({ row: 0, col: 8 });
    expect(positionToCoordinates(10, 9)).toEqual({ row: 1, col: 0 });
    expect(positionToCoordinates(81, 9)).toEqual({ row: 8, col: 8 });
  });

  it('is the inverse of coordinatesToPosition', () => {
    for (const pos of [1, 9, 10, 45, 81]) {
      const { row, col } = positionToCoordinates(pos, 9);
      expect(coordinatesToPosition(row, col, 9)).toBe(pos);
    }
  });

  it('honors a non-9 grid width', () => {
    expect(positionToCoordinates(7, 6)).toEqual({ row: 1, col: 0 });
    expect(coordinatesToPosition(1, 0, 6)).toBe(7);
  });
});

describe('getPositionsInRectangle', () => {
  it('expands a corner-to-corner rectangle in row-major order', () => {
    const positions = getPositionsInRectangle({ row: 0, col: 0 }, { row: 1, col: 1 }, 9);
    expect(positions).toEqual([1, 2, 10, 11]);
  });

  it('is order-independent for the two corners', () => {
    const forward = getPositionsInRectangle({ row: 0, col: 0 }, { row: 1, col: 1 }, 9);
    const reversed = getPositionsInRectangle({ row: 1, col: 1 }, { row: 0, col: 0 }, 9);
    expect(reversed).toEqual(forward);
  });
});

describe('getSelectionRange', () => {
  it('returns the inclusive range between two positions', () => {
    expect(getSelectionRange(5, 8)).toEqual([5, 6, 7, 8]);
  });

  it('handles reversed endpoints and single positions', () => {
    expect(getSelectionRange(8, 5)).toEqual([5, 6, 7, 8]);
    expect(getSelectionRange(3, 3)).toEqual([3]);
  });
});
