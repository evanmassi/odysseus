/**
 * Search Display Formatters
 *
 * Client-side presentation logic: text highlighting, result formatting, and researcher enrichment.
 */

import { groupTubesByRelevance } from './groupTubesByRelevance';

import type { TubeData } from '@domains/tubes/types';
import type { SearchResult, GroupedResult, Researcher } from '@odysseus/shared-schemas';

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
 * Splits text into segments marked as matching or non-matching.
 * Supports multi-term highlighting with optional server-provided matchedTerms
 * (which include synonyms and normalized forms). Falls back to splitting query
 * by whitespace. Longer terms match first to avoid partial overlaps.
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

/** Resolves researcherId UUIDs to display names using the presenter pattern. */
export function enrichWithResearchers(
  results: GroupedResult[],
  researchers: Researcher[]
): GroupedResult[] {
  if (!researchers || researchers.length === 0) {
    return results;
  }

  const researcherMap = new Map(researchers.map(r => [r.id, `${r.firstName} ${r.lastName}`]));

  return results.map(group => ({
    ...group,
    tubes: group.tubes.map(tube => {
      if (tube.researcherId) {
        const researcherName = researcherMap.get(tube.researcherId);
        return {
          ...tube,
          researcherName,
        } as TubeData & { researcherName?: string };
      }
      return tube;
    }),
  }));
}

/**
 * Converts raw server response to display-ready results.
 * Uses server-side grouping when available, falls back to client-side.
 */
export function formatResultsForDisplay(
  serverResult: SearchResult | null | undefined,
  query: string,
  researchers: Researcher[] = []
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

  grouped = enrichWithResearchers(grouped, researchers);

  return {
    tubes,
    grouped,
    matchedTerms: serverResult.matchedTerms,
    total: tubes.length,
    query,
    hasResults: tubes.length > 0,
  };
}
