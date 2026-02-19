import { useMemo } from 'react';

import {
  type TubeData,
  formatConcentrationDisplay,
  formatResearcherDropdownDisplay,
  formatResourceDisplayName,
} from '@odysseus/shared-schemas';
import { Download, MapPin } from 'lucide-react';

import { useUserSettings } from '@domains/authentication';
import { useResearchersQuery } from '@domains/researchers';
import { useSearch, useSearchStore } from '@domains/search';
import { useStorageData } from '@domains/storage';
import { formatPositionForBox } from '@domains/storage/utils/positionDisplayUtils';
import { useTubeStore } from '@domains/tubes';
import { useUserLookupQuery } from '@domains/users';
import { Button, Chip, Tooltip } from '@shared/ui';
import { TubeIcon } from '@shared/ui/components/icons';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';

import { SortDropdown } from './SortDropdown';

import type { SearchResults as SearchResultsType } from '@domains/search';

interface SearchResultsProps {
  results: SearchResultsType | null;
  isSearching?: boolean;
  onClose?: () => void;
}

export function SearchResults({ results, isSearching = false, onClose }: SearchResultsProps) {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const { navigateToResult } = useSearch();
  const { currentTank } = useTubeStore();
  const { currentLab, getCurrentTanks, getBox } = useStorageData();
  const { data: researchers = [] } = useResearchersQuery();
  const { settings: userSettings } = useUserSettings();
  const sortField = useSearchStore(state => state.sortField);
  const sortDirection = useSearchStore(state => state.sortDirection);

  // Extract data for sorting (handle null results safely)
  const tubes = results?.tubes ?? [];
  const totalCount = results?.total ?? 0;
  const query = results?.query ?? '';
  const matchedTerms = results?.matchedTerms ?? [];

  // Extract unique lockedBy user IDs for display name lookup
  const lockedByUserIds = useMemo(() => {
    const tubeList = results?.tubes ?? [];
    const ids = tubeList.map(t => t.lockedBy).filter((id): id is string => !!id);
    return [...new Set(ids)];
  }, [results?.tubes]);
  const { data: lockedByUsers = [] } = useUserLookupQuery(lockedByUserIds);

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
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="flex items-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
          <span className="ml-2 text-sm text-secondary-foreground">Searching...</span>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-muted-foreground">
          <TubeIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Search inventory</p>
          <p className="text-xs mt-1">Browse with filters</p>
        </div>
      </div>
    );
  }

  // Helper: Highlight matching terms with underline accent
  // Uses matchedTerms from server (includes synonyms and normalized forms)
  const highlightText = (text: string, searchQuery: string): React.ReactNode => {
    if (!searchQuery || !text) return text;

    // Use server-provided matchedTerms if available (includes synonyms, normalized forms)
    // Otherwise fall back to splitting the query
    let terms: string[];
    if (matchedTerms.length > 0) {
      terms = matchedTerms.filter(t => t.length > 0);
    } else {
      // Fallback: extract search terms (split by spaces, remove empty strings)
      terms = searchQuery
        .toLowerCase()
        .split(/\s+/)
        .filter(t => t.length > 0);
    }

    if (terms.length === 0) return text;

    // Build regex to match any term (case-insensitive)
    // Sort by length descending so longer terms match first
    const sortedTerms = [...terms].sort((a, b) => b.length - a.length);
    const regex = new RegExp(
      `(${sortedTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
      'gi'
    );

    // Split text by matches
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, i) => {
          const isMatch = terms.some(term => part.toLowerCase().includes(term));
          return isMatch ? (
            <span
              key={i}
              className="border-b-2 border-action"
              style={{
                transition: 'border-color 120ms ease',
                display: 'inline',
                paddingBottom: '1px',
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

  // Get researcher name from ID (returns empty string if no researcher assigned)
  const getResearcherName = (researcherId: string | undefined): string => {
    if (!researcherId) return '';
    const researcher = researchers.find(r => r.id === researcherId);
    return researcher ? formatResearcherDropdownDisplay(researcher) : '';
  };

  // Get user display name from ID (for locked-by field)
  const getUserDisplayName = (userId: string | undefined): string => {
    if (!userId) return '';
    const user = lockedByUsers.find(u => u.id === userId);
    if (!user) return '';
    if (user.firstName && user.lastName) {
      return `${user.lastName}, ${user.firstName}`;
    }
    return user.username;
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
    // Escape CSV value - wrap in quotes if contains comma, quote, or newline
    const escapeCsvValue = (value: string): string => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    // Get display names for a location
    const getLocationNames = (tankId: string, rackId: string, boxId: string) => {
      const tanks = getCurrentTanks();
      const tank = tanks.find(t => t.id === tankId);
      const tankName = tank?.name ?? `Tank ${tankId}`;

      const rack = tank?.racks?.find(r => r.id === rackId);
      const rackGenericName = rack?.name ?? `Rack ${rackId}`;
      const rackName = formatResourceDisplayName(rackGenericName, rack?.customLabel);

      const box = rack?.boxes?.find(b => b.id === boxId);
      const boxGenericName = box?.name ?? `Box ${boxId}`;
      const boxName = formatResourceDisplayName(boxGenericName, box?.customLabel);

      return { tankName, rackName, boxName, box };
    };

    const headers = [
      'Tank',
      'Rack',
      'Box',
      'Position',
      'Position Label',
      'Cell Type',
      'Donor Internal ID',
      'Donor Source ID',
      'Concentration',
      'Date',
      'Lot Number',
      'Researcher',
      'Media Type',
      'Media Supplements',
      'Media Selection',
      'Culture Condition',
      'Notes',
      'Locked',
      'Locked By',
      'Lock Note',
      'Created At',
      'Updated At',
    ];

    const csvContent = [
      headers.join(','),
      ...tubes.map(tube => {
        const { tankName, rackName, boxName, box } = getLocationNames(
          tube.location.tankId,
          tube.location.rackId,
          tube.location.boxId
        );

        let positionLabel = tube.location.position.toString();
        if (box?.gridConfig) {
          try {
            positionLabel = formatPositionForBox(
              tube.location.position,
              tube.location.tankId,
              tube.location.rackId,
              tube.location.boxId,
              box.gridConfig,
              currentLab,
              userSettings
            );
          } catch {
            positionLabel = tube.location.position.toString();
          }
        }

        const values = [
          tankName,
          rackName,
          boxName,
          tube.location.position.toString(),
          positionLabel,
          tube.sample.cellType ?? '',
          tube.sample.donorInternalId ?? '',
          tube.sample.donorSourceId ?? '',
          formatConcentrationDisplay(tube.sample.concentration, tube.sample.concentrationUnit),
          formatDate(tube.sample.date),
          tube.sample.lotNumber ?? '',
          getResearcherName(tube.researcherId),
          tube.sample.mediaType ?? '',
          tube.sample.mediaSupplements ?? '',
          tube.sample.mediaSelection ?? '',
          tube.sample.cultureCondition ?? '',
          tube.sample.notes ?? '',
          tube.isLocked ? 'Yes' : 'No',
          getUserDisplayName(tube.lockedBy),
          tube.lockNote ?? '',
          formatDate(tube.timestamps.createdAt),
          formatDate(tube.timestamps.updatedAt),
        ];

        return values.map(escapeCsvValue).join(',');
      }),
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
    const tubesWithTankId = group.tubes.map(tube => ({
      ...tube,
      location: {
        ...tube.location,
        tankId: tube.location?.tankId || currentTank,
      },
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
      const positions = Array.from(
        new Set(
          tubes
            .map(tube => tube.location.position)
            .filter(pos => pos != null)
            .map(pos => Number(pos))
        )
      ).sort((a, b) => a - b);
      return positions.length === 1 ? `Pos: ${positions[0]}` : `Pos: ${positions.join(', ')}`;
    }

    // Get unique positions and sort numerically
    const positions = Array.from(
      new Set(
        tubes
          .map(tube => tube.location.position)
          .filter(pos => pos != null)
          .map(pos => Number(pos))
      )
    ).sort((a, b) => a - b);

    if (positions.length === 1) {
      const label = formatPositionForBox(
        positions[0],
        tankId,
        rackId,
        boxId,
        box.gridConfig,
        currentLab,
        userSettings
      );
      return `Pos: ${label}`;
    }

    if (positions.length <= 3) {
      const labels = positions.map(pos =>
        formatPositionForBox(pos, tankId, rackId, boxId, box.gridConfig, currentLab, userSettings)
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
        const startLabel = formatPositionForBox(
          start,
          tankId,
          rackId,
          boxId,
          box.gridConfig,
          currentLab,
          userSettings
        );
        const endLabel = formatPositionForBox(
          end,
          tankId,
          rackId,
          boxId,
          box.gridConfig,
          currentLab,
          userSettings
        );
        ranges.push(start === end ? startLabel : `${startLabel}-${endLabel}`);
        start = positions[i];
        end = positions[i];
      }
    }
    // Don't forget the last range
    const startLabel = formatPositionForBox(
      start,
      tankId,
      rackId,
      boxId,
      box.gridConfig,
      currentLab,
      userSettings
    );
    const endLabel = formatPositionForBox(
      end,
      tankId,
      rackId,
      boxId,
      box.gridConfig,
      currentLab,
      userSettings
    );
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
    <div className="flex-1 max-h-[600px] overflow-hidden relative flex flex-col">
      {/* Loading overlay when refetching */}
      {isSearching && (
        <div className="absolute inset-0 bg-background/50 flex items-start justify-center pt-2 z-10">
          <div className="flex items-center bg-card px-3 py-1 rounded-full shadow-sm border border-border">
            <div className="animate-spin w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full" />
            <span className="ml-2 text-xs text-secondary-foreground">Updating...</span>
          </div>
        </div>
      )}

      {/* Sort Controls */}
      <SortDropdown />

      {/* Scrollable Results Container */}
      <ScrollArea className="flex-1 p-4 space-y-3">
        {/* Results Header */}
        <div className="flex items-center justify-between border-b pb-2">
          <div className="text-sm text-secondary-foreground font-medium">
            {totalCount} tube{totalCount !== 1 ? 's' : ''} found
          </div>

          {tubes.length > 0 && (
            <Tooltip content="Export search results" side="bottom">
              <Button
                variant="ghost"
                size="xs"
                leftIcon={<Download className="w-3 h-3" />}
                onClick={handleExportResults}
              >
                Export
              </Button>
            </Tooltip>
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
                  className="w-full text-left p-2.5 bg-muted rounded-md hover:bg-accent cursor-pointer transition-all"
                  aria-label={`View ${group.totalCount} tube${group.totalCount !== 1 ? 's' : ''} of ${cellType}${donorInternal ? `, donor ${donorInternal}` : ''}${location ? `, located in ${location}` : ''}`}
                >
                  {/* Line 1: Cell Type with tube count badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <TubeIcon
                        className="text-secondary-foreground flex-shrink-0"
                        size={14}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-semibold text-card-foreground">
                        {highlightText(cellType, query)}
                      </span>
                    </div>
                    <Chip size="sm" color="inverted" className="flex-shrink-0">
                      {group.totalCount} tube{group.totalCount !== 1 ? 's' : ''}
                    </Chip>
                  </div>

                  {/* Lines 2-4: Compact details with vertical indicator */}
                  <div className="flex mt-1">
                    <div className="ml-[11px] mr-2 border-l-2 border-border"></div>
                    <div className="flex-1 space-y-0.5 text-xs text-secondary-foreground">
                      {/* Line 2: Donor Internal ID · Donor Source ID */}
                      {(donorInternal || donorSource) && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {donorInternal && <span>{highlightText(donorInternal, query)}</span>}
                          {donorInternal && donorSource && (
                            <span className="text-muted-foreground">·</span>
                          )}
                          {donorSource && <span>{highlightText(donorSource, query)}</span>}
                        </div>
                      )}

                      {/* Line 3: Culture Condition · Lot Number · Concentration */}
                      {(cultureCondition || lotNumber || concentration) && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {cultureCondition && (
                            <span>{highlightText(cultureCondition, query)}</span>
                          )}
                          {cultureCondition && lotNumber && (
                            <span className="text-muted-foreground">·</span>
                          )}
                          {lotNumber && <span>{highlightText(lotNumber, query)}</span>}
                          {(cultureCondition || lotNumber) && concentration && (
                            <span className="text-muted-foreground">·</span>
                          )}
                          {concentration && <span>{concentration}</span>}
                        </div>
                      )}

                      {/* Line 4: Date · Researcher */}
                      {(date || researcherName) && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {date && <span>{date}</span>}
                          {date && researcherName && (
                            <span className="text-muted-foreground">·</span>
                          )}
                          {researcherName && <span>{highlightText(researcherName, query)}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Line 5: Location */}
                  <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                    <span>{location}</span>
                    <span className="text-muted-foreground">·</span>
                    <span>{formatPositions(group.tubes)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <TubeIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No results found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
