import { plateValueRows, removePlateRow, setPlateRowValue } from './plateValueRows';

import type { Protocol, VesselMapBlock } from '@odysseus/shared-schemas';

function protocolWithPlate(): Protocol {
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
  return { blocks: [plate] } as unknown as Protocol;
}

const plateIn = (protocol: Protocol) =>
  protocol.blocks.find(block => block.type === 'plate') as VesselMapBlock;

const rowNamed = (protocol: Protocol, name: string) =>
  plateValueRows(plateIn(protocol)).find(row => row.name === name)!;

describe('plate rows', () => {
  it('list the counts and amounts a plate holds', () => {
    expect(plateValueRows(plateIn(protocolWithPlate())).map(row => row.name)).toEqual([
      'Drug X wells',
      'Vehicle wells',
      'Wells used',
      'Drug X top dose',
      'Drug X fold',
      'Drug X points',
      'Anti-CD3 concentration',
    ]);
  });

  it('write edits back to the plate', () => {
    const protocol = protocolWithPlate();
    setPlateRowValue(protocol, rowNamed(protocol, 'Drug X top dose'), '30');
    setPlateRowValue(protocol, rowNamed(protocol, 'Anti-CD3 concentration'), '2');
    setPlateRowValue(protocol, rowNamed(protocol, 'Vehicle wells'), '4');
    const plate = plateIn(protocol);
    expect(plate.series['s']).toMatchObject({ start: '30' });
    expect(plate.cells['p:A3']['stim']).toMatchObject({ amount: '2' });
    expect(plate.counts).toEqual({ v: '4' });
  });

  it('remove a value from its wells, an amount from its wells, or a whole dilution', () => {
    const protocol = protocolWithPlate();
    const rows = plateValueRows(plateIn(protocol));
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
