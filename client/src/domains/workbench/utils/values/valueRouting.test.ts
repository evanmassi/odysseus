import { addRoutedValue } from './valueEdits';
import { routedValueGuess, routeValueLine, rowValueGuess } from './valueRouting';

import type { MaterialItem, Protocol } from '@odysseus/shared-schemas';

const material = (
  id: string,
  name: string,
  group: string,
  type: string,
  values: Record<string, string> = {}
): MaterialItem => ({
  id,
  group,
  type,
  name,
  shownFields: Object.keys(values),
  values,
  units: {},
  customFields: [],
  fieldLabels: {},
  isSetAside: false,
  recipe: [],
});

function protocolWith(): Protocol {
  return {
    cards: [
      { id: 'materials', type: 'materials' },
      { id: 'values', type: 'values' },
    ],
    materials: {
      items: [
        material('raji', 'Raji', 'bio', 'Cell line'),
        material('luc', 'Raji Luc', 'bio', 'Cell line'),
        material('medium', 'ImmunoCult™-XF T Cell Expansion Medium', 'media', 'Medium', {
          'short-name': 'ImmunoCult XF',
        }),
        material('spinner', 'Centrifuge', 'equip', 'Instrument'),
      ],
      customGroups: [],
    },
    values: { items: [], rows: [{ id: 'mix', mixName: 'Th17 cocktail' }] },
    calculations: { items: [], materialSections: [] },
    diluent: '',
  } as unknown as Protocol;
}

const routed = (text: string) => routeValueLine(protocolWith(), text);

describe('routing a typed value', () => {
  it('keeps a line that starts with no material or mix for Assay setup or Unsorted', () => {
    expect(routed('Well volume 80 µL')).toMatchObject({
      destination: { kind: 'general' },
      fullName: 'Total well vol.',
    });
    expect(routed('Centrifuge speed 300 g')?.destination.kind).toBe('general');
  });

  it('files a value under the standard word and gives it the usual unit', () => {
    expect(routed('Overage 10')).toMatchObject({
      line: { name: 'Extra (dead vol.)', value: '10', unit: '%' },
      fullName: 'Extra (dead vol.)',
    });
  });

  it("puts a line that starts with a material on that material's row, the longest name winning", () => {
    expect(routed('Raji per well 10000 cells')).toMatchObject({
      destination: { kind: 'row', materialId: 'raji', label: 'Cells/well' },
      fullName: 'Raji cells/well',
    });
    expect(routed('raji luc per well 5000 cells')?.destination).toMatchObject({
      materialId: 'luc',
    });
  });

  it('knows a material by its short name and names the value by its full name', () => {
    expect(routed('ImmunoCult XF volume per well 50 µL')).toMatchObject({
      destination: { kind: 'row', materialId: 'medium', shownOwner: 'ImmunoCult XF' },
      fullName: 'ImmunoCult™-XF T Cell Expansion Medium vol./well',
    });
  });

  it('fills in a field the material has instead of making a second value', () => {
    expect(routed('Raji count 1e6 cells/mL')).toMatchObject({
      destination: { kind: 'field', materialId: 'raji', field: { key: 'total-cell-conc' } },
    });
  });

  it("puts a line that starts with a mix on the mix's row", () => {
    expect(routed('Th17 cocktail volume 50 µL')?.destination).toMatchObject({
      kind: 'row',
      materialId: undefined,
      valueRowId: 'mix',
      label: 'Vol.',
    });
  });

  it('says where the value will go', () => {
    const taken = new Set(['raji cells/well']);
    const onRow = routed('Raji per well 10000 cells');
    expect(onRow && routedValueGuess(onRow, taken)).toMatchObject({
      place: 'on the Raji row',
      isTaken: true,
    });
    const inMaterials = routed('Raji count 1e6 cells/mL');
    expect(inMaterials && routedValueGuess(inMaterials, taken).place).toBe('in Materials');
    expect(rowValueGuess('Volume per well 50 µL', 'Raji', taken)).toMatchObject({
      full: 'Raji vol./well',
      place: '',
    });
  });
});

describe('adding routed values', () => {
  it('makes one row for a material however many of its values arrive together', () => {
    const protocol = protocolWith();
    for (const text of ['Raji per well 10000 cells', 'Raji volume per well 50 µL']) {
      const value = routeValueLine(protocol, text);
      if (value) addRoutedValue(protocol, value);
    }
    const rajiRows = protocol.values.rows.filter(
      valueRow => 'materialId' in valueRow && valueRow.materialId === 'raji'
    );
    expect(rajiRows).toHaveLength(1);
    expect(protocol.values.items.map(item => ('name' in item ? item.name : ''))).toEqual([
      'Cells/well',
      'Vol./well',
    ]);
  });

  it('writes a field on the material and links it on the row once', () => {
    const protocol = protocolWith();
    for (const text of ['Raji count 1e6 cells/mL', 'Raji count 2e6 cells/mL']) {
      const value = routeValueLine(protocol, text);
      if (value) addRoutedValue(protocol, value);
    }
    const [raji] = protocol.materials.items;
    expect(raji.values['total-cell-conc']).toBe('2e6');
    expect(raji.shownFields).toContain('total-cell-conc');
    expect(protocol.values.items.filter(item => 'materialField' in item)).toHaveLength(1);
  });
});
