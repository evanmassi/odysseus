import { calculateBoard, type BoardCalculation } from '../formulas/boardCalculation';
import { collectBoardNames } from '../formulas/boardNames';

import { mixFinalId, recipeFinalId, recipeWarnings } from './materialRecipeFormulas';

import type { MaterialItem, Protocol } from '@odysseus/shared-schemas';

const material = (id: string, name: string, extra: Partial<MaterialItem> = {}) =>
  ({
    id,
    group: 'chem',
    type: 'Drug or inhibitor',
    name,
    shownFields: [],
    values: {},
    units: {},
    customFields: [],
    fieldLabels: {},
    isDropped: false,
    recipe: [],
    ...extra,
  }) as MaterialItem;

const cocktail = material('mix', 'Th17 cocktail', {
  shownFields: ['stock-concentration'],
  values: { 'stock-concentration': '8000' },
  units: { 'stock-concentration': 'X' },
  recipe: [{ id: 'r1', materialId: 'il6', amount: '40', unit: 'µg/mL' }],
});

function protocolWith(mixValues: Array<[name: string, value: string, unit: string]>): Protocol {
  return {
    pages: [{ id: 'page', name: 'Setup', steps: [] }],
    blocks: [
      {
        id: 'materials',
        type: 'materials',
        page: 'page',
        items: [cocktail, material('il6', 'IL-6')],
      },
      {
        id: 'values',
        type: 'values',
        page: 'page',
        sections: [{ id: 'th17', materialId: 'mix' }],
        items: [
          { id: 'well', name: 'Well volume', value: '80', unit: 'µL' },
          { id: 'per-well', name: 'Volume per well', value: '20', unit: 'µL', section: 'th17' },
          ...mixValues.map(([name, value, unit]) => ({
            id: name,
            name,
            value,
            unit,
            section: 'th17',
          })),
        ],
      },
    ],
  } as unknown as Protocol;
}

const answer = (calculation: BoardCalculation, id: string) => {
  const result = calculation.results.get(id);
  return result?.status === 'ok' && 'text' in result.output ? result.output.text : result;
};

const calculate = (protocol: Protocol) => calculateBoard(collectBoardNames(protocol));

describe('recipe finals in the well', () => {
  it('goes from the stock through the working dilution to the well', () => {
    const calculation = calculate(protocolWith([['Working dilution', '2000', '1:N']]));
    expect(calculation.names.get('th17 cocktail working')).toMatchObject({
      expr: 'Th17 cocktail stock concentration × Th17 cocktail working dilution',
    });
    expect(answer(calculation, 'mix:recipe:working')).toBe('4×');
    expect(answer(calculation, mixFinalId('mix'))).toBe('1×');
    expect(answer(calculation, recipeFinalId('mix', 'r1'))).toBe('5 ng/mL');
  });

  it('scales by a typed working concentration when there is no dilution', () => {
    const calculation = calculate(protocolWith([['Working concentration', '4', 'X']]));
    expect(answer(calculation, mixFinalId('mix'))).toBe('1×');
    expect(answer(calculation, recipeFinalId('mix', 'r1'))).toBe('5 ng/mL');
  });

  it('warns when the working dilution and working concentration disagree', () => {
    const protocol = protocolWith([
      ['Working dilution', '1000', '1:N'],
      ['Working concentration', '4', 'X'],
    ]);
    expect([...recipeWarnings(protocol, calculate(protocol)).values()]).toEqual([
      ['Working concentration says 4×, but the working dilution makes 8×.'],
    ]);
  });
});
