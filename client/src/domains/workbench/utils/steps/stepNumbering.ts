import type { ProtocolPage, ProtocolStep } from '@odysseus/shared-schemas';

const ROMAN_NUMERALS: ReadonlyArray<[number, string]> = [
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

function romanNumeral(value: number): string {
  let remaining = value;
  let numeral = '';
  for (const [size, symbol] of ROMAN_NUMERALS) {
    while (remaining >= size) {
      numeral += symbol;
      remaining -= size;
    }
  }
  return numeral;
}

export function stepNumbers(steps: readonly ProtocolStep[]): Map<string, string> {
  let sections = 0;
  let mainSteps = 0;
  let subSteps = 0;
  return new Map(
    steps.map(step => {
      if (step.kind === 'section') {
        subSteps = 0;
        return [step.id, `${romanNumeral(++sections)}.`];
      }
      if (step.level === 2) return [step.id, `${String.fromCharCode(97 + subSteps++)}.`];
      subSteps = 0;
      return [step.id, `${++mainSteps}.`];
    })
  );
}

export function stepLabels(pages: readonly ProtocolPage[]): Map<string, string> {
  const labels = new Map<string, string>();
  for (const page of pages) {
    const numbers = stepNumbers(page.steps);
    let parent = '';
    for (const step of page.steps) {
      if (step.kind !== 'step') continue;
      const own = (numbers.get(step.id) ?? '').replace('.', '');
      if (step.level !== 2) parent = own;
      labels.set(step.id, step.level === 2 ? `${parent}${own}` : own);
    }
  }
  return labels;
}
