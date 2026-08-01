/**
 * Attribute Value Drafts
 *
 * The diff decides what gets written, so the cases that matter are the ones that must produce a
 * request when nothing looks changed: a multi-select whose options were swapped, and a value
 * emptied on purpose, which is how a value is cleared.
 */

import { describe, expect, it } from 'vitest';

import { changedAttributeRequests, draftsFromValues, isDraftPopulated } from './attributeDrafts';

import type { AttributeValueRow } from './attributeDrafts';
import type { AttributeDefinition } from '@odysseus/shared-schemas';

const definition = (
  id: string,
  valueType: AttributeDefinition['valueType']
): AttributeDefinition => ({
  id,
  labId: 'lab',
  name: id,
  valueType,
  appliesToCatalog: 'reagent',
  appliesToTypes: [],
  sortOrder: 0,
  isSystem: false,
  systemKey: null,
  promptOnForm: false,
  createdAt: new Date('2026-07-01'),
  updatedAt: new Date('2026-07-01'),
});

const DEFINITIONS = [
  definition('hazard', 'multi_select'),
  definition('form', 'select'),
  definition('clone', 'text'),
  definition('dilution', 'number'),
];

const value = (
  definitionId: string,
  fields: Partial<AttributeValueRow> = {}
): AttributeValueRow => ({
  definitionId,
  valueOptionId: null,
  valueText: null,
  valueNumber: null,
  ...fields,
});

describe('draftsFromValues', () => {
  it('aggregates a multi-select attribute stored as one row per option', () => {
    const drafts = draftsFromValues([
      value('hazard', { valueOptionId: 'flammable' }),
      value('hazard', { valueOptionId: 'corrosive' }),
    ]);

    expect(drafts['hazard'].optionIds).toEqual(['flammable', 'corrosive']);
  });

  it('keeps scalar values on their own drafts', () => {
    const drafts = draftsFromValues([
      value('clone', { valueText: 'UCHT1' }),
      value('dilution', { valueNumber: 200 }),
    ]);

    expect(drafts['clone'].text).toBe('UCHT1');
    expect(drafts['dilution'].number).toBe(200);
  });
});

describe('isDraftPopulated', () => {
  it('treats whitespace-only text as empty', () => {
    expect(isDraftPopulated({ optionIds: [], text: '   ' })).toBe(false);
    expect(isDraftPopulated({ optionIds: [], text: 'UCHT1' })).toBe(true);
  });

  it('counts zero as a value', () => {
    expect(isDraftPopulated({ optionIds: [], number: 0 })).toBe(true);
  });
});

describe('changedAttributeRequests', () => {
  it('writes nothing when the drafts match, whatever the option order', () => {
    const requests = changedAttributeRequests(
      { hazard: { optionIds: ['flammable', 'corrosive'] } },
      { hazard: { optionIds: ['corrosive', 'flammable'] } },
      DEFINITIONS
    );

    expect(requests).toEqual([]);
  });

  it('writes an empty option list when a value is cleared', () => {
    const requests = changedAttributeRequests({ form: { optionIds: ['liquid'] } }, {}, DEFINITIONS);

    expect(requests).toEqual([{ definitionId: 'form', valueOptionIds: [] }]);
  });

  it('sends each value type in its own field', () => {
    const requests = changedAttributeRequests(
      {},
      {
        clone: { optionIds: [], text: ' UCHT1 ' },
        dilution: { optionIds: [], number: 200 },
      },
      DEFINITIONS
    );

    expect(requests).toEqual([
      { definitionId: 'clone', valueText: 'UCHT1' },
      { definitionId: 'dilution', valueNumber: 200 },
    ]);
  });

  it('ignores a draft whose definition the lab has since deleted', () => {
    const requests = changedAttributeRequests({}, { gone: { optionIds: ['x'] } }, DEFINITIONS);

    expect(requests).toEqual([]);
  });
});
