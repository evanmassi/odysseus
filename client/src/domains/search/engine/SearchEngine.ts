import { NAMING_PATTERNS, type Researcher , SearchResult, GroupedResult} from '@odysseus/shared-schemas';

import { useTubeStore } from '@domains/tubes';
import { toPositionKey } from '@shared/types/grid';

import { groupTubesByRelevance } from '../lib/searchUtils';

import type { TubeData } from '@domains/tubes/types';


/**
 * Highlighted text segment for rendering
 */
export interface HighlightedSegment {
  text: string;
  isMatch: boolean;
}

/**
 * Display-ready search results with enriched data
 */
export interface DisplayResults {
  tubes: TubeData[];
  grouped: GroupedResult[];
  total: number;
  query: string;
  hasResults: boolean;
}

/**
 * SearchEngine - Consolidated client-side search logic
 *
 * This class consolidates all client-side search operations:
 * - Text highlighting for matched queries
 * - Result formatting and enrichment
 * - Navigation to search results
 * - Researcher name resolution
 *
 * Following the "Smart Server, Dumb Client" pattern, this engine
 * handles presentation logic while the server handles search computation.
 */
export class SearchEngine {
  /**
   * Highlight all matches of query within text
   *
   * Returns an array of text segments, each marked as match or non-match.
   * Used by UI components to render bold/colored text for matches.
   *
   * @example
   * highlightMatches("CD34+ Cells", "CD34")
   * // Returns: [
   * //   { text: "CD34", isMatch: true },
   * //   { text: "+ Cells", isMatch: false }
   * // ]
   */
  static highlightMatches(text: string, query: string): HighlightedSegment[] {
    if (!query.trim() || !text) {
      return [{ text, isMatch: false }];
    }

    const segments: HighlightedSegment[] = [];

    // Escape special regex characters in query
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'gi');

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      // Add non-match before this match
      if (match.index > lastIndex) {
        segments.push({
          text: text.substring(lastIndex, match.index),
          isMatch: false
        });
      }

      // Add the match
      segments.push({
        text: match[0],
        isMatch: true
      });

      lastIndex = regex.lastIndex;
    }

    // Add remaining non-match
    if (lastIndex < text.length) {
      segments.push({
        text: text.substring(lastIndex),
        isMatch: false
      });
    }

    return segments;
  }

  /**
   * Enrich search results with researcher names
   *
   * Resolves researcherId (UUID) to actual researcher names for display.
   * This is a "presenter" pattern - transforming IDs to human-readable names.
   *
   * @param results - Grouped search results from server
   * @param researchers - List of all researchers
   * @returns Results with researcher names added
   */
  static enrichWithResearchers(
    results: GroupedResult[],
    researchers: Researcher[]
  ): GroupedResult[] {
    if (!researchers || researchers.length === 0) {
      return results;
    }

    // Create lookup map for O(1) access
    const researcherMap = new Map(
      researchers.map(r => [r.id, `${r.firstName} ${r.lastName}`])
    );

    return results.map(group => ({
      ...group,
      tubes: group.tubes.map(tube => {
        if (tube.researcherId) {
          const researcherName = researcherMap.get(tube.researcherId);
          return {
            ...tube,
            researcherName // Add researcher name for display
          } as TubeData & { researcherName?: string };
        }
        return tube;
      })
    }));
  }

  /**
   * Format server results for display
   *
   * Takes raw server response and formats it for UI consumption:
   * - Converts API response to TubeData[]
   * - Uses server-side grouping if available (progressive enhancement)
   * - Falls back to client-side grouping if needed
   * - Enriches with researcher names
   * - Prepares highlighting metadata
   *
   * @param serverResult - Raw API response
   * @param query - Search query string
   * @param researchers - List of researchers for name resolution
   * @returns Display-ready results
   */
  static formatResultsForDisplay(
    serverResult: SearchResult | null | undefined,
    query: string,
    researchers: Researcher[] = []
  ): DisplayResults | null {
    if (!serverResult?.data) {
      return null;
    }

    // Convert API response to TubeData format
    const tubes: TubeData[] = serverResult.data.map((tube: any) => ({
      ...tube,
      sample: {
        ...tube.sample,
        // Ensure concentration is a number
        concentration: typeof tube.sample.concentration === 'string'
          ? (tube.sample.concentration ? Number(tube.sample.concentration) : undefined)
          : tube.sample.concentration
      }
    }));

    // Progressive enhancement: Use server-side grouping if available, otherwise client-side
    let grouped: GroupedResult[];

    if (serverResult.grouped && serverResult.grouped.length > 0) {
      // Server provided grouped results (faster, already computed)
      grouped = serverResult.grouped;
    } else {
      // Fallback to client-side grouping (backwards compatibility)
      grouped = groupTubesByRelevance(tubes, query);
    }

    // Enrich with researcher names
    grouped = SearchEngine.enrichWithResearchers(grouped, researchers);

    return {
      tubes,
      grouped,
      total: tubes.length,
      query,
      hasResults: tubes.length > 0
    };
  }

  /**
   * Navigate to search result and select tubes
   *
   * Handles the full navigation flow:
   * 1. Navigate to the tank/rack/box location
   * 2. Select the tubes in the grid
   * 3. Scroll into view
   *
   * This was previously in searchStore.navigateToGroup()
   *
   * @param tubes - Array of tubes to navigate to and select
   */
  static async navigateToResult(tubes: TubeData[]): Promise<void> {
    if (tubes.length === 0) return;

    // Get the first tube to determine navigation target
    const firstTube = tubes[0];
    const tankId = firstTube.location.tankId || NAMING_PATTERNS.TANK.ID_PATTERN(1);
    const rackId = firstTube.location.rackId;
    const boxId = firstTube.location.boxId;

    // Use atomic navigation service
    const { gridNavigationService } = await import('@domains/grid');
    await gridNavigationService.navigateToLocation({ tankId, rackId, boxId });

    const tubeStore = useTubeStore.getState();

    // Select the tubes for immediate visibility
    const positionKeys = tubes.map(tube =>
      toPositionKey(
        { tankId: tube.location.tankId || tankId, rackId: tube.location.rackId, boxId: tube.location.boxId },
        tube.location.position
      )
    );
    tubeStore.setSelection(new Set(positionKeys));
  }
}
