import { colorLineOf, type PlateLine, type VesselMapBlock } from '@odysseus/shared-schemas';

import { calculateBoard } from '../formulas/boardCalculation';

import { fillAmounts, lineLayers, plateBands, wellStripes } from './plateLayers';
import { sheetOf, vesselTabs } from './vesselTabs';

const NO_NAMES = calculateBoard([]);

const line = (id: string, texts: string[], role: PlateLine['role'] = 'auto'): PlateLine => ({
  id,
  name: id,
  role,
  values: texts.map(text => ({ id: `${id}-${text}`, text })),
});

function plateWith(wells: Record<string, Record<string, string>>, lines: PlateLine[]) {
  const cells = Object.fromEntries(
    Object.entries(wells).map(([well, values]) => [
      `p:${well}`,
      Object.fromEntries(
        Object.entries(values).map(([lineId, text]) => [lineId, { valueId: `${lineId}-${text}` }])
      ),
    ])
  );
  return {
    id: 'plate',
    type: 'plate',
    plates: [{ id: 'p', vessel: '96', name: '' }],
    sets: [],
    activeTab: 0,
    lines,
    cells,
    series: {},
    counts: {},
    amountNames: {},
    mergesReplicates: false,
  } as unknown as VesselMapBlock;
}

describe('plate marks', () => {
  const lines = [
    line('stim', ['Stim X', 'Unstim']),
    line('donors', ['Donor 1', 'Donor 2'], 'stripe'),
    line('targets', ['Raji', 'K562'], 'stripe'),
    line('vehicle', ['DMSO', 'None']),
  ];
  const plate = plateWith(
    {
      A1: { stim: 'Stim X', donors: 'Donor 1', targets: 'Raji', vehicle: 'DMSO' },
      A2: { stim: 'Unstim', donors: 'Donor 2', vehicle: 'None' },
      A3: { stim: 'Unstim', donors: 'Donor 2', targets: 'K562', vehicle: 'None' },
    },
    lines
  );
  const layers = lineLayers(plate, lines[0], NO_NAMES);

  it('draws stripes only for the lines set to Stripe, in line order', () => {
    expect(layers.map(layer => layer.role)).toEqual(['color', 'stripe', 'stripe', 'band']);
    const bands = plateBands(plate, sheetOf(plate, vesselTabs(plate)[0]), layers, NO_NAMES, true);
    const striped = bands.filter(band => band.kind === 'stripe').map(band => band.lineId);
    expect(new Set(striped)).toEqual(new Set(['donors', 'targets']));
  });

  it('keeps each stripe line in its own slot, empty where the line is missing', () => {
    const [donor, target] = wellStripes(plate, 'p:A2', layers);
    expect(donor).toMatchObject({ tint: 100 });
    expect(target).toBeUndefined();
    expect(wellStripes(plate, 'p:A3', layers)).toHaveLength(2);
  });

  it('fades a stripe along its series', () => {
    const titrated = plateWith(
      { A1: { ratio: 'T cells' }, A2: { ratio: 'T cells' }, A3: { ratio: 'T cells' } },
      [line('ratio', ['T cells'], 'stripe')]
    );
    ['p:A1', 'p:A2', 'p:A3'].forEach((key, step) => {
      Object.assign(titrated.cells[key]['ratio'], { seriesId: 's', seriesStep: step });
    });
    const tints = ['p:A1', 'p:A2', 'p:A3'].map(
      key => wellStripes(titrated, key, lineLayers(titrated, undefined, NO_NAMES))[0]?.tint
    );
    expect(tints).toEqual([100, 65, 30]);
  });

  it('gives a value on a series one band, its range said once', () => {
    const titrated = plateWith(
      {
        A1: { ratio: 'T donor A' },
        A2: { ratio: 'T donor A' },
        B1: { ratio: 'T donor B' },
        B2: { ratio: 'T donor B' },
      },
      [line('ratio', ['T donor A', 'T donor B'], 'stripe')]
    );
    titrated.series = { s: { start: '8:1', unit: 'N:N', fold: '2', direction: 'right' } };
    for (const [key, step] of [
      ['p:A1', 0],
      ['p:A2', 1],
      ['p:B1', 0],
      ['p:B2', 1],
    ] as const) {
      Object.assign(titrated.cells[key]['ratio'], { seriesId: 's', seriesStep: step });
    }
    const layered = lineLayers(titrated, undefined, NO_NAMES);
    const bands = plateBands(
      titrated,
      sheetOf(titrated, vesselTabs(titrated)[0]),
      layered,
      NO_NAMES,
      true
    );
    expect(bands.map(band => [band.label, band.amount, band.text, band.wellsInMap])).toEqual([
      ['T donor A', '8:1 → 4:1', 'T donor A', 2],
      ['T donor B', '8:1 → 4:1', 'T donor B', 2],
    ]);
  });

  it('keeps different plain amounts apart and names them on the plate', () => {
    const dosed = plateWith({ A1: { drug: 'Drug X' }, A2: { drug: 'Drug X' } }, [
      line('drug', ['Drug X'], 'band'),
    ]);
    Object.assign(dosed.cells['p:A1']['drug'], { amount: '10', unit: 'µM' });
    Object.assign(dosed.cells['p:A2']['drug'], { amount: '5', unit: 'µM' });
    const bands = plateBands(
      dosed,
      sheetOf(dosed, vesselTabs(dosed)[0]),
      lineLayers(dosed, undefined, NO_NAMES),
      NO_NAMES,
      true
    );
    expect(bands.map(band => band.text)).toEqual(['Drug X · 10 µM', 'Drug X · 5 µM']);
    expect(fillAmounts(dosed, dosed.lines[0], NO_NAMES).get('drug-Drug X')).toBe('10 µM, 5 µM');
  });

  it('tags each well of a scattered line, or rings it when wells print nothing', () => {
    const scattered = plateWith({ A1: { drug: 'Drug X' }, C3: { drug: 'Drug Y' } }, [
      line('drug', ['Drug X', 'Drug Y'], 'band'),
    ]);
    const sheet = sheetOf(scattered, vesselTabs(scattered)[0]);
    const layered = lineLayers(scattered, undefined, NO_NAMES);
    const placesWhen = (printsInWells: boolean) =>
      plateBands(scattered, sheet, layered, NO_NAMES, printsInWells).flatMap(band =>
        band.clusters.map(cluster => cluster.place)
      );
    expect(placesWhen(true)).toEqual(['well', 'well']);
    expect(placesWhen(false)).toEqual(['ring', 'ring']);
  });

  it('labels a fill value with no dose when wells print nothing, and keeps hidden marks', () => {
    const dosed = plateWith(
      { A1: { stim: 'Stim X' }, A2: { stim: 'Unstim' }, B2: { stim: 'Unstim' } },
      [line('stim', ['Stim X', 'Unstim'])]
    );
    Object.assign(dosed.cells['p:A1']['stim'], { amount: '10', unit: 'µM' });
    dosed.lines[0].hiddenMarks = ['outline'];
    const sheet = sheetOf(dosed, vesselTabs(dosed)[0]);
    const layered = lineLayers(dosed, dosed.lines[0], NO_NAMES);
    expect(plateBands(dosed, sheet, layered, NO_NAMES, true)).toEqual([]);
    const [label] = plateBands(dosed, sheet, layered, NO_NAMES, false);
    expect(label).toMatchObject({ kind: 'fill', label: 'Unstim', showsOutline: false });
  });

  it('fills the wells with the line that has a series', () => {
    const titrated = plateWith(
      { A1: { donors: 'Donor 1', stim: 'Stim X' }, A2: { donors: 'Donor 2', stim: 'Stim X' } },
      [line('donors', ['Donor 1', 'Donor 2']), line('stim', ['Stim X'])]
    );
    titrated.cells['p:A1']['stim'].seriesId = 's';
    expect(colorLineOf(titrated)?.id).toBe('stim');
  });
});
