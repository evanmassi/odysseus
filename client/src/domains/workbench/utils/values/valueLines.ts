import { readNumber } from '../formulas/quantities';
import { amountUnit } from '../units/textAmounts';

export interface ParsedValueLine {
  name: string;
  value: string;
  unit: string;
}

const RATIO_LINE = /^(.*?)[\s:=]+(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/;
const NUMBER_WITH_UNIT = /^([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?[kKM]?)(\D.*)$/;

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
  const attachedUnit = attached && amountUnit(attached[2], readNumber(attached[1]));
  if (words.length > 1 && attached && attachedUnit) {
    words.pop();
    value = attached[1];
    unit = attachedUnit;
  } else {
    const before = words.length > 2 ? readNumber(words[words.length - 2]) : undefined;
    const trailingUnit = words.length > 1 ? amountUnit(words[words.length - 1], before) : undefined;
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
