/**
 * Tube Relevance Grouping
 *
 * Groups search result tubes by matched field and location for display.
 */

import { NAMING_PATTERNS } from '@odysseus/shared-schemas';

import type { TubeData } from '@domains/tubes/types';
import type { GroupedResult } from '@odysseus/shared-schemas';

const getMediaString = (sample: TubeData['sample']): string => {
  return [sample.mediaType, sample.mediaSupplements, sample.mediaSelection]
    .filter(Boolean)
    .join(' ');
};

export const groupTubesByRelevance = (tubes: TubeData[], query: string): GroupedResult[] => {
  if (!query.trim()) {
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

  const lowerQuery = query.toLowerCase();

  tubes.forEach(tube => {
    let groupType: GroupedResult['groupType'] = 'cellType';

    if (tube.sample.donorInternalId?.toLowerCase().includes(lowerQuery)) {
      groupType = 'donor';
    } else if (tube.sample.donorSourceId?.toLowerCase().includes(lowerQuery)) {
      groupType = 'donor';
    } else if (tube.sample.cellType?.toLowerCase().includes(lowerQuery)) {
      groupType = 'cellType';
    } else if (tube.researcherId?.toLowerCase().includes(lowerQuery)) {
      groupType = 'researcher';
    } else if (tube.sample.lotNumber?.toLowerCase().includes(lowerQuery)) {
      groupType = 'lotNumber';
    } else if (getMediaString(tube.sample).toLowerCase().includes(lowerQuery)) {
      groupType = 'media';
    } else {
      groupType = 'cellType';
    }

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

const getPrimaryLocation = (tubes: TubeData[]): string => {
  if (tubes.length === 0) return 'No location';

  const firstTube = tubes[0];
  const tankId = firstTube.location.tankId || NAMING_PATTERNS.TANK.ID_PATTERN(1);

  return `${tankId}:${firstTube.location.rackId}:${firstTube.location.boxId}`;
};
