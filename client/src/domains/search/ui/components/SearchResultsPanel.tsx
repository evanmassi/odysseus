/**
 * Search Results Panel
 *
 * Displays grouped, sorted search results with highlighting, export, and navigation.
 */

import { useMemo } from 'react';

import {
  formatConcentrationDisplay,
  formatResearcherDropdownDisplay,
  formatResearcherListDisplay,
  formatStorageDisplayName,
} from '@odysseus/shared-schemas';
import { Download, MapPin, TestTubeDiagonal } from 'lucide-react';

import { useResearchersQuery } from '@domains/researchers';
import { useStorageData } from '@domains/storage';
import { formatPositionForBox } from '@domains/storage/utils/positionDisplayUtils';
import { useTubeStore } from '@domains/tubes';
import { useUserSettings, useUserLookupQuery } from '@domains/users';
import { Button, Chip, LoadingSpinner, PanelEmptyState, Tooltip } from '@shared/ui';
import { TubeIcon } from '@shared/ui/components/icons';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';

import { useSearch } from '../../hooks/useSearch';
import { useSearchStore } from '../../stores/searchStore';
import { highlightMatches, type DisplayResults } from '../../utils/searchFormatters';

import { SearchSortControls } from './SearchSortControls';

import type { TubeData } from '@odysseus/shared-schemas';

interface SearchResultsPanelProps {
  results: DisplayResults | null;
  isSearching?: boolean;
  onClose?: () => void;
}

