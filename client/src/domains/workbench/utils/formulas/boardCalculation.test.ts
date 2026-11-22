import { calculateBoard, type BoardName, type CalculationResult } from './boardCalculation';

const value = (name: string, amount: string, unit = ''): BoardName => ({
  kind: 'value',
  id: `v-${name}`,
  name,
  value: amount,
  unit,
});

const calculation = (name: string, expr: string, unit = 'auto'): BoardName => ({
  kind: 'calculation',
  id: `f-${name}`,
  name,
  expr,
  unit,
});

const resultOf = (entries: BoardName[], name: string): CalculationResult => {
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
    const names = [
      value('Wells', '96'),
      value('Per well', '100', 'µL'),
      calculation('Total', 'Wells * Per well'),
    ];
    expect(answerOf(names, 'Total')).toBe('9.6 mL');
  });

  it('reads names that hold a slash or brackets as whole names', () => {
    const names = [
      value('Raji cells/well', '1e4', 'cells'),
      value('Wells used', '10'),
      value('Extra (dead vol.)', '10', '%'),
      calculation('Raji total', 'Raji cells/well × Wells used × (1 + Extra (dead vol.))'),
    ];
    expect(answerOf(names, 'Raji total')).toBe('1.10E+5 cells');
  });

  it('converts between units of the same dimension', () => {
    const names = [
      value('Stock', '2', 'mL'),
      value('Spike', '500', 'µL'),
      calculation('Sum', 'Stock + Spike', 'µL'),
    ];
    expect(answerOf(names, 'Sum')).toBe('2500 µL');
  });

  it('turns a concentration over a concentration into a plain number', () => {
    const names = [
      value('Stock', '10', 'mM'),
      value('Target', '10', 'µM'),
      calculation('Fold', 'Stock / Target'),
    ];
    expect(answerOf(names, 'Fold')).toBe('1000');
  });

  it('formats a ratio as a 1:N dilution', () => {
    const names = [
      value('Antibody', '2', 'µL'),
      value('Buffer', '200', 'µL'),
      calculation('Dilution', 'Antibody / Buffer', '1:N'),
    ];
    expect(answerOf(names, 'Dilution')).toBe('1:100');
  });

  it('reads a 1:N value as its fraction', () => {
    const names = [
      value('Ab dilution', '200', '1:N'),
      value('Volume', '50', 'µL'),
      calculation('Ab', 'Volume * Ab dilution'),
    ];
    expect(answerOf(names, 'Ab')).toBe('0.25 µL');
  });

  it('reads literal units typed into a formula, including uL for µL', () => {
    const names = [calculation('Mix', '2 mL + 500 uL', 'µL')];
    expect(answerOf(names, 'Mix')).toBe('2500 µL');
  });

  it('converts mass through molar mass', () => {
    const names = [
      value('Drug', '10', 'mg'),
      value('Weight', '500', 'g/mol'),
      calculation('Moles', 'Drug / Weight'),
    ];
    expect(calculateBoard(names).results.get('f-Moles')).toMatchObject({
      status: 'ok',
      quantity: { magnitude: 2e-5, dimension: { amount: 1 } },
    });
  });

  it('matches names regardless of case and prefers the longest name', () => {
    const names = [
      value('Cells', '2'),
      value('Cells per well', '5000'),
      calculation('Total', 'cells per WELL * Cells'),
    ];
    expect(answerOf(names, 'Total')).toBe('1.00E+4');
  });

  it('rounds up to a step of the same kind', () => {
    const names = [value('Need', '7.2', 'mL'), calculation('Make', 'round up(Need, 5 mL)')];
    expect(answerOf(names, 'Make')).toBe('10 mL');
  });

  it('leaves an exact multiple of the step where it is', () => {
    const names = [value('Need', '36', 'µL'), calculation('Make', 'round up(Need, 1.2 µL)')];
    expect(answerOf(names, 'Make')).toBe('36 µL');
  });

  it('keeps at least a minimum', () => {
    const names = [value('Need', '40', 'µL'), calculation('Make', 'at least(Need, 100 µL)')];
    expect(answerOf(names, 'Make')).toBe('100 µL');
  });

  it('refuses to round a volume without a step', () => {
    const names = [value('Need', '7.2', 'mL'), calculation('Make', 'round up(Need)')];
    expect(errorOf(names, 'Make')).toBe(
      'To round up a volume, give what to round to: round up(…, 5 mL)'
    );
  });

  it('refuses to add different dimensions', () => {
    const names = [
      value('Volume', '1', 'mL'),
      value('Mass', '1', 'mg'),
      calculation('Bad', 'Volume + Mass'),
    ];
    expect(errorOf(names, 'Bad')).toBe("Can't add a mass to a volume");
  });

  it('names a word that is not on the board', () => {
    const result = resultOf([calculation('Bad', 'Missing * 2')], 'Bad');
    expect(result).toMatchObject({ status: 'error', missingName: 'Missing' });
  });

  it('reports a value with no number yet', () => {
    const names = [value('Empty', ''), calculation('Uses', 'Empty * 2')];
    expect(errorOf(names, 'Uses')).toBe('Empty has no number yet');
  });

  it('explains that a material is not a number', () => {
    const names: BoardName[] = [
      {
        kind: 'item',
        id: 'm1',
        name: 'PBS',
        groupTitle: 'Media, Buffers, & Solutions',
        hint: 'PBS volume made',
        label: 'Gibco 10010',
      },
      calculation('Uses', 'PBS * 2'),
    ];
    expect(errorOf(names, 'Uses')).toBe(
      'PBS is in Media, Buffers, & Solutions, not a number. Use one of its numbers, like PBS volume made.'
    );
  });

  it('detects a cycle and names its path', () => {
    const names = [calculation('A', 'B + 1'), calculation('B', 'A + 1')];
    expect(errorOf(names, 'A')).toBe('Goes in a circle: A → B → A');
    expect(resultOf(names, 'B')).toMatchObject({ status: 'error', isCycle: true });
  });

  it('says a calculation depending on a broken one cannot be worked out', () => {
    const names = [calculation('Broken', 'Nope'), calculation('Uses', 'Broken * 2')];
    expect(errorOf(names, 'Uses')).toBe("Needs Broken, which can't be worked out yet");
  });

  it('marks the second of two equal names as taken', () => {
    const names = [value('Volume', '1', 'mL'), calculation('volume', '2 mL')];
    const board = calculateBoard(names);
    expect(board.takenNameIds.has('f-volume')).toBe(true);
    expect(errorOf(names, 'volume')).toBe('volume is already used');
  });

  it('treats an empty formula as empty, not an error', () => {
    expect(resultOf([calculation('Blank', '  ')], 'Blank')).toMatchObject({ status: 'empty' });
  });

  it('explains a result that does not fit the chosen unit', () => {
    const names = [value('Volume', '2', 'mL'), calculation('Wrong', 'Volume', 'mg')];
    const result = resultOf(names, 'Wrong');
    expect(result).toMatchObject({
      status: 'ok',
      output: { error: 'Works out to a volume (2 mL), not mg' },
    });
  });

  it('accepts thousands separators and suffixes in values', () => {
    const names = [
      value('Cells', '1,000,000'),
      value('More', '2M'),
      calculation('Sum', 'Cells + More'),
    ];
    expect(answerOf(names, 'Sum')).toBe('3.00E+6');
  });
});
