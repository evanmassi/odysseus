import { NAMING_PATTERNS } from '@odysseus/shared-schemas';

import type { TubeData } from '@domains/tubes/types';
import type { GroupedResult } from '@odysseus/shared-schemas';

const getMediaString = (sample: TubeData['sample']): string => {
  return [sample.mediaType, sample.mediaSupplements, sample.mediaSelection]
    .filter(Boolean)
    .join(' ');
};

/**
 * Group tubes by relevance for search results
 *
 * This function maintains the existing grouping logic from the original SearchStore
 * but is now extracted as a pure utility function.
 */
export const groupTubesByRelevance = (tubes: TubeData[], query: string): GroupedResult[] => {
  if (!query.trim()) {
    // Group by cell type when no query
    const groups = new Map<string, TubeData[]>();
    tubes.forEach(tube => {
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- cellType is required; empty string indicates missing data, display as 'Unknown'
      const key = tube.sample.cellType || 'Unknown';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(tube);
    });

    return Array.from(groups.entries()).map(([key, groupTubes]) => ({
      groupKey: key,
      groupType: 'cellType' as const,
      tubes: groupTubes,
      primaryLocation: getPrimaryLocation(groupTubes),
      totalCount: groupTubes.length,
    }));
  }

  const groups = new Map<
    string,
    {
      tubes: TubeData[];
      type: GroupedResult['groupType'];
      matchedField: string;
    }
  >();

  tubes.forEach(tube => {
    let groupType: GroupedResult['groupType'] = 'cellType';

    // Determine what field matched the query
    if (tube.sample.donorInternalId?.toLowerCase().includes(query.toLowerCase())) {
      groupType = 'donor';
    } else if (tube.sample.donorSourceId?.toLowerCase().includes(query.toLowerCase())) {
      groupType = 'donor';
    } else if (tube.sample.cellType?.toLowerCase().includes(query.toLowerCase())) {
      groupType = 'cellType';
    } else if (tube.researcherId?.toLowerCase().includes(query.toLowerCase())) {
      // Search by researcherId (ID-based, not name)
      // Note: This searches by ID string. To search by name, need to fetch researcher data separately
      groupType = 'researcher';
    } else if (tube.sample.lotNumber?.toLowerCase().includes(query.toLowerCase())) {
      groupType = 'lotNumber';
    } else if (getMediaString(tube.sample).toLowerCase().includes(query.toLowerCase())) {
      groupType = 'media';
    } else {
      groupType = 'cellType';
    }

    // Group by tube's CURRENT identifier, not what was matched
    const tankId = tube.location.tankId || NAMING_PATTERNS.TANK.ID_PATTERN(1);
    /* eslint-disable @typescript-eslint/prefer-nullish-coalescing -- Cascading fallback: empty strings should fall through */
    const currentGroupKey =
      tube.sample.donorInternalId ||
      tube.sample.donorSourceId ||
      tube.sample.lotNumber ||
      tube.sample.cellType ||
      'Unknown';
    /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */
    const locationKey = `${currentGroupKey}:${tankId}:${tube.location.rackId}:${tube.location.boxId}`;

    if (!groups.has(locationKey)) {
      groups.set(locationKey, { tubes: [], type: groupType, matchedField: currentGroupKey });
    }
    groups.get(locationKey)!.tubes.push(tube);
  });

  return Array.from(groups.entries())
    .map(([_key, { tubes: groupTubes, type, matchedField }]) => ({
      groupKey: matchedField,
      groupType: type,
      tubes: groupTubes,
      primaryLocation: getPrimaryLocation(groupTubes),
      totalCount: groupTubes.length,
    }))
    .sort((a, b) => b.totalCount - a.totalCount);
};

/**
 * Get primary location for a group of tubes (internal helper)
 */
const getPrimaryLocation = (tubes: TubeData[]): string => {
  if (tubes.length === 0) return 'No location';

  // Return raw location data - display names will be resolved in UI components
  const firstTube = tubes[0];
  const tankId = firstTube.location.tankId || NAMING_PATTERNS.TANK.ID_PATTERN(1);

  return `${tankId}:${firstTube.location.rackId}:${firstTube.location.boxId}`;
};
