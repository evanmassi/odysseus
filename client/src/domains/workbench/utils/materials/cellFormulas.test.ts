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
        side: 'assay',
        stain: {},
        stainedIn: {},
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

  it('reads the per-well volume and a whole-experiment extra under their other spellings', () => {
    const calculation = calculate(
      protocolWith({ 'total-count': '1e7', viability: '90' }, [
        ['PBMC vol./well', '100', 'µL'],
        ['Extra (dead vol.)', '10', '%'],
      ])
    );
    expect(answer(calculation, 'needed')).toBe('3.30E+5 cells');
    expect(answer(calculation, 'plating')).toBe('1.00E+6 cells/mL');
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
      message: 'Needs "Vol./well" in Values, the volume of cells added to each well',
    });
    expect(answer(missing, 'left-over')).toMatchObject({
      message: 'Needs a live count: Live cells, or Live cell conc. and Vol.',
    });

    const short = calculate(protocolWith({ 'live-count': '2e5' }, PLATING));
    expect(cellWarnings(short)).toEqual(
      new Map([['cells:donor 1:left-over', ['Short by 1.30E+5 cells']]])
    );
  });

  it('steps aside for a name the scientist already uses', () => {
    const calculation = calculate(
      protocolWith({ 'live-count': '1e6' }, [['Donor 1 total needed', '5', '']])
    );
    expect(answer(calculation, 'vials')).toMatchObject({
      message: 'Rename "Donor 1 total needed": the cell math for Donor 1 needs that name.',
    });
  });
});

describe('cell math for cells diluted from a stock', () => {
  const hkca = {
    id: 'hkca',
    group: 'bio',
    type: 'Microbial strain',
    name: 'Heat Killed Candida (Dectin-1 agonist)',
    shownFields: ['stock-concentration', 'short-name'],
    values: { 'stock-concentration': '1e9', 'short-name': 'HKCA' },
    units: { 'stock-concentration': 'cells/mL' },
    customFields: [],
    fieldLabels: {},
    isDropped: false,
    recipe: [],
  } as unknown as MaterialItem;

  function stockProtocol(): Protocol {
    const base = protocolWith({}, []);
    const cells = Object.fromEntries(
      ['A1', 'A2'].map(well => [
        `p:${well}`,
        { d: { valueId: 'v1', amount: '4e4', unit: 'cells' } },
      ])
    );
    return {
      ...base,
      blocks: base.blocks.map(block => {
        if (block.type === 'materials') return { ...block, items: [hkca] };
        if (block.type === 'plate') {
          return {
            ...block,
            cells,
            lines: [{ id: 'd', name: '', role: 'band', values: [{ id: 'v1', text: 'HKCA' }] }],
          };
        }
        if (block.type === 'values') {
          return {
            ...block,
            sections: [{ id: 's', materialId: 'hkca' }],
            items: [{ id: 'vol', name: 'Volume per well', value: '20', unit: 'µL', section: 's' }],
          };
        }
        return block;
      }),
    } as Protocol;
  }

  const stockAnswer = (calculation: BoardCalculation, part: string) => {
    const result = calculation.results.get(`cells:heat killed candida:${part}`);
    return result?.status === 'ok' && 'text' in result.output ? result.output.text : result;
  };

  it('reads the volume per well filed under the full name, and takes stock instead of counting', () => {
    const calculation = calculate(stockProtocol());
    expect(stockAnswer(calculation, 'needed')).toBe('8.00E+4 cells');
    expect(stockAnswer(calculation, 'plating')).toBe('2.00E+6 cells/mL');
    expect(stockAnswer(calculation, 'suspension')).toBe('40 µL');
    expect(stockAnswer(calculation, 'stock')).toBe('0.08 µL');
    expect(stockAnswer(calculation, 'diluent')).toBe('39.9 µL');
    expect(calculation.results.has('cells:heat killed candida:resuspend')).toBe(false);
    expect(calculation.results.has('cells:heat killed candida:left-over')).toBe(false);
  });
});

describe('cell math from the counts', () => {
  const raji = (values: Record<string, string>) =>
    ({
      id: 'raji',
      group: 'bio',
      type: 'Cell line',
      name: 'Raji',
      shownFields: [],
      values,
      units: {},
      customFields: [],
      fieldLabels: {},
      isDropped: false,
      recipe: [],
    }) as unknown as MaterialItem;

  function cultureProtocol(values: Record<string, string>): Protocol {
    const base = protocolWith({}, []);
    const wells = ['A', 'B'].flatMap(row =>
      Array.from({ length: 12 }, (_, index) => `p:${row}${index + 1}`)
    );
    const cells = Object.fromEntries(
      wells.map(well => [well, { d: { valueId: 'v1', amount: '1e4', unit: 'cells' } }])
    );
    return {
      ...base,
      blocks: base.blocks.map(block => {
        if (block.type === 'materials') return { ...block, items: [raji(values)] };
        if (block.type === 'plate') {
          return {
            ...block,
            cells,
            lines: [{ id: 'd', name: '', role: 'band', values: [{ id: 'v1', text: 'Raji' }] }],
          };
        }
        if (block.type === 'values') {
          return {
            ...block,
            sections: [{ id: 's', materialId: 'raji' }],
            items: [
              { id: 'vol', name: 'Vol./well', value: '100', unit: 'µL', section: 's' },
              { id: 'extra', name: 'Extra (dead vol.)', value: '20', unit: '%' },
            ],
          };
        }
        return block;
      }),
    } as Protocol;
  }

  const rajiAnswer = (calculation: BoardCalculation, part: string) => {
    const result = calculation.results.get(`cells:raji:${part}`);
    return result?.status === 'ok' && 'text' in result.output ? result.output.text : result;
  };

  it('takes from the culture by its live cell conc., worked out from total and viability', () => {
    const calculation = calculate(cultureProtocol({ count: '2e6', viability: '90', volume: '5' }));
    expect(rajiAnswer(calculation, 'needed')).toBe('2.88E+5 cells');
    expect(rajiAnswer(calculation, 'stock')).toBe('160 µL');
    expect(rajiAnswer(calculation, 'diluent')).toBe('2.72 mL');
    expect(rajiAnswer(calculation, 'left-over')).toBe('8.71E+6 cells');
    expect(calculation.names.get('raji live cell conc.')).toMatchObject({
      kind: 'formula',
      expr: 'Raji total cell conc. × Raji viability',
      isIntermediate: true,
      workedOut: { key: 'cells:raji:group' },
    });
  });

  it('asks for a live count when there is none', () => {
    const calculation = calculate(cultureProtocol({ count: '2e6' }));
    expect(rajiAnswer(calculation, 'stock')).toMatchObject({
      message: 'Needs a live count: Live cell conc., or Total cell conc. and Viability',
    });
    expect(calculation.results.has('cells:raji:left-over')).toBe(false);
  });

  it('resuspends a donor from its live cell conc. and vol.', () => {
    const calculation = calculate(
      protocolWith({ 'live-cell-conc': '8e5', volume: '2', 'cells-per-vial': '' }, PLATING)
    );
    expect(answer(calculation, 'resuspend')).toBe('1.6 mL');
    expect(answer(calculation, 'left-over')).toBe('1.27E+6 cells');
  });
});
