import { produce } from 'immer';

import { addNamedValue } from '../formulas/formulaEdits';
import { blankProtocol } from '../protocolFile/blankProtocol';

import {
  addSuggestedValue,
  addValueLines,
  addValueSection,
  linkedValueOf,
  materialsById,
  removeValue,
  removeValueSection,
  renameValue,
  restoreValues,
  setValueAmount,
} from './valueEdits';

import type { Protocol, ValuesBlock } from '@odysseus/shared-schemas';

function board(): Protocol {
  const protocol = blankProtocol();
  for (const block of protocol.blocks) {
    if (block.type === 'materials') {
      block.items = [
        {
          id: 'm1',
          group: 'bio',
          type: 'Cell line',
          name: 'HeLa',
          shownFields: ['count'],
          values: { count: '1e6' },
          units: {},
          customFields: [],
          fieldLabels: {},
          isDropped: false,
          recipe: [],
        },
      ];
    }
  }
  return protocol;
}

const valuesOf = (protocol: Protocol) =>
  protocol.blocks.find((block): block is ValuesBlock => block.type === 'values');

describe('value edits', () => {
  it('adds typed lines and asks for the number of a single empty one', () => {
    let needsNumber: string | undefined;
    const before = board();
    const valuesId = valuesOf(before)?.id ?? '';
    const after = produce(before, draft => {
      needsNumber = addValueLines(draft, valuesId, ['Replicates'], '');
    });
    expect(valuesOf(after)?.items).toEqual([
      { id: needsNumber, name: 'Replicates', value: '', unit: '' },
    ]);
  });

  it('writes a linked value, its label and its unit onto the material', () => {
    const before = board();
    const valuesId = valuesOf(before)?.id ?? '';
    let sectionId = '';
    let itemId: string | undefined;
    const after = produce(before, draft => {
      sectionId = addValueSection(draft, valuesId, 'm1') ?? '';
      itemId = addSuggestedValue(draft, valuesId, sectionId, {
        kind: 'field',
        materialField: 'count',
        label: 'Count',
      });
      setValueAmount(draft, valuesId, itemId ?? '', '2e6');
      renameValue(draft, valuesId, itemId ?? '', 'Seeding count');
    });
    const values = valuesOf(after);
    const item = values?.items.find(candidate => candidate.id === itemId);
    if (!values || !item) throw new Error('missing value');
    expect(linkedValueOf(values, item, materialsById(after))).toMatchObject({
      value: '2e6',
      label: 'Seeding count',
      name: 'HeLa seeding count',
    });
  });

  it('puts a removed value back where it was', () => {
    const before = produce(board(), draft => {
      addValueLines(draft, valuesOf(draft)?.id ?? '', ['A 1', 'B 2', 'C 3'], '');
    });
    const valuesId = valuesOf(before)?.id ?? '';
    const middle = valuesOf(before)?.items[1].id ?? '';
    let removed: ReturnType<typeof removeValue>;
    const without = produce(before, draft => {
      removed = removeValue(draft, valuesId, middle);
    });
    const restored = produce(without, draft => {
      if (removed) restoreValues(draft, valuesId, removed);
    });
    expect(valuesOf(restored)?.items.map(item => ('name' in item ? item.name : ''))).toEqual([
      'A',
      'B',
      'C',
    ]);
  });

  it('removes and restores a whole section with its values', () => {
    const before = board();
    const valuesId = valuesOf(before)?.id ?? '';
    let sectionId = '';
    const withSection = produce(before, draft => {
      sectionId = addValueSection(draft, valuesId, undefined) ?? '';
      addValueLines(draft, valuesId, ['Volume 5 mL'], sectionId);
    });
    let removed: ReturnType<typeof removeValueSection>;
    const without = produce(withSection, draft => {
      removed = removeValueSection(draft, valuesId, sectionId);
    });
    expect(valuesOf(without)?.items).toEqual([]);
    const restored = produce(without, draft => {
      if (removed) restoreValues(draft, valuesId, removed);
    });
    expect(valuesOf(restored)).toEqual(valuesOf(withSection));
  });

  it('adds a missing formula name as a value under its material', () => {
    const before = board();
    const material = materialsById(before).get('m1');
    const after = produce(before, draft =>
      addNamedValue(draft, 'HeLa per well', material, draft.pages[0].id)
    );
    const values = valuesOf(after);
    expect(values?.sections).toEqual([{ id: expect.any(String), materialId: 'm1' }]);
    expect(values?.items).toEqual([
      {
        id: expect.any(String),
        name: 'Per well',
        value: '',
        unit: '',
        section: values?.sections[0].id,
      },
    ]);
  });
});
