import {
  isFilledEntry,
  lineValueOf,
  type PlateLine,
  type PlateMapCard,
} from '@odysseus/shared-schemas';

import { displayValue, readableAmount } from '../formulas/quantities';

import { wellAmount } from './plateSeries';

import type { SolvedBoard } from '../formulas/boardCalculation';

export interface WellLine {
  label: string;
  amount: string;
  readable: string;
}

export interface WellColor {
  color: string;
  tint: number;
}

const PLAIN_TINT = 34;
const STRONGEST_TINT = 58;
const TINT_FADE = 46;

export function wellLine(
  card: PlateMapCard,
  key: string,
  line: PlateLine,
  board: SolvedBoard
): WellLine | undefined {
  const entry = card.samples[key]?.[line.id];
  const point = wellAmount(card, key, line, board);
  if (!isFilledEntry(entry) || !point) return undefined;
  const { amount, unit } = point;
  return {
    label: lineValueOf(line, entry)?.text.trim() ?? '',
    amount: amount ? displayValue(amount, unit) : '',
    readable: amount ? readableAmount(amount, unit) : '',
  };
}

export const wellLineText = ({ label, readable }: WellLine) =>
  [label, readable].filter(Boolean).join(' · ');

export const wellDetails = (card: PlateMapCard, key: string, board: SolvedBoard) =>
  card.lines.flatMap(line => {
    const shown = wellLine(card, key, line, board);
    const text = shown && wellLineText(shown);
    return text ? [text] : [];
  });

export function seriesProgress(
  card: PlateMapCard,
  key: string,
  line: PlateLine
): number | undefined {
  const entry = card.samples[key]?.[line.id];
  if (entry?.seriesId === undefined) return undefined;
  const lastStep = Math.max(
    ...Object.values(card.samples)
      .map(lines => lines[line.id])
      .filter(other => other?.seriesId === entry.seriesId)
      .map(other => other.seriesPoint ?? 0)
  );
  return lastStep > 0 ? (entry.seriesPoint ?? 0) / lastStep : undefined;
}

export function wellColor(
  card: PlateMapCard,
  key: string,
  colorLine: PlateLine | undefined
): WellColor | undefined {
  const entry = colorLine && card.samples[key]?.[colorLine.id];
  const color = colorLine && lineValueOf(colorLine, entry)?.color;
  if (!colorLine || !entry || !color) return undefined;
  const progress = seriesProgress(card, key, colorLine);
  return {
    color,
    tint: progress === undefined ? PLAIN_TINT : Math.round(STRONGEST_TINT - progress * TINT_FADE),
  };
}
