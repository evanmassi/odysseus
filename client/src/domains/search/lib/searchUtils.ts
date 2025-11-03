import { TubeData, TubeMedia } from '@domains/tubes/types';
import { GroupedResult, NAMING_PATTERNS } from '@odysseus/shared-schemas';

/**
 * Convert media object to string for searching
 */
const getMediaString = (media: TubeMedia | undefined): string => {
  if (!media) return '';
  
  // Combine all fields for searching
  return [media.type, media.supplements, media.selection]
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
      const key = tube.sample.cellType || 'Unknown';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(tube);
    });

    return Array.from(groups.entries()).map(([key, groupTubes]) => ({
      groupKey: key,
      groupType: 'cellType' as const,
      tubes: groupTubes,
      primaryLocation: getPrimaryLocation(groupTubes),
      totalCount: groupTubes.length
    }));
  }

  const groups = new Map<string, { 
    tubes: TubeData[], 
    type: GroupedResult['groupType'], 
    matchedField: string 
  }>();
  
  tubes.forEach(tube => {
    let matchedField = '';
    let groupType: GroupedResult['groupType'] = 'cellType';

    // Determine what field matched the query
    if (tube.sample.donorInternalId?.toLowerCase().includes(query.toLowerCase())) {
      matchedField = tube.sample.donorInternalId;
      groupType = 'donor';
    } else if (tube.sample.donorSourceId?.toLowerCase().includes(query.toLowerCase())) {
      matchedField = tube.sample.donorSourceId;
      groupType = 'donor';
    } else if (tube.sample.cellType?.toLowerCase().includes(query.toLowerCase())) {
      matchedField = tube.sample.cellType;
      groupType = 'cellType';
    } else if (tube.researcherId?.toLowerCase().includes(query.toLowerCase())) {
      // Search by researcherId (ID-based, not name)
      // Note: This searches by ID string. To search by name, need to fetch researcher data separately
      matchedField = tube.researcherId;
      groupType = 'researcher';
    } else if (tube.sample.lotNumber?.toLowerCase().includes(query.toLowerCase())) {
      matchedField = tube.sample.lotNumber;
      groupType = 'lotNumber';
    } else if (tube.sample.media && getMediaString(tube.sample.media).toLowerCase().includes(query.toLowerCase())) {
      matchedField = getMediaString(tube.sample.media);
      groupType = 'media';
    } else {
      matchedField = tube.sample.cellType || 'Unknown';
      groupType = 'cellType';
    }

    // Group by tube's CURRENT identifier, not what was matched
    const tankId = tube.location.tankId || NAMING_PATTERNS.TANK.ID_PATTERN(1);
    const currentGroupKey = tube.sample.donorInternalId || tube.sample.donorSourceId || tube.sample.lotNumber || tube.sample.cellType || 'Unknown';
    const locationKey = `${currentGroupKey}:${tankId}:${tube.location.rackId}:${tube.location.boxId}`;

    if (!groups.has(locationKey)) {
      groups.set(locationKey, { tubes: [], type: groupType, matchedField: currentGroupKey });
    }
    groups.get(locationKey)!.tubes.push(tube);
  });

  return Array.from(groups.entries())
    .map(([key, { tubes: groupTubes, type, matchedField }]) => ({
      groupKey: matchedField,
      groupType: type,
      tubes: groupTubes,
      primaryLocation: getPrimaryLocation(groupTubes),
      totalCount: groupTubes.length
    }))
    .sort((a, b) => b.totalCount - a.totalCount);
};

/**
 * Get primary location for a group of tubes
 */
export const getPrimaryLocation = (tubes: TubeData[]): string => {
  if (tubes.length === 0) return 'No location';

  // Return raw location data - display names will be resolved in UI components
  const firstTube = tubes[0];
  const tankId = firstTube.location.tankId || NAMING_PATTERNS.TANK.ID_PATTERN(1);

  return `${tankId}:${firstTube.location.rackId}:${firstTube.location.boxId}`;
};

/**
 * Transform search result to SearchResults format
 * 
 * This maintains compatibility with the existing SearchResults interface
 */
export const transformSearchResult = (
  searchResult: { data: any[] }, // Accept flexible API response
  query: string
) => {
  // Convert API response tubes to proper TubeData format
  const tubes: TubeData[] = (searchResult.data || []).map((tube: any) => ({
    ...tube,
    sample: {
      ...tube.sample,
      // Convert concentration from string|number to number for storage consistency
      concentration: typeof tube.sample.concentration === 'string' 
        ? (tube.sample.concentration ? Number(tube.sample.concentration) : undefined)
        : tube.sample.concentration
    }
  }));
  
  const grouped = groupTubesByRelevance(tubes, query);
  
  return {
    tubes,
    grouped,
    total: tubes.length,
    query,
    hasResults: tubes.length > 0
  };
};

