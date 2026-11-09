import { calculateBoard, type BoardName, type FormulaResult } from './boardCalculation';

const value = (name: string, amount: string, unit = ''): BoardName => ({
  kind: 'value',
  id: `v-${name}`,
  name,
  value: amount,
  unit,
});

const formula = (name: string, expr: string, unit = 'auto'): BoardName => ({
  kind: 'formula',
  id: `f-${name}`,
  name,
  expr,
  unit,
});

const resultOf = (entries: BoardName[], name: string): FormulaResult => {
  const result = calculateBoard(entries).results.get(`f-${name}`);
  if (!result) throw new Error(`no result for ${name}`);
  return result;
};

const answerOf = (entries: BoardName[], name: string): string => {
  const result = resultOf(entries, name);
  if (result.status !== 'ok') throw new Error(`${name}: ${result.message}`);
  return 'text' in result.output ? result.output.text : result.output.error;
};

const errorOf = (entries: BoardName[], name: string): string => {
  const result = resultOf(entries, name);
  if (result.status === 'ok') throw new Error(`${name} unexpectedly worked`);
  return result.message;
};

describe('calculateBoard', () => {
  it('multiplies a volume per well by a count and picks a readable unit', () => {
    const board = [
      value('Wells', '96'),
      value('Per well', '100', 'µL'),
      formula('Total', 'Wells * Per well'),
    ];
    expect(answerOf(board, 'Total')).toBe('9.6 mL');
  });

  it('converts between units of the same dimension', () => {
    const board = [
      value('Stock', '2', 'mL'),
      value('Spike', '500', 'µL'),
      formula('Sum', 'Stock + Spike', 'µL'),
    ];
    expect(answerOf(board, 'Sum')).toBe('2500 µL');
  });

  it('turns a concentration over a concentration into a plain number', () => {
    const board = [
      value('Stock', '10', 'mM'),
      value('Target', '10', 'µM'),
      formula('Fold', 'Stock / Target'),
    ];
    expect(answerOf(board, 'Fold')).toBe('1000');
  });

  it('formats a ratio as a 1:N dilution', () => {
    const board = [
      value('Antibody', '2', 'µL'),
      value('Buffer', '200', 'µL'),
      formula('Dilution', 'Antibody / Buffer', '1:N'),
    ];
    expect(answerOf(board, 'Dilution')).toBe('1:100');
  });

  it('reads a 1:N value as its fraction', () => {
    const board = [
      value('Ab dilution', '200', '1:N'),
      value('Volume', '50', 'µL'),
      formula('Ab', 'Volume * Ab dilution'),
    ];
    expect(answerOf(board, 'Ab')).toBe('250 nL');
  });

  it('reads literal units typed into a formula, including uL for µL', () => {
    const board = [formula('Mix', '2 mL + 500 uL', 'µL')];
    expect(answerOf(board, 'Mix')).toBe('2500 µL');
  });

  it('converts mass through molar mass', () => {
    const board = [
      value('Drug', '10', 'mg'),
      value('Weight', '500', 'g/mol'),
      formula('Moles', 'Drug / Weight'),
    ];
    expect(calculateBoard(board).results.get('f-Moles')).toMatchObject({
      status: 'ok',
      quantity: { magnitude: 2e-5, dimension: { amount: 1 } },
    });
  });

  it('matches names regardless of case and prefers the longest name', () => {
    const board = [
      value('Cells', '2'),
      value('Cells per well', '5000'),
      formula('Total', 'cells per WELL * Cells'),
    ];
    expect(answerOf(board, 'Total')).toBe('1.00E+4');
  });

  it('rounds up to a step of the same kind', () => {
    const board = [value('Need', '7.2', 'mL'), formula('Make', 'round up(Need, 5 mL)')];
    expect(answerOf(board, 'Make')).toBe('10 mL');
  });

  it('leaves an exact multiple of the step where it is', () => {
    const board = [value('Need', '36', 'µL'), formula('Make', 'round up(Need, 1.2 µL)')];
    expect(answerOf(board, 'Make')).toBe('36 µL');
  });

  it('keeps at least a minimum', () => {
    const board = [value('Need', '40', 'µL'), formula('Make', 'at least(Need, 100 µL)')];
    expect(answerOf(board, 'Make')).toBe('100 µL');
  });

  it('refuses to round a volume without a step', () => {
    const board = [value('Need', '7.2', 'mL'), formula('Make', 'round up(Need)')];
    expect(errorOf(board, 'Make')).toBe('To round up a volume, give a step: round up(…, 5 mL)');
  });

  it('refuses to add different dimensions', () => {
    const board = [
      value('Volume', '1', 'mL'),
      value('Mass', '1', 'mg'),
      formula('Bad', 'Volume + Mass'),
    ];
    expect(errorOf(board, 'Bad')).toBe("Can't add a mass to a volume");
  });

  it('names a word that is not on the board', () => {
    const result = resultOf([formula('Bad', 'Missing * 2')], 'Bad');
    expect(result).toMatchObject({ status: 'error', missingName: 'Missing' });
  });

  it('reports a value with no number yet', () => {
    const board = [value('Empty', ''), formula('Uses', 'Empty * 2')];
    expect(errorOf(board, 'Uses')).toBe('Empty has no number yet');
  });

  it('explains that a material is not a number', () => {
    const board: BoardName[] = [
      {
        kind: 'item',
        id: 'm1',
        name: 'PBS',
        groupTitle: 'Media, Buffers, & Solutions',
        hint: 'PBS volume made',
        label: 'Gibco 10010',
      },
      formula('Uses', 'PBS * 2'),
    ];
    expect(errorOf(board, 'Uses')).toBe(
      'PBS is in Media, Buffers, & Solutions, not a number. Use one of its numbers, like PBS volume made.'
    );
  });

  it('detects a cycle and names its path', () => {
    const board = [formula('A', 'B + 1'), formula('B', 'A + 1')];
    expect(errorOf(board, 'A')).toBe('Goes in a circle: A → B → A');
    expect(resultOf(board, 'B')).toMatchObject({ status: 'error', isCycle: true });
  });

  it('says a formula depending on a broken one cannot be worked out', () => {
    const board = [formula('Broken', 'Nope'), formula('Uses', 'Broken * 2')];
    expect(errorOf(board, 'Uses')).toBe("Needs Broken, which can't be worked out yet");
  });

  it('marks the second of two equal names as a duplicate', () => {
    const board = [value('Volume', '1', 'mL'), formula('volume', '2 mL')];
    const calculation = calculateBoard(board);
    expect(calculation.duplicateIds.has('f-volume')).toBe(true);
    expect(errorOf(board, 'volume')).toBe('Another value or formula already has this name');
  });

  it('treats an empty formula as empty, not an error', () => {
    expect(resultOf([formula('Blank', '  ')], 'Blank')).toMatchObject({ status: 'empty' });
  });

  it('explains a result that does not fit the chosen unit', () => {
    const board = [value('Volume', '2', 'mL'), formula('Wrong', 'Volume', 'mg')];
    const result = resultOf(board, 'Wrong');
    expect(result).toMatchObject({
      status: 'ok',
      output: { error: 'Works out to a volume (2 mL), not mg' },
    });
  });

  it('accepts thousands separators and suffixes in values', () => {
    const board = [
      value('Cells', '1,000,000'),
      value('More', '2M'),
      formula('Sum', 'Cells + More'),
    ];
    expect(answerOf(board, 'Sum')).toBe('3.00E+6');
  });
});
