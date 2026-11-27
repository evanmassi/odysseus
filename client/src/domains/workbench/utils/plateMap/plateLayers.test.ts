import {
  colorLineOf,
  type PlateLine,
  type PlateMap,
  type Protocol,
} from '@odysseus/shared-schemas';

import { calculateBoard } from '../formulas/boardCalculation';

import { lineLayers, plateIndicators, wellStripes } from './plateLayers';
import { sheetOf, plateMapTabs } from './plateMapTabs';

const NO_NAMES = calculateBoard([]);
const NO_SERIES: Protocol['series'] = {};

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
    type: 'plateMap',
    plates: [{ id: 'p', labware: '96', name: '' }],
    otherLabware: [],
    activeTab: 0,
    lines,
    samples: cells,
    counts: {},
    amountNames: {},
    side: 'assay',
    stain: {},
    stainedIn: {},
    showsReplicatesAsOne: false,
  } as unknown as PlateMap;
}

describe('plate indicators', () => {
  const lines = [
    line('stim', ['Stim X', 'Unstim']),
    line('donors', ['Donor 1', 'Donor 2'], 'stripe'),
    line('targets', ['Raji', 'K562'], 'stripe'),
    line('vehicle', ['DMSO', 'None']),
  ];
  const plateMap = plateWith(
    {
      A1: { stim: 'Stim X', donors: 'Donor 1', targets: 'Raji', vehicle: 'DMSO' },
      A2: { stim: 'Unstim', donors: 'Donor 2', vehicle: 'None' },
      A3: { stim: 'Unstim', donors: 'Donor 2', targets: 'K562', vehicle: 'None' },
    },
    lines
  );
  const layers = lineLayers(plateMap, NO_SERIES, lines[0], NO_NAMES);

  it('draws stripes only for the lines set to Stripe, in line order', () => {
    expect(layers.map(layer => layer.role)).toEqual(['fill', 'stripe', 'stripe', 'band']);
    const indicators = plateIndicators(
      plateMap,
      NO_SERIES,
      sheetOf(plateMap, plateMapTabs(plateMap)[0]),
      layers,
      NO_NAMES,
      true
    );
    const striped = indicators
      .filter(indicator => indicator.kind === 'stripe')
      .map(indicator => indicator.lineId);
    expect(new Set(striped)).toEqual(new Set(['donors', 'targets']));
  });

  it('keeps each stripe line in its own slot, empty where the line is missing', () => {
    const [donor, target] = wellStripes(plateMap, 'p:A2', layers);
    expect(donor).toMatchObject({ tint: 100 });
    expect(target).toBeUndefined();
    expect(wellStripes(plateMap, 'p:A3', layers)).toHaveLength(2);
  });

  it('fades a stripe along its series', () => {
    const titrated = plateWith(
      { A1: { ratio: 'T cells' }, A2: { ratio: 'T cells' }, A3: { ratio: 'T cells' } },
      [line('ratio', ['T cells'], 'stripe')]
    );
    ['p:A1', 'p:A2', 'p:A3'].forEach((key, step) => {
      Object.assign(titrated.samples[key]['ratio'], { seriesId: 's', seriesPoint: step });
    });
    const tints = ['p:A1', 'p:A2', 'p:A3'].map(
      key =>
        wellStripes(titrated, key, lineLayers(titrated, NO_SERIES, undefined, NO_NAMES))[0]?.tint
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
    const seriesById: Protocol['series'] = {
      s: { top: '8:1', unit: 'N:N', dilutionFactor: '2', direction: 'right' },
    };
    for (const [key, step] of [
      ['p:A1', 0],
      ['p:A2', 1],
      ['p:B1', 0],
      ['p:B2', 1],
    ] as const) {
      Object.assign(titrated.samples[key]['ratio'], { seriesId: 's', seriesPoint: step });
    }
    const layered = lineLayers(titrated, seriesById, undefined, NO_NAMES);
    const indicators = plateIndicators(
      titrated,
      seriesById,
      sheetOf(titrated, plateMapTabs(titrated)[0]),
      layered,
      NO_NAMES,
      true
    );
    expect(
      indicators.map(indicator => [indicator.label, indicator.text, indicator.wellsInMap])
    ).toEqual([
      ['T donor A', 'T donor A', 2],
      ['T donor B', 'T donor B', 2],
    ]);
  });

  it('keeps different plain amounts apart and names them on the plate', () => {
    const dosed = plateWith({ A1: { drug: 'Drug X' }, A2: { drug: 'Drug X' } }, [
      line('drug', ['Drug X'], 'band'),
    ]);
    Object.assign(dosed.samples['p:A1']['drug'], { amount: '10', unit: 'µM' });
    Object.assign(dosed.samples['p:A2']['drug'], { amount: '5', unit: 'µM' });
    const indicators = plateIndicators(
      dosed,
      NO_SERIES,
      sheetOf(dosed, plateMapTabs(dosed)[0]),
      lineLayers(dosed, NO_SERIES, undefined, NO_NAMES),
      NO_NAMES,
      true
    );
    expect(indicators.map(indicator => indicator.text)).toEqual([
      'Drug X · 10 µM',
      'Drug X · 5 µM',
    ]);
  });

  it('marks each well of a scattered line in the well, or on its border when wells print nothing', () => {
    const scattered = plateWith({ A1: { drug: 'Drug X' }, C3: { drug: 'Drug Y' } }, [
      line('drug', ['Drug X', 'Drug Y'], 'band'),
    ]);
    const sheet = sheetOf(scattered, plateMapTabs(scattered)[0]);
    const layered = lineLayers(scattered, NO_SERIES, undefined, NO_NAMES);
    const placesWhen = (printsInWells: boolean) =>
      plateIndicators(scattered, NO_SERIES, sheet, layered, NO_NAMES, printsInWells).flatMap(
        indicator => indicator.clusters.map(cluster => cluster.place)
      );
    expect(placesWhen(true)).toEqual(['inWell', 'inWell']);
    expect(placesWhen(false)).toEqual(['wellBorder', 'wellBorder']);
  });

  it('labels a fill value with no dose when wells print nothing, and keeps hidden indicator parts', () => {
    const dosed = plateWith(
      { A1: { stim: 'Stim X' }, A2: { stim: 'Unstim' }, B2: { stim: 'Unstim' } },
      [line('stim', ['Stim X', 'Unstim'])]
    );
    Object.assign(dosed.samples['p:A1']['stim'], { amount: '10', unit: 'µM' });
    dosed.lines[0].hiddenIndicators = ['outline'];
    const sheet = sheetOf(dosed, plateMapTabs(dosed)[0]);
    const layered = lineLayers(dosed, NO_SERIES, dosed.lines[0], NO_NAMES);
    expect(plateIndicators(dosed, NO_SERIES, sheet, layered, NO_NAMES, true)).toEqual([]);
    const [label] = plateIndicators(dosed, NO_SERIES, sheet, layered, NO_NAMES, false);
    expect(label).toMatchObject({ kind: 'fill', label: 'Unstim', showsOutline: false });
  });

  it('fills the wells with the line that has a series', () => {
    const titrated = plateWith(
      { A1: { donors: 'Donor 1', stim: 'Stim X' }, A2: { donors: 'Donor 2', stim: 'Stim X' } },
      [line('donors', ['Donor 1', 'Donor 2']), line('stim', ['Stim X'])]
    );
    titrated.samples['p:A1']['stim'].seriesId = 's';
    expect(colorLineOf(titrated)?.id).toBe('stim');
  });
});
