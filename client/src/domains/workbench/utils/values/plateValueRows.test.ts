import { plateValueRows, removePlateRow, setPlateRowValue } from './plateValueRows';

import type { PlateMap, Protocol } from '@odysseus/shared-schemas';

function protocolWithPlate(): Protocol {
  const plateMap: PlateMap = {
    id: 'map',
    title: 'Assay plate map',
    plates: [{ id: 'p', labware: '96', name: '' }],
    otherLabware: [],
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
    samples: {
      'p:A1': {
        drug: { valueId: 'x', seriesId: 's', seriesPoint: 0 },
        stim: { valueId: 'cd3', amount: '1', unit: 'µg/mL' },
      },
      'p:A2': {
        drug: { valueId: 'x', seriesId: 's', seriesPoint: 1 },
        stim: { valueId: 'cd3', amount: '1', unit: 'µg/mL' },
      },
      'p:A3': { drug: { valueId: 'v' }, stim: { valueId: 'cd3', amount: '1', unit: 'µg/mL' } },
    },
    counts: {},
    amountNames: {},
    stain: {},
    stainedIn: {},
  };
  return { plateMaps: [plateMap] } as unknown as Protocol;
}

const plateIn = (protocol: Protocol) => protocol.plateMaps[0];

const rowNamed = (protocol: Protocol, name: string) =>
  plateValueRows(plateIn(protocol)).find(row => row.name === name)!;

describe('plate rows', () => {
  it('list the counts and amounts a plate holds', () => {
    const protocol = protocolWithPlate();
    expect(plateValueRows(plateIn(protocol)).map(row => row.name)).toEqual([
      'Drug X wells',
      'Vehicle wells',
      'Wells used',
      'Anti-CD3 final conc.',
    ]);
  });

  it('write edits back to the plate', () => {
    const protocol = protocolWithPlate();
    setPlateRowValue(protocol, rowNamed(protocol, 'Anti-CD3 final conc.'), '2');
    setPlateRowValue(protocol, rowNamed(protocol, 'Vehicle wells'), '4');
    const plateMap = plateIn(protocol);
    expect(plateMap.samples['p:A3']['stim']).toMatchObject({ amount: '2' });
    expect(plateMap.counts).toEqual({ v: '4' });
  });

  it('remove a value from its wells or an amount from its wells', () => {
    const protocol = protocolWithPlate();
    const rows = plateValueRows(plateIn(protocol));
    const row = (name: string) => rows.find(candidate => candidate.name === name)!;
    removePlateRow(protocol, row('Vehicle wells'));
    removePlateRow(protocol, row('Anti-CD3 final conc.'));
    const plateMap = plateIn(protocol);
    expect(plateMap.samples['p:A3']).toEqual({ stim: { valueId: 'cd3' } });
    expect(plateMap.samples['p:A1']).toEqual({
      drug: { valueId: 'x', seriesId: 's', seriesPoint: 0 },
      stim: { valueId: 'cd3' },
    });
  });
});
