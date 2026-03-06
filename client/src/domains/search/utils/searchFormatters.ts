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
 * @example
 * highlightMatches("CD34+ Cells", "CD34")
 * // Returns: [{ text: "CD34", isMatch: true }, { text: "+ Cells", isMatch: false }]
 */
export function highlightMatches(text: string, query: string): HighlightedSegment[] {
  if (!query.trim() || !text) {
    return [{ text, isMatch: false }];
  }

  const segments: HighlightedSegment[] = [];
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedQuery, 'gi');

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        text: text.substring(lastIndex, match.index),
        isMatch: false,
      });
    }

    segments.push({
      text: match[0],
      isMatch: true,
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({
      text: text.substring(lastIndex),
      isMatch: false,
    });
  }

  return segments;
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
