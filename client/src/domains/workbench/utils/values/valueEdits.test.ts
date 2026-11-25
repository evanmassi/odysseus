import { produce } from 'immer';

import { blankProtocol } from '../protocolFile/blankProtocol';

import {
  addNamedValue,
  addSuggestedValue,
  addValueLines,
  addValueRow,
  linkedValueOf,
  materialsById,
  removeValue,
  removeValueRow,
  renameValue,
  restoreValues,
  setValueAmount,
} from './valueEdits';

import type { Protocol } from '@odysseus/shared-schemas';

function protocolWithValues(): Protocol {
  const protocol = blankProtocol();
  protocol.materials.items = [
    {
      id: 'm1',
      group: 'bio',
      type: 'Cell line',
      name: 'HeLa',
      shownFields: ['total-cell-conc'],
      values: { count: '1e6' },
      units: {},
      customFields: [],
      fieldLabels: {},
      isSetAside: false,
      recipe: [],
    },
  ];
  return protocol;
}

describe('value edits', () => {
  it('adds typed lines and asks for the number of a single empty one', () => {
    let needsNumber: string | undefined;
    const after = produce(protocolWithValues(), draft => {
      needsNumber = addValueLines(draft, ['Replicates'], '');
    });
    expect(after.values.items).toEqual([
      { id: needsNumber, name: 'Replicates', value: '', unit: '' },
    ]);
  });

  it('writes a linked value, its label and its unit onto the material', () => {
    let itemId = '';
    const after = produce(protocolWithValues(), draft => {
      const valueRowId = addValueRow(draft, 'm1');
      itemId = addSuggestedValue(draft, valueRowId, {
        kind: 'field',
        materialField: 'total-cell-conc',
        label: 'Count',
      });
      setValueAmount(draft, itemId, '2e6');
      renameValue(draft, itemId, 'Seeding count');
    });
    const item = after.values.items.find(candidate => candidate.id === itemId);
    if (!item) throw new Error('missing value');
    expect(linkedValueOf(after.values, item, materialsById(after))).toMatchObject({
      value: '2e6',
      label: 'Seeding count',
      name: 'HeLa seeding count',
    });
  });

  it('renames a linked field for every material in its Materials column', () => {
    const before = produce(protocolWithValues(), draft => {
      const [hela] = draft.materials.items;
      draft.materials.items.push(
        { ...hela, id: 'm2', name: 'Jurkat' },
        { ...hela, id: 'm3', group: 'chem', type: 'Drug or inhibitor', name: 'Drug X' }
      );
    });
    const after = produce(before, draft => {
      const valueRowId = addValueRow(draft, 'm1');
      const itemId = addSuggestedValue(draft, valueRowId, {
        kind: 'field',
        materialField: 'total-cell-conc',
        label: 'Count',
      });
      renameValue(draft, itemId, 'Seeding count');
    });
    expect(after.materials.items.map(item => item.fieldLabels['total-cell-conc'])).toEqual([
      'Seeding count',
      'Seeding count',
      undefined,
    ]);
  });

  it('puts a removed value back where it was', () => {
    const before = produce(protocolWithValues(), draft => {
      addValueLines(draft, ['A 1', 'B 2', 'C 3'], '');
    });
    const middle = before.values.items[1].id;
    let removed: ReturnType<typeof removeValue>;
    const without = produce(before, draft => {
      removed = removeValue(draft, middle);
    });
    const restored = produce(without, draft => {
      if (removed) restoreValues(draft, removed);
    });
    expect(restored.values.items.map(item => ('name' in item ? item.name : ''))).toEqual([
      'A',
      'B',
      'C',
    ]);
  });

  it('removes and restores a whole row with its values', () => {
    let valueRowId = '';
    const withValueRow = produce(protocolWithValues(), draft => {
      valueRowId = addValueRow(draft, undefined);
      addValueLines(draft, ['Volume 5 mL'], valueRowId);
    });
    let removed: ReturnType<typeof removeValueRow>;
    const without = produce(withValueRow, draft => {
      removed = removeValueRow(draft, valueRowId);
    });
    expect(without.values.items).toEqual([]);
    const restored = produce(without, draft => {
      if (removed) restoreValues(draft, removed);
    });
    expect(restored.values).toEqual(withValueRow.values);
  });

  it('adds a name a calculation needs as a value under its material', () => {
    const before = protocolWithValues();
    const material = materialsById(before).get('m1');
    const after = produce(before, draft =>
      addNamedValue(
        draft,
        { name: 'HeLa per well', value: '', unit: '' },
        material,
        draft.pages[0].id
      )
    );
    expect(after.values.rows).toEqual([{ id: expect.any(String), materialId: 'm1' }]);
    expect(after.values.items).toEqual([
      {
        id: expect.any(String),
        name: 'Per well',
        value: '',
        unit: '',
        row: after.values.rows[0].id,
      },
    ]);
  });
});
