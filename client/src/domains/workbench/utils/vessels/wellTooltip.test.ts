import { calculateBoard } from '../formulas/boardCalculation';

import { lineLayers } from './plateLayers';
import { wellTooltipRows } from './wellTooltip';

import type { VesselMapBlock } from '@odysseus/shared-schemas';

const empty = calculateBoard([]);

const coCulture = () =>
  ({
    lines: [
      { id: 't', name: '', role: 'stripe', values: [{ id: 'tv', text: 'T donor A' }] },
      { id: 'r', name: '', role: 'auto', values: [{ id: 'rv', text: 'Raji' }] },
    ],
    cells: {
      'p:A1': {
        t: { valueId: 'tv', amount: '4:1', unit: 'N:N' },
        r: { valueId: 'rv', amount: '1e4', unit: 'cells' },
      },
    },
    series: {},
    counts: {},
    amountNames: {},
  }) as unknown as VesselMapBlock;

const rowsAt = (block: VesselMapBlock, sources: Array<{ name: string; summary: string }> = []) =>
  wellTooltipRows(block, 'p:A1', lineLayers(block, undefined, empty), empty, sources);

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
    const block = coCulture();
    delete block.cells['p:A1']['r'];
    const rows = rowsAt(block);
    expect(rows[0]).toEqual({
      kind: 'ratio',
      ratio: '4:1',
      between: 'pick the cells this ratio is to',
    });
    expect(rows[1]).toMatchObject({ name: 'T donor A', amount: '', unit: '' });
  });

  it('puts a donor’s details under its row and colors each row by its mark', () => {
    const rows = rowsAt(coCulture(), [{ name: 'T donor A', summary: 'T cells · ID T-201' }]);
    expect(rows[2]).toEqual({ kind: 'detail', text: 'T cells · ID T-201' });
    expect(rows[1]).toMatchObject({ color: expect.any(String) });
  });
});
