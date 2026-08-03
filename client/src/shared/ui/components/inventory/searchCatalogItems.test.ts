/**
 * searchCatalogItems tests
 *
 * Guards the two ways an item survives a query — one of its injected fields
 * matches, or its category does — plus the blank-query passthrough the header
 * count relies on.
 */

import { describe, it, expect } from 'vitest';

import { searchCatalogItems } from './searchCatalogItems';

const categories = [
  { id: 'c1', name: 'Pipettes', parentId: null },
  { id: 'c1s', name: 'Single Channel', parentId: 'c1' },
  { id: 'c2', name: 'Reagents', parentId: null },
];

const items = [
  { id: 'i1', categoryId: 'c1s', name: 'P200', manufacturer: 'Eppendorf' },
  { id: 'i2', categoryId: 'c2', name: 'Buffer', manufacturer: undefined },
];

const search = (searchQuery: string) =>
  searchCatalogItems({
    items,
    categories,
    searchQuery,
    getSearchFields: item => [item.name, item.manufacturer],
  });

describe('searchCatalogItems', () => {
  it('returns the list untouched for a blank query', () => {
    expect(search('')).toBe(items);
    expect(search('   ')).toBe(items);
  });

  it('matches an injected field case-insensitively, skipping absent ones', () => {
    expect(search('eppendorf').map(i => i.id)).toEqual(['i1']);
    expect(search('buffer').map(i => i.id)).toEqual(['i2']);
  });

  it('matches by category name, including a matched parent’s children', () => {
    // 'Pipettes' is top-level, so its subcategory's items come along.
    expect(search('pipettes').map(i => i.id)).toEqual(['i1']);
    expect(search('reagents').map(i => i.id)).toEqual(['i2']);
  });

  it('drops everything when nothing matches', () => {
    expect(search('zzznomatch')).toEqual([]);
  });
});
