import { useMemo } from 'react';

import { type TubeData, formatConcentrationDisplay, formatResearcherDropdownDisplay } from '@odysseus/shared-schemas';
import { Download, MapPin } from 'lucide-react';

import { useUserSettings } from '@domains/authentication';
import { useResearchersQuery } from '@domains/researchers';
import { useSearch, useSearchStore } from '@domains/search';
import { useStorageStore } from '@domains/storage';
import { formatPositionForBox } from '@domains/storage/utils/positionDisplayUtils';
import { useTubeStore } from '@domains/tubes';
import { TubeIcon } from '@shared/ui/components/icons';



import { SortDropdown } from './SortDropdown';

import type { SearchResults as SearchResultsType} from '@domains/search';

interface SearchResultsProps {
  results: SearchResultsType | null;
  isSearching?: boolean;
  onClose?: () => void;
}

export function SearchResults({ results, isSearching = false, onClose }: SearchResultsProps) {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const { navigateToResult } = useSearch();
  const { currentTank } = useTubeStore();
  const { getCurrentTanks, getBox } = useStorageStore();
  const { data: researchers = [] } = useResearchersQuery();
  const { settings: userSettings } = useUserSettings();
  const sortField = useSearchStore(state => state.sortField);
  const sortDirection = useSearchStore(state => state.sortDirection);

  // Extract data for sorting (handle null results safely)
  const tubes = results?.tubes ?? [];
  const totalCount = results?.total ?? 0;
  const query = results?.query ?? '';

  // Client-side sorting of grouped results - MUST be called before early returns
  const sortedGroups = useMemo(() => {
    const groups = results?.grouped ?? [];
    if (!groups || groups.length === 0) return groups;

    const sorted = [...groups].sort((a, b) => {
      const firstTubeA = a.tubes[0];
      const firstTubeB = b.tubes[0];

      let compareValue = 0;

      switch (sortField) {
        case 'location': {
          // Sort by tankId → rackId → boxId → position
          const locationA = `${firstTubeA.location.tankId}:${firstTubeA.location.rackId}:${firstTubeA.location.boxId}:${firstTubeA.location.position}`;
          const locationB = `${firstTubeB.location.tankId}:${firstTubeB.location.rackId}:${firstTubeB.location.boxId}:${firstTubeB.location.position}`;
          compareValue = locationA.localeCompare(locationB);
          break;
        }

        case 'date': {
          const dateA = firstTubeA.sample?.date ? new Date(firstTubeA.sample.date).getTime() : 0;
          const dateB = firstTubeB.sample?.date ? new Date(firstTubeB.sample.date).getTime() : 0;
          compareValue = dateA - dateB;
          break;
        }

        case 'cellType': {
          const cellTypeA = firstTubeA.sample?.cellType ?? '';
          const cellTypeB = firstTubeB.sample?.cellType ?? '';
          compareValue = cellTypeA.localeCompare(cellTypeB);
          break;
        }

        case 'researcher': {
          const researcherA = researchers.find(r => r.id === firstTubeA.researcherId);
          const researcherB = researchers.find(r => r.id === firstTubeB.researcherId);
          const nameA = researcherA ? `${researcherA.lastName}, ${researcherA.firstName}` : '';
          const nameB = researcherB ? `${researcherB.lastName}, ${researcherB.firstName}` : '';
          compareValue = nameA.localeCompare(nameB);
          break;
        }

        case 'lotNumber': {
          const lotA = firstTubeA.sample?.lotNumber ?? '';
          const lotB = firstTubeB.sample?.lotNumber ?? '';
          compareValue = lotA.localeCompare(lotB);
          break;
        }

        default:
          compareValue = 0;
      }

      return sortDirection === 'asc' ? compareValue : -compareValue;
    });

    return sorted;
  }, [results, sortField, sortDirection, researchers]);

  // NOW safe to do early returns after all hooks are called
  if (!results && isSearching) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
          <span className="ml-2 text-sm text-gray-600">Searching...</span>
        </div>
      </div>
    );
  }

  if (!results) {
    return null;
  }

  // Helper: Highlight matching terms with modern underline accent
  const highlightText = (text: string, searchQuery: string): React.ReactNode => {
    if (!searchQuery || !text) return text;

    // Extract search terms (split by spaces, remove empty strings)
    const terms = searchQuery
      .toLowerCase()
      .split(/\s+/)
      .filter(t => t.length > 0);

    if (terms.length === 0) return text;

    // Build regex to match any term (case-insensitive)
    const regex = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');

    // Split text by matches
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, i) => {
          const isMatch = terms.some(term => part.toLowerCase().includes(term));
          return isMatch ? (
            <span
              key={i}
              className="border-b-2 border-[#1e90ff] dark:border-[#4da6ff]"
              style={{
                transition: 'border-color 120ms ease',
                display: 'inline',
                paddingBottom: '1px'
              }}
            >
              {part}
            </span>
          ) : (
            part
          );
        })}
      </>
    );
  };

  // Resolve display names from configuration
  const getDisplayLocation = (primaryLocation: string): string => {
    const [tankId, rackId, boxId] = primaryLocation.split(':');
    const tanks = getCurrentTanks();

    const tank = tanks.find(t => t.id === tankId);
    const tankName = tank?.name ?? `Tank ${tankId}`;

    const rack = tank?.racks?.find(r => r.id === rackId);
    const rackName = rack?.name ?? `Rack ${rackId}`;

    return `${tankName} → ${rackName} → Box ${boxId}`;
  };

  // Get researcher name from ID
  const getResearcherName = (researcherId: string | undefined): string => {
    if (!researcherId) return 'Unknown';
    const researcher = researchers.find(r => r.id === researcherId);
    return researcher ? formatResearcherDropdownDisplay(researcher) : researcherId;
  };

  // Format date as MM/DD/YYYY
  const formatDate = (dateString: string | Date | undefined): string => {
    if (!dateString) return '';
    try {
      const date = dateString instanceof Date ? dateString : new Date(dateString);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    } catch {
      return typeof dateString === 'string' ? dateString : '';
    }
  };

  const handleExportResults = () => {
    const headers = ['Tank', 'Rack', 'Box', 'Position', 'Position Label', 'Cell Type', 'Donor Internal ID', 'Donor Source ID', 'Lot Number', 'Researcher ID', 'Date'];
    const csvContent = [
      headers.join(','),
      ...tubes.map(tube => {
        // Get box configuration for position label formatting
        const box = getBox(tube.location.tankId, tube.location.rackId, tube.location.boxId);
        let positionLabel = tube.location.position.toString();

        if (box?.gridConfig) {
          try {
            positionLabel = formatPositionForBox(
              tube.location.position,
              tube.location.tankId,
              tube.location.rackId,
              tube.location.boxId,
              box.gridConfig,
              userSettings
            );
          } catch {
            // Fall back to numeric if formatting fails
            positionLabel = tube.location.position.toString();
          }
        }

        return [
          tube.location.tankId,
          tube.location.rackId,
          tube.location.boxId,
          tube.location.position,
          positionLabel,
          tube.sample.cellType ?? '',
          tube.sample.donorInternalId ?? '',
          tube.sample.donorSourceId ?? '',
          tube.sample.lotNumber ?? '',
          tube.researcherId ?? '',
          tube.sample.date ?? ''
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `search_results_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGroupClick = async (group: { tubes: TubeData[] }) => {
    // Add tankId if missing for legacy data compatibility
    const tubesWithTankId = group.tubes.map((tube) => ({
      ...tube,
      location: {
        ...tube.location,
        tankId: tube.location?.tankId || currentTank
      }
    }));
    await navigateToResult(tubesWithTankId);

    // Close search results after navigation
    onClose?.();
  };

  const formatPositions = (tubes: TubeData[]): string => {
    if (tubes.length === 0) return '';

    // Get location info from first tube (all tubes in group share same box)
    const firstTube = tubes[0];
    const { tankId, rackId, boxId } = firstTube.location;

    // Get box configuration for grid dimensions
    const box = getBox(tankId, rackId, boxId);
    if (!box?.gridConfig) {
      // Fallback to numeric if box config not found
      const positions = Array.from(new Set(
        tubes.map(tube => tube.location.position).filter(pos => pos != null).map(pos => Number(pos))
      )).sort((a, b) => a - b);
      return positions.length === 1 ? `Pos: ${positions[0]}` : `Pos: ${positions.join(', ')}`;
    }

    // Get unique positions and sort numerically
    const positions = Array.from(new Set(
      tubes
        .map(tube => tube.location.position)
        .filter(pos => pos != null)
        .map(pos => Number(pos))
    )).sort((a, b) => a - b);

    if (positions.length === 1) {
      const label = formatPositionForBox(positions[0], tankId, rackId, boxId, box.gridConfig, userSettings);
      return `Pos: ${label}`;
    }

    if (positions.length <= 3) {
      const labels = positions.map(pos =>
        formatPositionForBox(pos, tankId, rackId, boxId, box.gridConfig, userSettings)
      );
      return `Pos: ${labels.join(', ')}`;
    }

    // Create smart ranges (work on numeric positions, then convert boundaries to labels)
    const ranges: string[] = [];
    let start = positions[0];
    let end = positions[0];

    for (let i = 1; i < positions.length; i++) {
      if (positions[i] === end + 1) {
        end = positions[i];
      } else {
        // Convert range boundaries to labels
        const startLabel = formatPositionForBox(start, tankId, rackId, boxId, box.gridConfig, userSettings);
        const endLabel = formatPositionForBox(end, tankId, rackId, boxId, box.gridConfig, userSettings);
        ranges.push(start === end ? startLabel : `${startLabel}-${endLabel}`);
        start = positions[i];
        end = positions[i];
      }
    }
    // Don't forget the last range
    const startLabel = formatPositionForBox(start, tankId, rackId, boxId, box.gridConfig, userSettings);
    const endLabel = formatPositionForBox(end, tankId, rackId, boxId, box.gridConfig, userSettings);
    ranges.push(start === end ? startLabel : `${startLabel}-${endLabel}`);

    // Limit display to prevent overflow - show first 4 ranges, then count
    if (ranges.length > 4) {
      const displayRanges = ranges.slice(0, 4);
      const remaining = ranges.length - 4;
      return `Pos: ${displayRanges.join(', ')} (+${remaining} more)`;
    }

    return `Pos: ${ranges.join(', ')}`;
  };

  return (
    <div className="max-h-[600px] overflow-hidden relative flex flex-col">
      {/* Loading overlay when refetching */}
      {isSearching && (
        <div className="absolute inset-0 bg-white/50 flex items-start justify-center pt-2 z-10">
          <div className="flex items-center bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200">
            <div className="animate-spin w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full" />
            <span className="ml-2 text-xs text-gray-600">Updating...</span>
          </div>
        </div>
      )}

      {/* Sort Controls */}
      <SortDropdown />

      {/* Scrollable Results Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Results Header */}
        <div className="flex items-center justify-between border-b pb-2">
        <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">
          {totalCount} tube{totalCount !== 1 ? 's' : ''} found
        </div>

        {tubes.length > 0 && (
          <button
            onClick={handleExportResults}
            className="flex items-center space-x-1 px-2 py-1 text-xs transition-colors"
            style={{ color: '#5987b6' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#4a7099'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#5987b6'}
            title="Export search results"
          >
            <Download className="w-3 h-3" />
            <span>Export</span>
          </button>
        )}
      </div>

        {/* Grouped Results - New 4-line format */}
        {sortedGroups.length > 0 ? (
          <div className="space-y-2">
            {sortedGroups.map((group, index) => {
            const firstTube = group.tubes[0];
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- cellType is required; empty string indicates missing data, display as 'Unknown'
            const cellType = firstTube.sample?.cellType || 'Unknown';
            const donorInternal = firstTube.sample?.donorInternalId ?? '';
            const donorSource = firstTube.sample?.donorSourceId ?? '';
            const cultureCondition = firstTube.sample?.cultureCondition ?? '';
            const lotNumber = firstTube.sample?.lotNumber ?? '';
            const concentration = formatConcentrationDisplay(
              firstTube.sample?.concentration,
              firstTube.sample?.concentrationUnit
            );
            const date = formatDate(firstTube.sample?.date);
            const researcherName = getResearcherName(firstTube.researcherId);
            const location = getDisplayLocation(group.primaryLocation);

            return (
              <button
                type="button"
                key={index}
                onClick={() => handleGroupClick(group)}
                className="w-full text-left p-2.5 border border-gray-200 dark:border-gray-700 rounded-md hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-all"
                aria-label={`View ${group.totalCount} tube${group.totalCount !== 1 ? 's' : ''} of ${cellType}${donorInternal ? `, donor ${donorInternal}` : ''}${location ? `, located in ${location}` : ''}`}
              >
                {/* Line 1: Cell Type with tube count badge in top-right */}
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                    <TubeIcon className="text-black flex-shrink-0" size={14} aria-hidden="true" />
                    <div className="text-xs font-semibold text-black">
                      {highlightText(cellType, query)}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium ml-2 flex-shrink-0 text-white" style={{ backgroundColor: '#5987b6' }}>
                    {group.totalCount} tube{group.totalCount !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Lines 2-4 with vertical indicator line */}
                <div className="flex">
                  {/* Vertical line indicator */}
                  <div className="ml-2 mr-2 mt-0.5 mb-1 border-l-2 border-gray-300"></div>

                  <div className="flex-1">
                    {/* Line 2: Donor IDs */}
                    {(donorInternal || donorSource) && (
                      <div className="text-xs text-black mb-1 flex items-center space-x-2">
                        {donorInternal && (
                          <>
                            <span className="font-normal">Int. ID:</span>
                            <span className="font-semibold">{highlightText(donorInternal, query)}</span>
                          </>
                        )}
                        {donorInternal && donorSource && <span>•</span>}
                        {donorSource && (
                          <>
                            <span className="font-normal">Src. ID:</span>
                            <span className="font-semibold">{highlightText(donorSource, query)}</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Line 3: Culture Condition • LOT # */}
                    <div className="text-xs text-black mb-1 flex items-center space-x-2">
                      {cultureCondition && (
                        <>
                          <span>{highlightText(cultureCondition, query)}</span>
                          {lotNumber && <span>•</span>}
                        </>
                      )}
                      {lotNumber && (
                        <>
                          <span>LOT #: {highlightText(lotNumber, query)}</span>
                        </>
                      )}
                    </div>

                    {/* Line 4: Concentration • Date • Researcher */}
                    <div className="text-xs text-black mb-1 flex items-center space-x-2">
                      {concentration && (
                        <>
                          <span>{concentration}</span>
                          {(date || researcherName) && <span>•</span>}
                        </>
                      )}
                      {date && (
                        <>
                          <span>{date}</span>
                          {researcherName && <span>•</span>}
                        </>
                      )}
                      {researcherName && <span>{highlightText(researcherName, query)}</span>}
                    </div>
                  </div>
                </div>

                {/* Line 5: Location with map icon aligned with tube icon above */}
                <div className="text-xs flex items-start space-x-1.5 min-w-0" style={{ color: '#5987b6' }}>
                  <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5 min-w-0">
                    <span className="whitespace-nowrap">{location}</span>
                    <span className="flex-shrink-0">•</span>
                    <span>{formatPositions(group.tubes)}</span>
                  </div>
                </div>
              </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <TubeIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No results found</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
