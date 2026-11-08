import { materialFromGuess } from './materialItems';
import { EMPTY_LAB_MEMORY, type LabMemory } from './materialMemory';
import {
  addCustomSectionField,
  fieldChoices,
  hideSectionField,
  searchFieldChoices,
  toggleSectionField,
} from './materialSectionFields';

import type { MaterialItem } from '@odysseus/shared-schemas';

const material = (type: string, group = 'supplies'): MaterialItem =>
  materialFromGuess({ group, type, name: type, values: {}, why: '', source: 'list' }, {});

const shelf = {
  key: 'custom-shelf',
  label: 'Shelf',
  kind: 'text' as const,
  scope: 'protocol' as const,
  unit: '',
  options: [],
};

describe('fieldChoices', () => {
  it('lists type fields before core fields, the most shared first, plus learned fields', () => {
    const memory: LabMemory = { ...EMPTY_LAB_MEMORY, fields: { 'supplies|Tips': [shelf] } };
    const choices = fieldChoices([material('Tips'), material('Tube')], new Set(['vendor']), memory);
    const keys = choices.map(choice => choice.definition.key);
    expect(keys.slice(0, 3)).toEqual(['volume', 'filtered', 'low-retention']);
    expect(keys.indexOf('custom-shelf')).toBeLessThan(keys.indexOf('vendor'));
    expect(choices.find(choice => choice.definition.key === 'vendor')?.isShown).toBe(true);
  });
});

describe('searchFieldChoices', () => {
  const choices = fieldChoices([material('Plate')], new Set(), EMPTY_LAB_MEMORY);

  it('filters by label and picks the exact or only match for Enter', () => {
    expect(searchFieldChoices(choices, 'colo').enterChoice?.definition.key).toBe('color');
    expect(searchFieldChoices(choices, 'Lot').enterChoice?.definition.key).toBe('lot');
    expect(searchFieldChoices(choices, 'Lot').canAddCustom).toBe(false);
  });

  it('offers a new field when nothing matches exactly', () => {
    const search = searchFieldChoices(choices, 'Shelf');
    expect(search.visible).toEqual([]);
    expect(search.enterChoice).toBeUndefined();
    expect(search.canAddCustom).toBe(true);
    expect(searchFieldChoices(choices, '  ').canAddCustom).toBe(false);
  });
});

describe('section field edits', () => {
  it('toggles a field on for every item that has it, then off for all', () => {
    const items = [material('Plate'), material('Tips')];
    toggleSectionField(items, 'sterile', EMPTY_LAB_MEMORY);
    expect(items.map(item => item.shownFields.includes('sterile'))).toEqual([true, false]);
    toggleSectionField(items, 'sterile', EMPTY_LAB_MEMORY);
    expect(items.some(item => item.shownFields.includes('sterile'))).toBe(false);
  });

  it('brings a learned field to items that lack it', () => {
    const items = [material('Tips')];
    const memory: LabMemory = { ...EMPTY_LAB_MEMORY, fields: { 'supplies|Tips': [shelf] } };
    toggleSectionField(items, 'custom-shelf', memory);
    expect(items[0].customFields).toEqual([shelf]);
    expect(items[0].shownFields).toContain('custom-shelf');
  });

  it('adds a custom text field to the whole section once', () => {
    const items = [material('Plate'), material('Tips')];
    addCustomSectionField(items, 'Box position');
    addCustomSectionField(items, 'Box position');
    expect(items.map(item => item.customFields.map(field => field.key))).toEqual([
      ['custom-box-position'],
      ['custom-box-position'],
    ]);
    hideSectionField(items, 'custom-box-position');
    expect(items[0].shownFields).not.toContain('custom-box-position');
  });
});
