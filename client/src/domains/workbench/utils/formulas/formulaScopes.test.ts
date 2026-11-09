import { calculateBoard, type BoardName } from './boardCalculation';
import {
  calculationSuggestions,
  formulaCompletions,
  formulaMaterial,
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

  it('round-trips an expression between short and full names', () => {
    const short = namesWithin('Raji per well × Wells used', board, raji);
    expect(short).toBe('Per well × Wells used');
    expect(namesInFull(short, board, raji)).toBe('Raji per well × Wells used');
  });

  it('suggests the usual cell calculations once their inputs exist', () => {
    expect(calculationSuggestions(board, raji)).toEqual([
      { label: 'Needed', name: 'Raji needed', expr: 'Raji per well × Wells used × (1 + Overage)' },
    ]);
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
