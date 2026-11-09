import { readNumber } from '../formulas/quantities';

interface ParsedValueLine {
  name: string;
  value: string;
  unit: string;
}

const VALUE_UNIT_WORDS: ReadonlyArray<[RegExp, string]> = [
  [/^(?:%|percent)$/i, '%'],
  [/^(?:x|×|fold)$/i, 'X'],
  [/^nl$/i, 'nL'],
  [/^[uµμ]l$/i, 'µL'],
  [/^ml$/i, 'mL'],
  [/^l$/i, 'L'],
  [/^pg$/i, 'pg'],
  [/^ng$/i, 'ng'],
  [/^[uµμ]g$/i, 'µg'],
  [/^mg$/i, 'mg'],
  [/^cells?$/i, 'cells'],
  [/^cells?\/ml$/i, 'cells/mL'],
  [/^pg\/ml$/i, 'pg/mL'],
  [/^ng\/ml$/i, 'ng/mL'],
  [/^[uµμ]g\/ml$/i, 'µg/mL'],
  [/^mg\/ml$/i, 'mg/mL'],
  [/^ng\/[uµμ]l$/i, 'ng/µL'],
  [/^nM$/, 'nM'],
  [/^[uµμ]M$/, 'µM'],
  [/^mM$/, 'mM'],
  [/^(?:min|mins|minutes?)$/i, 'min'],
  [/^(?:h|hr|hrs|hours?)$/i, 'h'],
  [/^(?:s|sec|secs|seconds?)$/i, 's'],
  [/^°?C$/, '°C'],
  [/^(?:[x×]g|rcf)$/i, '× g'],
  [/^rpm$/i, 'rpm'],
];

const RATIO_LINE = /^(.*?)[\s:=]+(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/;
const NUMBER_WITH_UNIT = /^([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?[kKM]?)(\D.*)$/;

export const valueUnitOf = (word: string): string | undefined =>
  VALUE_UNIT_WORDS.find(([pattern]) => pattern.test(word))?.[1];

const cleanName = (name: string) => name.replace(/[\s:=]+$/, '').trim();

export function parseValueLine(line: string): ParsedValueLine | undefined {
  const text = line.trim();
  if (!text) return undefined;
  const ratio = RATIO_LINE.exec(text);
  if (ratio && cleanName(ratio[1])) {
    return ratio[2] === '1'
      ? { name: cleanName(ratio[1]), value: ratio[3], unit: '1:N' }
      : { name: cleanName(ratio[1]), value: `${ratio[2]}:${ratio[3]}`, unit: 'N:N' };
  }
  const words = text.split(/\s+/);
  let unit = '';
  let value = '';
  const attached = NUMBER_WITH_UNIT.exec(words[words.length - 1]);
  const attachedUnit = attached && valueUnitOf(attached[2]);
  if (words.length > 1 && attached && attachedUnit) {
    words.pop();
    value = attached[1];
    unit = attachedUnit;
  } else {
    const trailingUnit = words.length > 1 ? valueUnitOf(words[words.length - 1]) : undefined;
    if (trailingUnit) {
      words.pop();
      unit = trailingUnit;
    }
    if (words.length > 1 && readNumber(words[words.length - 1]) !== undefined)
      value = words.pop() ?? '';
  }
  const name = cleanName(words.join(' '));
  return name ? { name, value, unit: value || unit ? unit : '' } : undefined;
}
