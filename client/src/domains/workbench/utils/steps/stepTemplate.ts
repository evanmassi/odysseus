import { describeName } from '../formulas/nameDisplay';

import { stepVerbBase } from './stepVerbs';

import type { BoardCalculation } from '../formulas/boardCalculation';

type TemplatePart =
  | { kind: 'text'; text: string }
  | { kind: 'reference'; name: string }
  | { kind: 'blank'; label: string };

export interface ProsePiece {
  kind: 'plain' | 'quantity' | 'verb';
  text: string;
}

const TEMPLATE_TOKEN = /(\{[^}]+\}|‹[^›]*›)/;
const REFERENCE_TOKEN = /^\{([^}]+)\}$/;
const BLANK_TOKEN = /^‹([^›]*)›$/;

const QUANTITY_PATTERN =
  /((?<![A-Za-z\d.-])\d[\d,.]*\s?(?:×\s?g|x\s?g|rpm|°C|µL|uL|mL|nL|L|µM|nM|mM|M|mg|µg|ng|g|min|hr|h|s|days?|weeks?|%|×)(?![A-Za-zµ])|(?<![A-Za-z\d])\d+:\d+|overnight|room temperature|on ice)/;
const SENTENCE_LEAD = /(^\s*|[.;]\s+)([A-Za-z]+)/g;

export function parseStepTemplate(text: string): TemplatePart[] {
  return text.split(TEMPLATE_TOKEN).flatMap((part): TemplatePart[] => {
    if (!part) return [];
    const reference = REFERENCE_TOKEN.exec(part);
    if (reference) return [{ kind: 'reference', name: reference[1] }];
    const blank = BLANK_TOKEN.exec(part);
    if (blank) return [{ kind: 'blank', label: blank[1] }];
    return [{ kind: 'text', text: part }];
  });
}

function verbPieces(text: string, isStepStart: boolean): ProsePiece[] {
  const pieces: ProsePiece[] = [];
  let consumed = 0;
  for (const match of text.matchAll(SENTENCE_LEAD)) {
    const [, lead, word] = match;
    if (!stepVerbBase(word) || !(lead.trim() || isStepStart)) continue;
    const start = (match.index ?? 0) + lead.length;
    if (start > consumed) pieces.push({ kind: 'plain', text: text.slice(consumed, start) });
    pieces.push({ kind: 'verb', text: word });
    consumed = start + word.length;
  }
  if (consumed < text.length) pieces.push({ kind: 'plain', text: text.slice(consumed) });
  return pieces;
}

export function splitProse(text: string, isStepStart: boolean): ProsePiece[] {
  return text
    .split(QUANTITY_PATTERN)
    .flatMap((piece, index) =>
      index % 2
        ? [{ kind: 'quantity' as const, text: piece }]
        : verbPieces(piece, isStepStart && index === 0)
    );
}

export function templateText(text: string, calculation: BoardCalculation): string {
  return parseStepTemplate(text)
    .map(part => {
      if (part.kind === 'reference') return describeName(calculation, part.name).text;
      if (part.kind === 'blank') return `[${part.label}]`;
      return part.text;
    })
    .join('');
}
