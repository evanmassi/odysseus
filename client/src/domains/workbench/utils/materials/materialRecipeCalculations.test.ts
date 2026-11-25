import { calculateBoard, type SolvedBoard } from '../formulas/boardCalculation';
import { collectBoardNames } from '../formulas/boardNames';

import { mixFinalId, recipeFinalId, recipeWarnings } from './materialRecipeCalculations';

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
    isSetAside: false,
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
    materials: { items: [cocktail, material('il6', 'IL-6')], customGroups: [] },
    values: {
      rows: [{ id: 'th17', materialId: 'mix' }],
      items: [
        { id: 'well', name: 'Well volume', value: '80', unit: 'µL' },
        { id: 'per-well', name: 'Volume per well', value: '20', unit: 'µL', row: 'th17' },
        ...mixValues.map(([name, value, unit]) => ({
          id: name,
          name,
          value,
          unit,
          row: 'th17',
        })),
      ],
    },
    calculations: { items: [], materialSections: [] },
    cards: [
      { id: 'materials', type: 'materials', page: 'page' },
      { id: 'values', type: 'values', page: 'page' },
    ],
  } as unknown as Protocol;
}

const answer = (board: SolvedBoard, id: string) => {
  const result = board.results.get(id);
  return result?.status === 'ok' && 'text' in result.output ? result.output.text : result;
};

const calculate = (protocol: Protocol) => calculateBoard(collectBoardNames(protocol));

describe('recipe finals in the well', () => {
  it('goes from the stock through the working dilution to the well', () => {
    const board = calculate(protocolWith([['Working dilution', '2000', '1:N']]));
    expect(board.names.get('th17 cocktail working strength')).toMatchObject({
      formula: 'Th17 cocktail stock conc. × Th17 cocktail working dilution',
    });
    expect(answer(board, 'mix:recipe:working')).toBe('4×');
    expect(answer(board, mixFinalId('mix'))).toBe('1×');
    expect(answer(board, recipeFinalId('mix', 'r1'))).toBe('5 ng/mL');
  });

  it('works out a final for each container a mix goes into, from its own volumes', () => {
    const protocol = protocolWith([
      ['Working dilution', '2000', '1:N'],
      ['Vol./tube', '250', 'µL'],
    ]);
    protocol.values.items.push({ id: 'tube', name: 'Total tube vol.', value: '500', unit: 'µL' });
    const mix = { valueId: 'th17' };
    protocol.cards.push({
      id: 'plate',
      type: 'plateMap',
      page: 'page',
      plates: [{ id: 'p', labware: '96', name: '' }],
      otherLabware: [{ id: 't', labware: 'facs', count: 1 }],
      lines: [{ id: 'l', name: '', role: 'auto', values: [{ id: 'th17', text: 'Th17 cocktail' }] }],
      samples: { 'p:A1': { l: mix }, 'p:A2': { l: mix }, 't#1:1': { l: mix } },
      series: {},
      counts: {},
      amountNames: {},
      side: 'assay',
      stain: {},
      stainedIn: {},
    } as unknown as Protocol['cards'][number]);
    const board = calculate(protocol);
    expect(answer(board, `${recipeFinalId('mix', 'r1')}:well`)).toBe('5 ng/mL');
    expect(answer(board, `${recipeFinalId('mix', 'r1')}:tube`)).toBe('10 ng/mL');
    expect(answer(board, `${mixFinalId('mix')}:tube`)).toBe('2×');
    expect(board.names.has('th17 cocktail il-6 final conc. in the tubes')).toBe(true);
  });

  it('reads the well total and the mix’s per-well volume under their other spellings', () => {
    const protocol = protocolWith([['Working dilution', '2000', '1:N']]);
    const { values } = protocol;
    values.items = values.items.map(item =>
      'name' in item && item.name === 'Well volume'
        ? { ...item, name: 'Total well vol.' }
        : 'name' in item && item.name === 'Volume per well'
          ? { ...item, name: 'Vol./well' }
          : item
    );
    expect(answer(calculate(protocol), recipeFinalId('mix', 'r1'))).toBe('5 ng/mL');
  });

  it('scales by a typed working concentration when there is no dilution', () => {
    const board = calculate(protocolWith([['Working concentration', '4', 'X']]));
    expect(answer(board, mixFinalId('mix'))).toBe('1×');
    expect(answer(board, recipeFinalId('mix', 'r1'))).toBe('5 ng/mL');
  });

  it('warns when the working dilution and working concentration disagree', () => {
    const protocol = protocolWith([
      ['Working dilution', '1000', '1:N'],
      ['Working concentration', '4', 'X'],
    ]);
    expect([...recipeWarnings(protocol, calculate(protocol)).values()]).toEqual([
      ['Working conc. says 4×, but the working dil. makes 8×.'],
    ]);
  });
});
