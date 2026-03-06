/**
 * Search Display Formatters
 *
 * Client-side presentation logic: text highlighting and result formatting.
 */

import { groupTubesByRelevance } from './groupTubesByRelevance';

import type { TubeData } from '@domains/tubes/types';
import type { SearchResult, GroupedResult } from '@odysseus/shared-schemas';

export interface HighlightedSegment {
  text: string;
  isMatch: boolean;
}

export interface DisplayResults {
  tubes: TubeData[];
  grouped: GroupedResult[];
  matchedTerms?: string[];
  total: number;
  query: string;
  hasResults: boolean;
}

/**
 * Supports server-provided matchedTerms (synonyms, normalized forms) with
 * fallback to whitespace-split query terms. Longer terms match first.
 *
 * @example
 * highlightMatches("CD34+ Stem Cells", "CD34 cells")
 * // Returns: [
 * //   { text: "CD34", isMatch: true }, { text: "+ Stem ", isMatch: false },
 * //   { text: "Cells", isMatch: true }
 * // ]
 */
export function highlightMatches(
  text: string,
  query: string,
  matchedTerms: string[] = []
): HighlightedSegment[] {
  if (!text || !query) {
    return [{ text, isMatch: false }];
  }

  const terms =
    matchedTerms.length > 0
      ? matchedTerms.filter(t => t.length > 0)
      : query
          .toLowerCase()
          .split(/\s+/)
          .filter(t => t.length > 0);

  if (terms.length === 0) {
    return [{ text, isMatch: false }];
  }

  // Sort by length descending so longer terms match first
  const sortedTerms = [...terms].sort((a, b) => b.length - a.length);
  const regex = new RegExp(
    `(${sortedTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi'
  );

  const parts = text.split(regex);

  return parts
    .filter(part => part.length > 0)
    .map(part => ({
      text: part,
      isMatch: terms.some(term => part.toLowerCase().includes(term.toLowerCase())),
    }));
}

/**
 * Converts raw server response to display-ready results.
 * Uses server-side grouping when available, falls back to client-side.
 */
export function formatResultsForDisplay(
  serverResult: SearchResult | null | undefined,
  query: string
): DisplayResults | null {
  if (!serverResult?.data) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Raw API data before transformation
  const tubes: TubeData[] = serverResult.data.map((tube: any) => ({
    ...tube,
    sample: {
      ...tube.sample,
      concentration:
        typeof tube.sample.concentration === 'string'
          ? tube.sample.concentration
            ? Number(tube.sample.concentration)
            : undefined
          : tube.sample.concentration,
    },
  }));

  let grouped: GroupedResult[];

  if (serverResult.grouped && serverResult.grouped.length > 0) {
    grouped = serverResult.grouped;
  } else {
    grouped = groupTubesByRelevance(tubes, query);
  }

  return {
    tubes,
    grouped,
    matchedTerms: serverResult.matchedTerms,
    total: tubes.length,
    query,
    hasResults: tubes.length > 0,
  };
}
