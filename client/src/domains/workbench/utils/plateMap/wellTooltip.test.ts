import { calculateBoard } from '../formulas/boardCalculation';

import { lineLayers } from './plateLayers';
import { activeTabOf, sheetOf } from './plateMapTabs';
import { stainedElsewhereRows, stainSideTooltipRows, wellTooltipRows } from './wellTooltip';

import type { ShownPlateMap } from './shownPlateMap';

const empty = calculateBoard([]);

const coCulture = () =>
  ({
    lines: [
      { id: 't', name: '', role: 'stripe', values: [{ id: 'tv', text: 'T donor A' }] },
      { id: 'r', name: '', role: 'auto', values: [{ id: 'rv', text: 'Raji' }] },
    ],
    samples: {
      'p:A1': {
        t: { valueId: 'tv', amount: '4:1', unit: 'N:N' },
        r: { valueId: 'rv', amount: '1e4', unit: 'cells' },
      },
    },
    series: {},
    counts: {},
    amountNames: {},
    side: 'assay',
    stain: {},
    stainedIn: {},
  }) as unknown as ShownPlateMap;

const rowsAt = (plateMap: ShownPlateMap, sources: Array<{ name: string; summary: string }> = []) =>
  wellTooltipRows(plateMap, 'p:A1', lineLayers(plateMap, undefined, empty), empty, sources);

describe('well tooltip rows', () => {
  it('gives each cell its own count and says the ratio once, naming both sides', () => {
    const rows = rowsAt(coCulture());
    expect(rows.map(row => (row.kind === 'line' ? [row.name, row.amount, row.unit] : row))).toEqual(
      [
        { kind: 'ratio', ratio: '4:1', between: 'T donor A : Raji' },
        ['T donor A', '4.00E+4', 'cells'],
        ['Raji', '1.00E+4', 'cells'],
      ]
    );
  });

  it('asks for the other cells when the ratio has no partner', () => {
    const plateMap = coCulture();
    delete plateMap.samples['p:A1']['r'];
    const rows = rowsAt(plateMap);
    expect(rows[0]).toEqual({
      kind: 'ratio',
      ratio: '4:1',
      between: 'pick the cells this ratio is to',
    });
    expect(rows[1]).toMatchObject({ name: 'T donor A', amount: '', unit: '' });
  });

  it('puts a donor’s details under its row and colors each row by its indicator', () => {
    const rows = rowsAt(coCulture(), [{ name: 'T donor A', summary: 'T cells · ID T-201' }]);
    expect(rows[2]).toEqual({ kind: 'detail', text: 'T cells · ID T-201' });
    expect(rows[1]).toMatchObject({ indicator: { kind: 'stripe', color: expect.any(String) } });
  });

  it('says what a pooled position came from, and where a pooled-away well was stained', () => {
    const plateMap = {
      ...coCulture(),
      plates: [{ id: 'p', labware: '96', name: '' }],
      otherLabware: [],
      activeTab: 0,
      stain: { 'p:B1': 'full' },
      stainedIn: { 'p:A1': 'p:B1', 'p:A2': 'p:B1' },
    } as unknown as ShownPlateMap;
    plateMap.samples['p:A2'] = structuredClone(plateMap.samples['p:A1']);
    const sheet = sheetOf(plateMap, activeTabOf(plateMap));
    const layers = lineLayers(plateMap, undefined, empty);
    const pooled = stainSideTooltipRows(plateMap, sheet, 'p:B1', layers, empty, []);
    expect(pooled[0]).toEqual({ kind: 'note', text: 'Came from A1, A2' });
    expect(pooled).toHaveLength(1 + rowsAt(plateMap).length);
    expect(stainedElsewhereRows(plateMap, sheet, 'p:A2', () => 'Full Stain')).toEqual([
      { kind: 'note', text: 'Stained pooled in B1 · Full Stain' },
    ]);
  });
});
