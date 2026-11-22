import { describeName } from '../formulas/nameDisplay';
import { findAmounts } from '../units/textAmounts';

import { stepVerbBase } from './stepVerbs';

import type { SolvedBoard } from '../formulas/boardCalculation';
import type { UnitKind } from '@odysseus/shared-schemas';

type TemplatePart =
  | { kind: 'text'; text: string }
  | { kind: 'reference'; name: string }
  | { kind: 'blank'; label: string };

export type ProsePiece =
  | { kind: 'plain' | 'verb'; text: string }
  | { kind: 'quantity'; text: string; unitKind: UnitKind | undefined };

const TEMPLATE_TOKEN = /(\{[^}]+\}|‹[^›]*›)/;
const REFERENCE_TOKEN = /^\{([^}]+)\}$/;
const BLANK_TOKEN = /^‹([^›]*)›$/;

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
  const pieces: ProsePiece[] = [];
  let consumed = 0;
  for (const amount of findAmounts(text)) {
    if (amount.start > consumed) {
      pieces.push(...verbPieces(text.slice(consumed, amount.start), isStepStart && consumed === 0));
    }
    pieces.push({ kind: 'quantity', text: amount.text, unitKind: amount.kind });
    consumed = amount.end;
  }
  if (consumed < text.length) {
    pieces.push(...verbPieces(text.slice(consumed), isStepStart && consumed === 0));
  }
  return pieces;
}

export function templateText(text: string, board: SolvedBoard): string {
  return parseStepTemplate(text)
    .map(part => {
      if (part.kind === 'reference') return describeName(board, part.name).text;
      if (part.kind === 'blank') return `[${part.label}]`;
      return part.text;
    })
    .join('');
}
