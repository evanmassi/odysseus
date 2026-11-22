import { calculateBoard, type BoardName } from './boardCalculation';
import { checkCalculationDraft, readCalculationDraft } from './calculationDraft';

import type { MaterialItem } from '@odysseus/shared-schemas';

const raji = { id: 'raji', name: 'Raji', group: 'bio', type: 'Cell line' } as MaterialItem;

const value = (name: string, amount: string, unit = ''): BoardName => ({
  kind: 'value',
  id: name,
  name,
  value: amount,
  unit,
});

const board = calculateBoard([
  value('Raji per well', '10000', 'cells'),
  value('Wells used', '96'),
  { kind: 'calculation', id: 'total', name: 'Total volume', expr: 'Wells used × 50 µL', unit: '' },
]);

const draft = (text: string) => readCalculationDraft(text, board, [raji]);

describe('a typed calculation', () => {
  it('files a name that starts with a material under it and reads its short names within it', () => {
    expect(draft('Raji cells needed = per well × Wells used')).toMatchObject({
      name: 'Raji cells needed',
      savedName: 'Raji cells needed',
      expr: 'Raji per well × Wells used',
      material: raji,
    });
    expect(draft('Plate count')?.material).toBeUndefined();
    expect(draft('  =  ')).toBeUndefined();
  });

  it('numbers a name that is already used', () => {
    expect(draft('Total volume = Wells used × 80 µL')).toMatchObject({
      name: 'Total volume',
      savedName: 'Total volume 2',
    });
  });

  it('works out the answer before it is added', () => {
    const typed = draft('Raji cells needed = per well × Wells used');
    const check = typed && checkCalculationDraft(typed, board);
    expect(check?.problem).toBeUndefined();
    expect(check?.answer).toBe('9.60E+5 cells');
  });

  it('suggests the closest name when one is misspelled', () => {
    const typed = draft('Cells = Raji per wel × Wells used');
    expect(typed && checkCalculationDraft(typed, board).problem).toMatch(
      /Did you mean Raji per well\?$/
    );
  });

  it('has nothing to check until a formula is typed', () => {
    const typed = draft('Raji cells needed');
    expect(typed && checkCalculationDraft(typed, board)).toEqual({
      answer: undefined,
      problem: undefined,
    });
  });
});
