/**
 * Label Formatter
 *
 * Transforms tube data into label lines. Empty fields are omitted entirely.
 */

import {
  type TubeData,
  type Researcher,
  formatConcentrationDisplay,
} from '@odysseus/shared-schemas';

import type { LabelLines } from '../types';

/** Parses YYYY-MM-DD directly to avoid timezone shifting on calendar dates */
export function formatLabelDate(date: string | Date | undefined): string | undefined {
  if (!date) return undefined;

  try {
    if (typeof date === 'string') {
      const isoDateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|$)/);
      if (isoDateMatch) {
        const [, yearStr, monthStr, dayStr] = isoDateMatch;
        const year = yearStr.slice(-2);
        return `${monthStr}/${dayStr}/${year}`;
      }
    }

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(dateObj.getTime())) return undefined;

    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    const year = String(dateObj.getUTCFullYear()).slice(-2);

    return `${month}/${day}/${year}`;
  } catch {
    return undefined;
  }
}

export function getResearcherInitials(researcher: Researcher | undefined): string | undefined {
  if (!researcher?.firstName || !researcher?.lastName) return undefined;
  return `${researcher.firstName[0]}${researcher.lastName[0]}`.toUpperCase();
}

export function buildLine(parts: (string | undefined)[], separator: string): string | undefined {
  const validParts = parts.filter((p): p is string => Boolean(p));
  return validParts.length > 0 ? validParts.join(separator) : undefined;
}

/**
 * Line 1: Cell Type | Line 2: Internal ID / Source ID
 * Line 3: Culture Condition, Lot # | Line 4: Concentration, Date, Initials
 */
export function formatTubeForLabel(tube: TubeData, researcher?: Researcher): LabelLines {
  const sample = tube.sample;

  // Line 1: Cell Type
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty string should become undefined
  const line1 = sample.cellType?.trim() || undefined;

  // Line 2: Internal ID / Source ID
  const internalId = sample.donorInternalId?.trim();
  const sourceId = sample.donorSourceId?.trim();
  const line2 = buildLine([internalId, sourceId], ' / ');

  // Line 3: Culture Condition, Lot #
  const cultureCondition = sample.cultureCondition?.trim();
  const lotNumber = sample.lotNumber?.trim() ? `Lot ${sample.lotNumber.trim()}` : undefined;
  const line3 = buildLine([cultureCondition, lotNumber], ', ');

  // Line 4: Concentration, Date, Initials
  const concentration =
    sample.concentration !== undefined
      ? formatConcentrationDisplay(sample.concentration, sample.concentrationUnit)
      : undefined;
  const date = formatLabelDate(sample.date);
  const initials = getResearcherInitials(researcher);
  const line4 = buildLine([concentration, date, initials], '  ');

  return { line1, line2, line3, line4 };
}

export function hasLabelContent(lines: LabelLines): boolean {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty strings count as no content
  return Boolean(lines.line1 || lines.line2 || lines.line3 || lines.line4);
}

export function countLabelLines(lines: LabelLines): number {
  let count = 0;
  if (lines.line1) count++;
  if (lines.line2) count++;
  if (lines.line3) count++;
  if (lines.line4) count++;
  return count;
}
