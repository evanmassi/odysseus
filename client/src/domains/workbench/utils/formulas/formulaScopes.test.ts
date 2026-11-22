import { calculateBoard, type BoardName } from './boardCalculation';
import {
  calculationSuggestions,
  formulaCompletions,
  formulaMaterial,
  formulaTextParts,
  formulaWordAt,
  namesInFull,
  namesWithin,
  nameWithin,
  uniqueName,
} from './formulaScopes';

import type { MaterialItem } from '@odysseus/shared-schemas';

const material = (name: string): MaterialItem => ({
  id: name,
  group: 'bio',
  type: 'Cell line',
  name,
  shownFields: [],
  values: {},
  units: {},
  customFields: [],
  fieldLabels: {},
  isDropped: false,
  recipe: [],
});

const value = (name: string, amount = '1', unit = ''): BoardName => ({
  kind: 'value',
  id: name,
  name,
  value: amount,
  unit,
});

const raji = material('Raji');
const board = calculateBoard([
  value('Raji per well', '10000', 'cells'),
  value('Raji count', '1e6', 'cells/mL'),
  value('Raji viability', '0.9'),
  value('Wells used', '96'),
  value('Overage', '10', '%'),
]);

describe('formula scopes', () => {
  it('finds the material a formula belongs to by its longest name prefix', () => {
    const rajiLuc = material('Raji Luc');
    expect(formulaMaterial('Raji Luc needed', [raji, rajiLuc])).toBe(rajiLuc);
    expect(formulaMaterial('Total volume', [raji])).toBeUndefined();
  });

  it('shortens a name inside its material and capitalizes the rest', () => {
    expect(nameWithin('Raji needed', raji)).toBe('Needed');
    expect(nameWithin('Wells used', raji)).toBe('Wells used');
  });

  it('leaves a leading Greek letter or a lowercase-first term like pH as it was written', () => {
    expect(nameWithin('Raji γδ fraction', raji)).toBe('γδ fraction');
    expect(nameWithin('Raji β-ME per well', raji)).toBe('β-ME per well');
    expect(nameWithin('Raji pH', raji)).toBe('pH');
    expect(nameWithin('Raji mRNA yield', raji)).toBe('mRNA yield');
  });

  it('round-trips an expression between short and full names', () => {
    const short = namesWithin('Raji per well × Wells used', board, raji);
    expect(short).toBe('Per well × Wells used');
    expect(namesInFull(short, board, raji)).toBe('Raji per well × Wells used');
  });

  it('suggests the usual cell calculations once their inputs exist', () => {
    expect(calculationSuggestions(board, raji)).toEqual([
      {
        label: 'Total needed',
        name: 'Raji total needed',
        expr: 'Raji per well × Wells used × (1 + Overage)',
      },
    ]);
  });

  it('finds the per-well cells and the extra under any accepted spelling', () => {
    const spelled = calculateBoard([
      value('Raji cells/well', '10000', 'cells'),
      value('Wells used', '96'),
      value('Extra (dead vol.)', '10', '%'),
      value('Raji extra (dead vol.)', '20', '%'),
    ]);
    expect(calculationSuggestions(spelled, raji)).toEqual([
      {
        label: 'Total needed',
        name: 'Raji total needed',
        expr: 'Raji cells/well × Wells used × (1 + Raji extra (dead vol.))',
      },
    ]);
  });

  it('does not treat a per-well mass as cells', () => {
    const medium = material('Medium');
    const masses = calculateBoard([
      value('Medium per well', '2', 'µg'),
      value('Medium count', '1e6', 'cells/mL'),
      value('Medium needed', '200', 'µg'),
      value('Wells used', '96'),
    ]);
    expect(calculationSuggestions(masses, medium)).toEqual([]);
  });

  it('numbers a name that is already taken', () => {
    expect(uniqueName(board, 'Overage')).toBe('Overage 2');
    expect(uniqueName(board, 'Mix')).toBe('Mix');
  });

  it('finds the word being typed after the last operator', () => {
    expect(formulaWordAt('Wells used × Raji pe', 20)).toEqual({
      start: 13,
      end: 20,
      text: 'Raji pe',
    });
  });

  it('completes by word starts, local names first, functions included', () => {
    const options = formulaCompletions(board, raji, 'pe', 'Raji needed');
    expect(options[0]).toMatchObject({ label: 'Per well', isLocal: true });
    expect(formulaCompletions(board, undefined, 'round u', '').map(option => option.label)).toEqual(
      ['round up']
    );
  });
});

describe('formula text parts', () => {
  it('marks names, short or full, and leaves the rest as typed', () => {
    const board = calculateBoard([
      value('Th17 cocktail volume made', '8', 'mL'),
      value('Th17 cocktail stock concentration', '8000', '×'),
    ]);
    expect(
      formulaTextParts('volume made ÷ Stock concentration × 4', board, material('Th17 cocktail'))
    ).toEqual([
      { text: 'volume made', isName: true },
      { text: ' ÷ ', isName: false },
      { text: 'Stock concentration', isName: true },
      { text: ' × 4', isName: false },
    ]);
  });
});