export function SearchResultsPanel({
  results,
  isSearching = false,
  onClose,
}: SearchResultsPanelProps) {
  const { navigateToResult } = useSearch();
  const { currentTank } = useTubeStore();
  const { currentLab, getCurrentTanks, getBox } = useStorageData();
  const { data: researchers = [] } = useResearchersQuery();
  const { settings: userSettings } = useUserSettings();
  const sortField = useSearchStore(state => state.sortField);
  const sortDirection = useSearchStore(state => state.sortDirection);

  const tubes = results?.tubes ?? [];
  const totalCount = results?.total ?? 0;
  const query = results?.query ?? '';
  const matchedTerms = results?.matchedTerms ?? [];

  const lockedByUserIds = useMemo(() => {
    const tubeList = results?.tubes ?? [];
    const ids = tubeList.map(t => t.lockedBy).filter((id): id is string => !!id);
    return [...new Set(ids)];
  }, [results?.tubes]);
  const { data: lockedByUsers = [] } = useUserLookupQuery(lockedByUserIds);

  // Must be called before early returns (React hooks rule)
  const sortedGroups = useMemo(() => {
    const groups = results?.grouped ?? [];
    if (!groups || groups.length === 0) return groups;

    const sorted = [...groups].sort((a, b) => {
      const firstTubeA = a.tubes[0];
      const firstTubeB = b.tubes[0];

      let compareValue = 0;

      switch (sortField) {
        case 'location': {
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
          const nameA = researcherA ? formatResearcherListDisplay(researcherA) : '';
          const nameB = researcherB ? formatResearcherListDisplay(researcherB) : '';
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

  if (!results && isSearching) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="flex items-center">
          <LoadingSpinner size="md" className="text-primary" />
          <span className="ml-2 text-body-sm text-secondary-foreground">Searching...</span>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex-1 flex p-4">
        <PanelEmptyState
          icon={TestTubeDiagonal}
          message="Search inventory"
          description="Browse with filters"
          className="flex-1"
        />
      </div>
    );
  }

  const highlightText = (text: string, searchQuery: string): React.ReactNode => {
    const segments = highlightMatches(text, searchQuery, matchedTerms);
    if (segments.length === 1 && !segments[0].isMatch) return text;

    return (
      <>
        {segments.map((segment, i) =>
          segment.isMatch ? (
            <span
              key={i}
              className="border-b-2 border-action"
              style={{
                transition: 'border-color 120ms ease',
                display: 'inline',
                paddingBottom: '1px',
              }}
            >
              {segment.text}
            </span>
          ) : (
            segment.text
          )
        )}
      </>
    );
  };

  const getDisplayLocation = (primaryLocation: string): string => {
    const [tankId, rackId, boxId] = primaryLocation.split(':');
    const tanks = getCurrentTanks();

    const tank = tanks.find(t => t.id === tankId);
    const tankName = tank?.name ?? `Tank ${tankId}`;

    const rack = tank?.racks?.find(r => r.id === rackId);
    const rackName = rack?.name ?? `Rack ${rackId}`;

    return `${tankName} → ${rackName} → Box ${boxId}`;
  };

  const getResearcherName = (researcherId: string | undefined): string => {
    if (!researcherId) return '';
    const researcher = researchers.find(r => r.id === researcherId);
    return researcher ? formatResearcherDropdownDisplay(researcher) : '';
  };

  const getUserDisplayName = (userId: string | undefined): string => {
    if (!userId) return '';
    const user = lockedByUsers.find(u => u.id === userId);
    if (!user) return '';
    if (user.firstName && user.lastName) {
      return `${user.lastName}, ${user.firstName}`;
    }
    return user.username;
  };

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
    const escapeCsvValue = (value: string): string => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const getLocationNames = (tankId: string, rackId: string, boxId: string) => {
      const tanks = getCurrentTanks();
      const tank = tanks.find(t => t.id === tankId);
      const tankName = tank?.name ?? `Tank ${tankId}`;

      const rack = tank?.racks?.find(r => r.id === rackId);
      const rackGenericName = rack?.name ?? `Rack ${rackId}`;
      const rackName = formatStorageDisplayName(rackGenericName, rack?.customLabel);

      const box = rack?.boxes?.find(b => b.id === boxId);
      const boxGenericName = box?.name ?? `Box ${boxId}`;
      const boxName = formatStorageDisplayName(boxGenericName, box?.customLabel);

      return { tankName, rackName, boxName, box };
    };

    const headers = [
      'Tank',
      'Rack',
      'Box',
      'Position',
      'Position Label',
      'Cell Type',
      'Species',
      'Donor Internal ID',
      'Donor Source ID',
      'Concentration',
      'Date',
      'Lot Number',
      'Source',
      'Catalog Number',
      'Passage Number',
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
          tube.sample.species ?? '',
          tube.sample.donorInternalId ?? '',
          tube.sample.donorSourceId ?? '',
          formatConcentrationDisplay(tube.sample.concentration, tube.sample.concentrationUnit),
          formatDate(tube.sample.date),
          tube.sample.lotNumber ?? '',
          tube.sample.source ?? '',
          tube.sample.catalogNumber ?? '',
          tube.sample.passageNumber?.toString() ?? '',
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

    onClose?.();
  };

  const formatPositions = (tubes: TubeData[]): string => {
    if (tubes.length === 0) return '';

    // Get location info from first tube (all tubes in group share same box)
    const firstTube = tubes[0];
    const { tankId, rackId, boxId } = firstTube.location;

    const positions = Array.from(
      new Set(
        tubes
          .map(tube => tube.location.position)
          .filter(pos => pos != null)
          .map(pos => Number(pos))
      )
    ).sort((a, b) => a - b);

    const box = getBox(tankId, rackId, boxId);
    if (!box?.gridConfig) {
      return positions.length === 1 ? `Pos: ${positions[0]}` : `Pos: ${positions.join(', ')}`;
    }

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

    if (ranges.length > 4) {
      const displayRanges = ranges.slice(0, 4);
      const remaining = ranges.length - 4;
      return `Pos: ${displayRanges.join(', ')} (+${remaining} more)`;
    }

    return `Pos: ${ranges.join(', ')}`;
  };

  return (
    <div className="flex-1 max-h-[600px] overflow-hidden relative flex flex-col">
      {isSearching && (
        <div className="absolute inset-0 bg-background/50 flex items-start justify-center pt-2 z-10">
          <div className="flex items-center border border-line-soft bg-card px-3 py-1 shadow-[0_8px_20px_-12px_hsl(var(--recess)/0.7)]">
            <LoadingSpinner size={12} className="text-primary" />
            <span className="ml-2 type-label text-label-2xs text-foreground/60">Updating</span>
          </div>
        </div>
      )}

      <SearchSortControls />

      <ScrollArea className="flex-1 p-4">
        <div className="flex min-h-full flex-col space-y-3">
          <div className="flex items-center justify-between border-b border-line-soft pb-2">
            <div className="type-label text-label-2xs text-foreground/60">
              <span className="tabular-nums text-foreground/85">{totalCount}</span> tube
              {totalCount !== 1 ? 's' : ''} found
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

          {sortedGroups.length > 0 ? (
            <div className="space-y-2">
              {sortedGroups.map((group, index) => {
                const firstTube = group.tubes[0];
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- cellType is required; empty string indicates missing data, display as 'Unknown'
                const cellType = firstTube.sample?.cellType || 'Unknown';
                const species = firstTube.sample?.species ?? '';
                const donorInternal = firstTube.sample?.donorInternalId ?? '';
                const donorSource = firstTube.sample?.donorSourceId ?? '';
                const lotNumber = firstTube.sample?.lotNumber ?? '';
                const date = formatDate(firstTube.sample?.date);
                const researcherName = getResearcherName(firstTube.researcherId);
                const location = getDisplayLocation(group.primaryLocation);

                return (
                  <button
                    type="button"
                    key={index}
                    onClick={() => handleGroupClick(group)}
                    className="w-full cursor-pointer border border-line-soft bg-card p-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.04] hover:shadow-[inset_3px_0_0_0_hsl(var(--primary)/0.5)]"
                    aria-label={`View ${group.totalCount} tube${group.totalCount !== 1 ? 's' : ''} of ${cellType}${donorInternal ? `, donor ${donorInternal}` : ''}${location ? `, located in ${location}` : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <TubeIcon
                          className="text-secondary-foreground flex-shrink-0"
                          size={14}
                          aria-hidden="true"
                        />
                        <span className="text-body-sm font-semibold text-card-foreground">
                          {highlightText(cellType, query)}
                        </span>
                        {species && (
                          <>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-body-sm text-secondary-foreground">
                              {highlightText(species, query)}
                            </span>
                          </>
                        )}
                      </div>
                      <Chip size="sm" color="default" className="flex-shrink-0">
                        {group.totalCount} tube{group.totalCount !== 1 ? 's' : ''}
                      </Chip>
                    </div>

                    <div className="flex mt-1">
                      <div className="ml-[11px] mr-2 border-l-2 border-line-soft"></div>
                      <div className="flex-1 space-y-0.5 text-caption text-secondary-foreground">
                        {(donorInternal || donorSource) && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {donorInternal && <span>{highlightText(donorInternal, query)}</span>}
                            {donorInternal && donorSource && (
                              <span className="text-muted-foreground">·</span>
                            )}
                            {donorSource && <span>{highlightText(donorSource, query)}</span>}
                          </div>
                        )}

                        {(lotNumber || date || researcherName) && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {lotNumber && <span>{highlightText(lotNumber, query)}</span>}
                            {lotNumber && (date || researcherName) && (
                              <span className="text-muted-foreground">·</span>
                            )}
                            {date && <span>{date}</span>}
                            {date && researcherName && (
                              <span className="text-muted-foreground">·</span>
                            )}
                            {researcherName && <span>{highlightText(researcherName, query)}</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-1.5 text-caption text-muted-foreground mt-1">
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
            <PanelEmptyState
              icon={TestTubeDiagonal}
              message="No results found"
              description="Try adjusting your search or filters"
              className="flex-1"
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
