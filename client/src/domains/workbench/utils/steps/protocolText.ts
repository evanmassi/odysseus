import type { ProtocolStep } from '@odysseus/shared-schemas';

type WithoutId<Step> = Step extends unknown ? Omit<Step, 'id'> : never;

export type ParsedProtocolStep = WithoutId<ProtocolStep>;

const ROMAN_HEAD = /^([IVX]+)[.)]\s+(.+)$/;
const WORD_HEAD = /^(day|part|section|stage|phase)\s+\d+\b.*$/i;
const NUMBERED = /^(?:step\s*)?\d{1,3}(?:[.)]\s+|\s*:\s*)(.+)$/i;
const LETTERED = /^\(?[a-h][.)]\s+(.+)$/;
const SMALL_ROMAN = /^\(?(?:i{1,3}|iv|vi{0,3}|ix|x)[.)]\s+(.+)$/;
const BULLET = /^[•·▪●◦*\-–—]\s+(.+)$/;
const NOTE = /^(note|caution|important|tip)\s*[:\-–]\s*(.+)$/i;
const MAX_HEADING_LENGTH = 60;

export const PASTE_EXAMPLE = `PREPARE THE PLATE
1. Dilute the capture antibody to its working concentration in coating
buffer and add 100 µL per well. Seal and incubate overnight at 4 °C.
2. Wash the plate three times.
   a. Fill each well with 300 µL of wash buffer and aspirate.
   b. After the last wash, invert the plate and blot it on paper towels.
3. Add 200 µL of blocking buffer per well and incubate for at least
1 hour at room temperature.
Note: blocked plates can be stored sealed at 4 °C for up to two weeks.

RUN THE ASSAY
4. Add 100 µL of standards or samples per well. Incubate 2 hours at
room temperature.
5. Wash as in step 2.`;

const step = (level: 1 | 2, text: string): ParsedProtocolStep => ({
  kind: 'step',
  level,
  text,
  isMeanwhile: false,
});

const capitalized = (word: string) => `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`;

export function parseProtocolText(raw: string): ParsedProtocolStep[] {
  const lines = raw
    .replace(/\r/g, '')
    .replace(/(\w)-\n(\w)/g, '$1$2')
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim());
  const isNumbered = lines.some(line => NUMBERED.test(line));
  const parsed: ParsedProtocolStep[] = [];
  let isAfterGap = false;
  let bulletLevel: 0 | 1 | 2 = 0;

  for (const line of lines) {
    if (!line) {
      isAfterGap = true;
      continue;
    }
    const current = parsed[parsed.length - 1];
    const openStep = current?.kind === 'step' ? current : undefined;
    const isHeadingShaped = line.length <= MAX_HEADING_LENGTH && !/[.!?]$/.test(line);
    const isShouting = /[A-Z]{3}/.test(line) && line === line.toUpperCase();
    let match: RegExpExecArray | null;
    if ((match = ROMAN_HEAD.exec(line)) && !SMALL_ROMAN.test(line)) {
      parsed.push({ kind: 'section', text: match[2] });
    } else if (WORD_HEAD.test(line) && isHeadingShaped) {
      parsed.push({ kind: 'section', text: line.replace(/:$/, '') });
    } else if (isHeadingShaped && (/:$/.test(line) || isShouting) && !NUMBERED.test(line)) {
      parsed.push({ kind: 'section', text: line.replace(/:$/, '') });
    } else if ((match = NUMBERED.exec(line))) {
      parsed.push(step(1, match[1]));
    } else if ((match = SMALL_ROMAN.exec(line)) && openStep) {
      parsed.push(step(2, match[1]));
    } else if ((match = LETTERED.exec(line))) {
      parsed.push(step(2, match[1]));
    } else if ((match = BULLET.exec(line))) {
      bulletLevel = bulletLevel || (openStep ? 2 : 1);
      parsed.push(step(bulletLevel, match[1]));
      isAfterGap = false;
      continue;
    } else if ((match = NOTE.exec(line)) && openStep) {
      openStep.text += ` ${capitalized(match[1])}: ${match[2]}`;
    } else if (openStep && (isNumbered || (!isAfterGap && !bulletLevel))) {
      openStep.text += ` ${line}`;
    } else {
      parsed.push(step(1, line));
    }
    isAfterGap = false;
    bulletLevel = 0;
  }
  return parsed.map(item => ({ ...item, text: item.text.trim() }));
}
