/**
 * Select Option Builder Tests
 *
 * Tree order and tier depth, which drive how nested options indent.
 */
import { describe, it, expect } from 'vitest';

import { buildHierarchyOptions } from './selectOptions';

// Intentionally unsorted so the sort-by-order assertion is meaningful.
const nodes = [
  { id: 'p2', name: 'Beta', parentId: null, sortOrder: 2 },
  { id: 'p1', name: 'Alpha', parentId: null, sortOrder: 1 },
  { id: 's1', name: 'Alpha Sub', parentId: 'p1', sortOrder: 1 },
  { id: 'g1', name: 'Alpha Shelf', parentId: 's1', sortOrder: 1 },
];

describe('buildHierarchyOptions', () => {
  it('walks each branch to its end before starting the next', () => {
    expect(buildHierarchyOptions(nodes).map(o => o.label)).toEqual([
      'Alpha',
      'Alpha Sub',
      'Alpha Shelf',
      'Beta',
    ]);
  });

  it('numbers the tiers so the third level indents past the second', () => {
    expect(buildHierarchyOptions(nodes).map(o => o.depth)).toEqual([0, 1, 2, 0]);
  });

  it('is empty when there is nothing to list', () => {
    expect(buildHierarchyOptions([])).toEqual([]);
  });
});
