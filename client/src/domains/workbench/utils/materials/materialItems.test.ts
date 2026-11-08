import { materialFields } from './materialCatalog';
import {
  applyMaterialKind,
  copyMaterialField,
  findDuplicateMaterial,
  materialColumns,
  materialFromGuess,
  materialText,
  mergeMaterialInto,
  writeMaterialField,
} from './materialItems';

import type { MaterialGuess } from './materialGuesser';
import type { RememberedMaterial } from './materialMemory';
import type { MaterialItem } from '@odysseus/shared-schemas';

const guessOf = (overrides: Partial<MaterialGuess>): MaterialGuess => ({
  group: 'chem',
  type: 'Chemical',
  name: 'Thing',
  values: {},
  why: '',
  source: 'list',
  ...overrides,
});

const make = (
  overrides: Partial<MaterialGuess> = {},
  memory: Record<string, RememberedMaterial> = {}
) => materialFromGuess(guessOf(overrides), memory);

const fieldOf = (item: MaterialItem, key: string) => {
  const definition = materialFields(item).find(candidate => candidate.key === key);
  if (!definition) throw new Error(`no field ${key}`);
  return definition;
};

describe('materialFromGuess', () => {
  it('shows the default fields for the kind', () => {
    expect(make().shownFields).toEqual(['vendor', 'catalog', 'lot']);
    expect(make({ group: 'equip', type: 'Instrument' }).shownFields).toEqual(['model']);
    expect(make({ group: 'soft', type: 'Dataset' }).shownFields).toEqual([
      'repository',
      'accession-number',
    ]);
  });

  it('keeps guessed values only for fields the kind has and choices it allows', () => {
    const item = make({
      group: 'supplies',
      type: 'Plate',
      values: { format: '96-well', color: 'Purple', nonsense: 'x' },
    });
    expect(item.values).toEqual({ format: '96-well' });
    expect(item.shownFields).toContain('format');
  });

  it('places a dilution into the antibody amount with its unit', () => {
    const item = make({ group: 'ab', type: 'Antibody', amount: { value: '200', unit: '1:N' } });
    expect(item.values['amount']).toBe('200');
    expect(item.units['amount']).toBe('1:N');
    expect(item.shownFields).toContain('amount');
  });

  it('puts a millimolar amount into the stock concentration first', () => {
    const item = make({
      group: 'chem',
      type: 'Drug or inhibitor',
      amount: { value: '10', unit: 'mM' },
    });
    expect(item.values['stock-concentration']).toBe('10');
    expect(item.units['stock-concentration']).toBe('mM');
  });

  it('recalls remembered values, units, custom fields and shown fields of the same kind', () => {
    const remembered: RememberedMaterial = {
      group: 'chem',
      type: 'Chemical',
      values: { vendor: 'Sigma', grade: 'ACS' },
      units: {},
      customFields: [
        {
          key: 'custom-shelf',
          label: 'Shelf',
          kind: 'text',
          scope: 'protocol',
          unit: '',
          options: [],
        },
      ],
      shownFields: ['grade', 'custom-shelf'],
    };
    const item = make({ name: 'NaCl', values: {} }, { nacl: remembered });
    expect(item.values).toMatchObject({ vendor: 'Sigma', grade: 'ACS' });
    expect(item.customFields.map(field => field.key)).toEqual(['custom-shelf']);
    expect(item.shownFields).toEqual(expect.arrayContaining(['vendor', 'grade', 'custom-shelf']));
  });

  it('ignores a remembered material filed under another kind', () => {
    const remembered: RememberedMaterial = {
      group: 'media',
      type: 'Buffer',
      values: { vendor: 'Gibco' },
      units: {},
      customFields: [],
      shownFields: [],
    };
    expect(make({ name: 'PBS' }, { pbs: remembered }).values).toEqual({});
  });
});

describe('writeMaterialField', () => {
  it('borrows a field the item lacks once it has a value, and shows it', () => {
    const tcells = make({ group: 'bio', type: 'Primary cells', name: 'T cells' });
    const raji = make({ group: 'bio', type: 'Cell line', name: 'Raji' });
    const modification = fieldOf(raji, 'genetic-modification');
    writeMaterialField(tcells, modification, '');
    expect(tcells.customFields).toEqual([]);
    writeMaterialField(tcells, modification, 'CAR');
    expect(tcells.customFields.map(field => field.key)).toEqual(['genetic-modification']);
    expect(tcells.shownFields).toContain('genetic-modification');
  });

  it('shows the made-on field once a recipe is written', () => {
    const medium = make({ group: 'media', type: 'Medium', name: 'Complete RPMI' });
    writeMaterialField(medium, fieldOf(medium, 'recipe'), 'RPMI + 10% FBS');
    expect(medium.shownFields).toContain('made-on');
  });
});

describe('applyMaterialKind', () => {
  it('adds the new kind defaults and drops fields the new kind does not have', () => {
    const item = make({ group: 'supplies', type: 'Plate', values: { format: '96-well' } });
    applyMaterialKind(item, 'equip', 'Instrument');
    expect(item.shownFields).toEqual(['model']);
    expect(item).toMatchObject({ group: 'equip', type: 'Instrument' });
  });
});

describe('copyMaterialField and mergeMaterialInto', () => {
  it('fills down a value with its unit, borrowing the field if needed', () => {
    const source = make({
      group: 'ab',
      type: 'Antibody',
      name: 'CD4',
      amount: { value: '5', unit: 'µL' },
    });
    const target = make({ group: 'ab', type: 'Isotype control', name: 'Iso' });
    expect(copyMaterialField(target, source, 'amount')).toBe(true);
    expect(target.values['amount']).toBe('5');
    expect(target.units['amount']).toBe('µL');
    expect(target.customFields.map(field => field.key)).toEqual(['amount']);
    expect(copyMaterialField(target, source, 'missing')).toBe(false);
  });

  it('merges only into blank fields', () => {
    const target = make({ name: 'DMSO', values: {} });
    target.values['vendor'] = 'Sigma';
    const source = make({ name: 'DMSO' });
    source.values['vendor'] = 'Fisher';
    source.values['catalog'] = 'D2650';
    mergeMaterialInto(target, source);
    expect(target.values).toMatchObject({ vendor: 'Sigma', catalog: 'D2650' });
  });
});

describe('findDuplicateMaterial', () => {
  it('matches names loosely unless the name was kept twice on purpose', () => {
    const existing = make({ name: 'IFN-γ' });
    const typed = make({ name: 'ifng' });
    expect(findDuplicateMaterial([existing], typed, [])?.id).toBe(existing.id);
    expect(findDuplicateMaterial([existing], typed, ['ifng'])).toBeUndefined();
    expect(findDuplicateMaterial([existing], existing, [])).toBeUndefined();
  });
});

describe('materialText and materialColumns', () => {
  it('formats numbers with their unit and leaves text alone', () => {
    const item = make({ group: 'ab', type: 'Antibody', amount: { value: '200', unit: '1:N' } });
    expect(materialText(item, fieldOf(item, 'amount'))).toBe('1:200');
    expect(materialText(item, fieldOf(item, 'vendor'))).toBe('');
  });

  it('collects each shown field once, in first-seen order', () => {
    const a = make({ group: 'supplies', type: 'Plate', values: { format: '96-well' } });
    const b = make({ group: 'supplies', type: 'Tips' });
    b.shownFields.push('volume');
    expect(materialColumns([a, b]).map(column => column.key)).toEqual([
      'vendor',
      'catalog',
      'lot',
      'format',
      'volume',
    ]);
  });
});
