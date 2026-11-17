import { calculateBoard, type BoardCalculation } from '../formulas/boardCalculation';
import { collectBoardNames } from '../formulas/boardNames';
import { nameUsage } from '../formulas/nameUsage';

import { cellWarnings } from './cellFormulas';

import type { MaterialItem, Protocol } from '@odysseus/shared-schemas';

const pbmc = (live: Record<string, string>): MaterialItem =>
  ({
    id: 'pbmc',
    group: 'bio',
    type: 'Primary cells',
    name: 'PBMC',
    shownFields: [],
    values: {},
    units: {},
    customFields: [],
    fieldLabels: {},
    isDropped: false,
    recipe: [],
    sources: {
      label: 'Donors',
      shownFields: [],
      customFields: [],
      rows: [
        { id: 'd1', name: 'Donor 1', values: { 'cells-per-vial': '5e6', ...live }, units: {} },
      ],
    },
  }) as MaterialItem;

function protocolWith(
  live: Record<string, string>,
  values: Array<[name: string, value: string, unit: string]>
): Protocol {
  const cells = Object.fromEntries(
    ['A1', 'A2', 'A3'].map(well => [
      `p:${well}`,
      { d: { valueId: 'v1', amount: '1e5', unit: 'cells' } },
    ])
  );
  return {
    pages: [{ id: 'page', name: 'Setup', steps: [] }],
    blocks: [
      { id: 'materials', type: 'materials', page: 'page', items: [pbmc(live)] },
      {
        id: 'plate',
        type: 'plate',
        page: 'page',
        plates: [{ id: 'p', vessel: '96', name: '' }],
        sets: [],
        lines: [{ id: 'd', name: 'Donors', role: 'auto', values: [{ id: 'v1', text: 'Donor 1' }] }],
        cells,
        series: {},
        counts: {},
        amountNames: {},
      },
      {
        id: 'values',
        type: 'values',
        page: 'page',
        sections: [],
        items: values.map(([name, value, unit]) => ({ id: name, name, value, unit })),
      },
    ],
  } as unknown as Protocol;
}

const answer = (calculation: BoardCalculation, part: string) => {
  const result = calculation.results.get(`cells:donor 1:${part}`);
  return result?.status === 'ok' && 'text' in result.output ? result.output.text : result;
};

const calculate = (protocol: Protocol) => calculateBoard(collectBoardNames(protocol));

const PLATING: Array<[string, string, string]> = [
  ['PBMC volume per well', '100', 'µL'],
  ['PBMC extra', '10', '%'],
];

describe('cell math for a donor on the plate', () => {
  it('works out cells needed, vials, plating concentration, resuspend volume and left over', () => {
    const calculation = calculate(protocolWith({ 'total-count': '1e7', viability: '90' }, PLATING));
    expect(answer(calculation, 'needed')).toBe('3.30E+5 cells');
    expect(answer(calculation, 'vials')).toBe('1');
    expect(answer(calculation, 'plating')).toBe('1.00E+6 cells/mL');
    expect(answer(calculation, 'resuspend')).toBe('9 mL');
    expect(answer(calculation, 'left-over')).toBe('8.67E+6 cells');
    expect(calculation.names.get('donor 1 wells')).toMatchObject({ kind: 'count', count: 3 });
    expect(cellWarnings(calculation).size).toBe(0);
  });

  it('counts a value the cell math reads as used', () => {
    const protocol = protocolWith({ 'live-count': '1e6' }, PLATING);
    const usage = nameUsage(protocol, calculate(protocol), ['PBMC volume per well']);
    expect(usage.get('PBMC volume per well')?.formulaCount).toBe(1);
  });

  it('says what is missing, and warns when the cells fall short', () => {
    const missing = calculate(protocolWith({}, []));
    expect(answer(missing, 'needed')).toBe('3.00E+5 cells');
    expect(answer(missing, 'plating')).toMatchObject({
      status: 'error',
      message: 'Needs PBMC volume per well, the volume of cells added to each well',
    });
    expect(answer(missing, 'left-over')).toMatchObject({ message: 'Needs Donor 1 live count' });

    const short = calculate(protocolWith({ 'live-count': '2e5' }, PLATING));
    expect(cellWarnings(short)).toEqual(
      new Map([['cells:donor 1:left-over', ['Short by 1.30E+5 cells']]])
    );
  });

  it('steps aside for a name the scientist already uses', () => {
    const calculation = calculate(
      protocolWith({ 'live-count': '1e6' }, [['Donor 1 cells needed', '5', '']])
    );
    expect(answer(calculation, 'vials')).toMatchObject({
      message: 'Rename “Donor 1 cells needed”: the cell math for Donor 1 needs that name.',
    });
  });
});
