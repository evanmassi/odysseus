import {
  labelInSection,
  plateValueRows,
  removePlateRow,
  renamePlateRow,
  setPlateRowValue,
} from './plateValueRows';
import { materialsById } from './valueEdits';

import type { Protocol, ValuesBlock, VesselMapBlock } from '@odysseus/shared-schemas';

const material = (id: string, name: string, type: string) => ({
  id,
  group: 'other',
  type,
  name,
  shownFields: [],
  values: {},
  units: {},
  customFields: [],
  fieldLabels: {},
  isDropped: false,
});

function protocolWith(sections: ValuesBlock['sections'], extraValues = false): Protocol {
  const plate = {
    id: 'map',
    type: 'plate',
    title: 'Assay plate map',
    plates: [{ id: 'p', vessel: '96', name: '' }],
    sets: [],
    lines: [
      {
        id: 'drug',
        name: '',
        role: 'auto',
        values: [
          { id: 'x', text: 'Drug X', color: '#6fa8e8' },
          { id: 'v', text: 'Vehicle', color: '#7d8494' },
        ],
      },
      { id: 'stim', name: '', role: 'auto', values: [{ id: 'cd3', text: 'Anti-CD3' }] },
    ],
    cells: {
      'p:A1': {
        drug: { valueId: 'x', seriesId: 's', seriesStep: 0 },
        stim: { valueId: 'cd3', amount: '1', unit: 'µg/mL' },
      },
      'p:A2': {
        drug: { valueId: 'x', seriesId: 's', seriesStep: 1 },
        stim: { valueId: 'cd3', amount: '1', unit: 'µg/mL' },
      },
      'p:A3': { drug: { valueId: 'v' }, stim: { valueId: 'cd3', amount: '1', unit: 'µg/mL' } },
    },
    series: { s: { start: '10', unit: 'µM', fold: '3', direction: 'right' } },
    counts: {},
    amountNames: {},
  } as unknown as VesselMapBlock;
  const values = (id: string, blockSections: ValuesBlock['sections']) =>
    ({ id, type: 'values', items: [], sections: blockSections }) as unknown as ValuesBlock;
  return {
    blocks: [
      {
        id: 'materials',
        type: 'materials',
        items: [
          material('m-plate', 'Assay plate', 'Plate'),
          material('m-drug', 'Drug X', 'Drug or inhibitor'),
        ],
      },
      plate,
      values('values', sections),
      ...(extraValues ? [values('more', [])] : []),
    ],
  } as unknown as Protocol;
}

const rowsOf = (protocol: Protocol, blockId = 'values') => {
  const block = protocol.blocks.find(candidate => candidate.id === blockId) as ValuesBlock;
  return plateValueRows(protocol, block, materialsById(protocol));
};

const plateIn = (protocol: Protocol) =>
  protocol.blocks.find(block => block.type === 'plate') as VesselMapBlock;

describe('plate rows in Values', () => {
  const sections = [
    { id: 'sec-plate', materialId: 'm-plate' },
    { id: 'sec-drug', materialId: 'm-drug' },
  ];

  it('put counts under the plate material and amounts under their own material', () => {
    const rows = rowsOf(protocolWith(sections));
    expect(rows.map(({ sectionId, name }) => [sectionId, name])).toEqual([
      ['sec-plate', 'Drug X wells'],
      ['sec-plate', 'Vehicle wells'],
      ['sec-plate', 'Wells used'],
      ['sec-drug', 'Drug X top dose'],
      ['sec-drug', 'Drug X fold'],
      ['sec-drug', 'Drug X points'],
      ['sec-plate', 'Anti-CD3 concentration'],
    ]);
  });

  it('show plate amounts once, in the first Values card, when no section claims them', () => {
    const protocol = protocolWith([], true);
    expect(rowsOf(protocol).map(row => row.sectionId)).toEqual(['', '', '', '']);
    expect(rowsOf(protocol, 'more')).toEqual([]);
  });

  it('drop the owner from a label inside its section', () => {
    expect(labelInSection('Drug X top dose', 'Drug X')).toBe('Top dose');
    expect(labelInSection('Wells used', 'Assay plate')).toBe('Wells used');
  });

  it('write edits back to the plate', () => {
    const protocol = protocolWith(sections);
    const rows = rowsOf(protocol);
    const row = (name: string) => rows.find(candidate => candidate.name === name)!;
    setPlateRowValue(protocol, row('Drug X top dose'), '30');
    setPlateRowValue(protocol, row('Anti-CD3 concentration'), '2');
    setPlateRowValue(protocol, row('Vehicle wells'), '4');
    renamePlateRow(protocol, row('Drug X top dose'), 'Highest dose', 'Drug X');
    renamePlateRow(protocol, row('Vehicle wells'), 'DMSO wells', '');
    const plate = plateIn(protocol);
    expect(plate.series['s']).toMatchObject({ start: '30' });
    expect(plate.cells['p:A3']['stim']).toMatchObject({ amount: '2' });
    expect(plate.counts).toEqual({ v: '4' });
    expect(plate.amountNames).toEqual({ 's:s:start': 'Drug X highest dose' });
    expect(plate.lines[0].values[1].text).toBe('DMSO');
  });

  it('remove a value from its wells, an amount from its wells, or a whole dilution', () => {
    const protocol = protocolWith(sections);
    const rows = rowsOf(protocol);
    const row = (name: string) => rows.find(candidate => candidate.name === name)!;
    removePlateRow(protocol, row('Vehicle wells'));
    removePlateRow(protocol, row('Anti-CD3 concentration'));
    removePlateRow(protocol, row('Drug X fold'));
    const plate = plateIn(protocol);
    expect(plate.cells['p:A3']).toEqual({ stim: { valueId: 'cd3' } });
    expect(plate.cells['p:A1']).toEqual({ drug: { valueId: 'x' }, stim: { valueId: 'cd3' } });
    expect(plate.series).toEqual({});
  });
});
