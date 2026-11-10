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
  let subSubSteps = 0;
  return new Map(
    steps.map(step => {
      if (step.kind === 'section') {
        subSteps = 0;
        subSubSteps = 0;
        return [step.id, `${romanNumeral(++sections)}.`];
      }
      if (step.level === 3) return [step.id, `${romanNumeral(++subSubSteps).toLowerCase()}.`];
      subSubSteps = 0;
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
    const parents: string[] = [];
    for (const step of page.steps) {
      if (step.kind !== 'step') continue;
      const own = (numbers.get(step.id) ?? '').replace('.', '');
      parents.length = step.level - 1;
      const label = step.level === 3 ? `${parents.join('')}.${own}` : `${parents.join('')}${own}`;
      parents.push(own);
      labels.set(step.id, label);
    }
  }
  return labels;
}
