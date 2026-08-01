/**
 * Item Autocomplete Option Tests
 *
 * The Autocomplete primitive renders whatever it is handed, so these options carry the whole
 * burden of narrowing a search.
 */
import { describe, it, expect } from 'vitest';

import {
  filterItemAutocompleteOptions,
  toItemAutocompleteOptions,
} from './itemAutocompleteOptions';

const items = [
  {
    id: 'a',
    name: 'Anti-CD3',
    status: 'active',
    manufacturer: 'BioLegend',
    catalogNumber: '300402',
  },
  { id: 'b', name: 'Nitrile Gloves', status: 'active', manufacturer: 'Ansell' },
  { id: 'c', name: 'Retired Buffer', status: 'archived', manufacturer: 'BioLegend' },
];

describe('toItemAutocompleteOptions', () => {
  it('offers only active items', () => {
    expect(toItemAutocompleteOptions(items).map(o => o.value)).toEqual(['a', 'b']);
  });

  it('subtitles with manufacturer and catalog number', () => {
    expect(toItemAutocompleteOptions(items)[0].secondary).toBe('BioLegend · 300402');
  });
});

describe('filterItemAutocompleteOptions', () => {
  const options = toItemAutocompleteOptions(items);

  it('matches the name, case-insensitively', () => {
    expect(filterItemAutocompleteOptions(options, 'anti').map(o => o.value)).toEqual(['a']);
  });

  it('matches the subtitle, so a manufacturer or catalog number finds the item', () => {
    expect(filterItemAutocompleteOptions(options, 'ansell').map(o => o.value)).toEqual(['b']);
    expect(filterItemAutocompleteOptions(options, '300402').map(o => o.value)).toEqual(['a']);
  });

  it('returns everything for a blank query, and nothing for no match', () => {
    expect(filterItemAutocompleteOptions(options, '  ')).toHaveLength(2);
    expect(filterItemAutocompleteOptions(options, 'zzz')).toHaveLength(0);
  });
});
