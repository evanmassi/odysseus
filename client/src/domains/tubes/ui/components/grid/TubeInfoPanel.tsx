import React, { useMemo } from 'react';

import {
  formatConcentrationDisplay,
  formatResearcherDropdownDisplay,
  EQUIPMENT_DEFAULTS,
} from '@odysseus/shared-schemas';
import { Lock, MapPin, Notebook, UsersRound } from 'lucide-react';

import { useFieldResolverQuery } from '@app/hooks';
import { useUserSettings } from '@domains/authentication';
import { useResearchersQuery } from '@domains/researchers';
import { useStorageData, formatPositionRangesForBox } from '@domains/storage';
import { parsePositionKey } from '@shared/types/grid';
import { formatDateForDisplay } from '@shared/utils/dateFormatter';

import { useTubeStore } from '../../../stores/tubeStore';
import { FieldValue } from '../displays/FieldValue';
import { InfoSection } from '../displays/InfoSection';

import type { Researcher } from '@odysseus/shared-schemas';
import type { LockContext } from '@shared/types/grid';
import type { TubeData } from '@shared/types/tubeTypes';

interface TubeInfoPanelProps {
  selectedTubes: TubeData[];
  /** Lock context for displaying lock information */
  lockContext?: LockContext;
}

export function TubeInfoPanel({ selectedTubes, lockContext }: TubeInfoPanelProps) {
  // Use new React Query + Field Resolver hook
  const { getTubeValue, analyzeFieldConflicts, tubes } = useFieldResolverQuery();

  // Fetch researchers for foreign key resolution (researcherId → name)
  // Uses React Query for automatic caching - no extra network calls on re-renders
  const { data: researchers = [] } = useResearchersQuery();

  // Get user settings for position display preferences
  const { settings: userSettings } = useUserSettings();

  // Create researcher lookup map for O(1) resolution performance
  // Memoized to avoid recreation on every render
  const researcherMap = useMemo(() => {
    const map = new Map<string, Researcher>();
    researchers.forEach(researcher => {
      map.set(researcher.id, researcher);
    });
    return map;
  }, [researchers]);

  // Get current location and configuration
  const { currentTank, currentRack, currentBox, selectedPositions } = useTubeStore();
  const { currentLab, getCurrentTanks, getBox } = useStorageData();
  const tanks = getCurrentTanks();
  const currentTankObj = tanks.find(tank => tank.id === currentTank);
  const currentRackObj = currentTankObj?.racks?.find(rack => rack.id === currentRack);
  const currentBoxObj = getBox(currentTank, currentRack, currentBox);

  // Get user-friendly names (not prefixed with "Tank" or "Rack")
  const tankName = currentTankObj?.name ?? 'Unknown Tank';
  const rackName = currentRackObj?.name ?? 'Unknown Rack';

  // Format position summary with flexible display
  // IMPORTANT: Must be before early return to comply with Rules of Hooks
  const positionSummary = useMemo(() => {
    if (selectedTubes.length === 0) return '';

    const firstTube = selectedTubes[0];
    const box = firstTube.location.boxId;
    const positions = selectedTubes.map(t => t.location.position);

    // Get grid config for position formatting
    const gridConfig = currentBoxObj?.gridConfig ?? {
      rows: EQUIPMENT_DEFAULTS.GRID_ROWS,
      cols: EQUIPMENT_DEFAULTS.GRID_COLS,
      template: 'standard' as const,
    };

    const formattedPositions = formatPositionRangesForBox(
      positions,
      firstTube.location.tankId,
      firstTube.location.rackId,
      firstTube.location.boxId,
      gridConfig,
      currentLab,
      userSettings
    );

    const positionLabel = selectedTubes.length === 1 ? 'Position' : 'Positions';
    return `${rackName} • Box ${box} • ${positionLabel} ${formattedPositions}`;
  }, [selectedTubes, rackName, currentBoxObj, currentLab, userSettings]);

  if (selectedTubes.length === 0) {
    // Show position info even when no tubes selected
    const positionCount = selectedPositions.size;

    // Extract position numbers from position keys
    const positions = Array.from(selectedPositions)
      .map(key => {
        const parsed = parsePositionKey(key);
        return parsed.position;
      })
      .sort((a, b) => a - b);

    // Get grid config for position formatting
    const gridConfig = currentBoxObj?.gridConfig ?? {
      rows: EQUIPMENT_DEFAULTS.GRID_ROWS,
      cols: EQUIPMENT_DEFAULTS.GRID_COLS,
      template: 'standard' as const,
    };

    const formattedPositions =
      positions.length > 0
        ? formatPositionRangesForBox(
            positions,
            currentTank,
            currentRack,
            currentBox,
            gridConfig,
            currentLab,
            userSettings
          )
        : '';

    const positionText =
      positionCount > 0
        ? `No tube${positionCount > 1 ? 's' : ''} at ${positionCount > 1 ? 'these' : 'this'} position${positionCount > 1 ? 's' : ''}`
        : 'Select a position to view tube information';

    return (
      <div style={{ minWidth: '280px' }}>
        <div className="space-y-1.5">
          {/* Position Display - Always Visible */}
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg px-1.5 py-2 border-2 border-teal-500 shadow-md text-center">
            <div className="font-bold text-teal-500 uppercase tracking-wider text-xs flex items-center justify-center gap-1">
              <MapPin className="w-3 h-3" />
              Position{positionCount > 1 ? 's' : ''}
            </div>
            <div className="font-semibold text-odysseus-dark mt-0.5 text-xs">{tankName}</div>
            <div className="font-bold text-odysseus-dark text-xs">
              {rackName} • Box {currentBox}
              {formattedPositions && (
                <span>
                  {' '}
                  • Position{positionCount > 1 ? 's' : ''} {formattedPositions}
                </span>
              )}
            </div>
          </div>

          {/* Placeholder Message */}
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-odysseus-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-odysseus-muted font-medium text-xs">{positionText}</p>
          </div>
        </div>
      </div>
    );
  }

  // Get first tube for display (or common values if multiple selected)
  const firstTube = selectedTubes[0];

  // Helper to get common value or first tube's value
  const getDisplayValue = (path: string): string | number | null | undefined => {
    if (selectedTubes.length === 1) {
      return getTubeValue(firstTube, path);
    }
    // For multiple tubes, check if all have same value
    const analysis = analyzeFieldConflicts(selectedTubes, path);
    if (analysis.hasConflict) return undefined;

    // Type guard: Filter out non-display types (boolean, Date, complex objects)
    const value = analysis.commonValue;
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      value === null ||
      value === undefined
    ) {
      return value;
    }
    // For Date or complex types, return undefined (not displayable as primitive)
    return undefined;
  };

  // Format values for display
  const cellType = getDisplayValue('sample.cellType');
  const donorInternalId = getDisplayValue('sample.donorInternalId');
  const donorSourceId = getDisplayValue('sample.donorSourceId');
  const cultureCondition = getDisplayValue('sample.cultureCondition');
  const lotNumber = getDisplayValue('sample.lotNumber');
  const mediaType = getDisplayValue('sample.media.type');
  const mediaSupplements = getDisplayValue('sample.media.supplements');
  const mediaSelection = getDisplayValue('sample.media.selection');
  const concentration = getDisplayValue('sample.concentration');
  const concentrationUnit = getDisplayValue('sample.concentrationUnit');
  const date = getDisplayValue('sample.date');
  const researcherId = getDisplayValue('researcherId');
  const createdByName = getDisplayValue('createdByName');
  const notes = getDisplayValue('sample.notes');

  // Format complex values
  const formattedConcentration =
    concentration !== undefined
      ? formatConcentrationDisplay(
          concentration as number,
          concentrationUnit as 'c/v' | 'c/mL' | undefined
        )
      : undefined;
  const formattedDate = date ? formatDateForDisplay(date as string | Date) : undefined;

  // Researcher display with historical name tracking
  const researcherDisplay = (() => {
    const currentName =
      researcherId && researcherMap.has(researcherId as string)
        ? formatResearcherDropdownDisplay(researcherMap.get(researcherId as string)!)
        : undefined;

    const historicalName = createdByName as string | undefined;

    // No researcher info at all
    if (!historicalName && !currentName) return undefined;

    // Only have historical name (researcher deleted or unlinked)
    if (!currentName) return historicalName;

    // Only have current name (old tube before Person entity implementation)
    if (!historicalName) return currentName;

    // Names match - no change
    if (historicalName === currentName) return currentName;

    // Names differ - show historical with current in parentheses
    return `${historicalName} (now ${currentName})`;
  })();

  // Detect if any fields have conflicts across selected tubes
  const hasConflicts = tubes.hasAnyConflicts(selectedTubes, [
    'sample.cellType',
    'sample.donorInternalId',
    'sample.donorSourceId',
    'sample.cultureCondition',
    'sample.lotNumber',
    'sample.media.type',
    'sample.media.supplements',
    'sample.media.selection',
    'sample.concentration',
    'sample.concentrationUnit',
    'sample.date',
    'researcherId',
    'sample.notes',
  ]);

  // Check if any sample information fields have values
  const hasSampleInfo =
    cultureCondition !== undefined ||
    lotNumber !== undefined ||
    mediaType !== undefined ||
    mediaSupplements !== undefined ||
    mediaSelection !== undefined ||
    formattedConcentration !== undefined ||
    formattedDate !== undefined ||
    researcherDisplay !== undefined;

  return (
    <div style={{ minWidth: '280px' }}>
      <div className="space-y-1.5">
        {/* Position - Compact */}
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg px-1.5 py-2 border-2 border-teal-500 shadow-md text-center">
          <div className="font-bold text-teal-500 uppercase tracking-wider text-xs flex items-center justify-center gap-1">
            <MapPin className="w-3 h-3" />
            Position{selectedTubes.length > 1 ? 's' : ''}
          </div>
          <div className="font-semibold text-odysseus-dark mt-0.5 text-xs">{tankName}</div>
          <div className="font-bold text-odysseus-dark text-xs">{positionSummary}</div>
          {selectedTubes.length > 1 && (
            <div className="text-odysseus-muted mt-0.5 text-xs">
              {selectedTubes.length} tube{selectedTubes.length > 1 ? 's' : ''} selected
              {hasConflicts && <span className="text-warning-text ml-1">• Some fields differ</span>}
            </div>
          )}
        </div>

        {/* Donor Information */}
        <InfoSection title="DONOR INFORMATION" color="primary">
          <div className="mt-2 border-l-2 border-gray-300 pl-2">
            <FieldValue label="Cell Type" value={cellType} />
          </div>
          <div className="flex flex-col gap-0.5 mt-3 border-l-2 border-gray-300 pl-2">
            <FieldValue label="Internal ID" value={donorInternalId} />
            <FieldValue label="Source ID" value={donorSourceId} />
          </div>
        </InfoSection>

        {/* Sample Information - Only show if at least one field has a value */}
        {hasSampleInfo && (
          <InfoSection title="SAMPLE INFORMATION" color="secondary">
            {/* Group 1: Culture Condition + Lot # */}
            <div className="flex flex-col gap-0.5 mt-2 border-l-2 border-gray-300 pl-2">
              <FieldValue label="Culture Condition" value={cultureCondition} />
              <FieldValue label="Lot #" value={lotNumber} />
            </div>

            {/* Group 2: Media + Supplements + Selection */}
            <div className="flex flex-col gap-0.5 mt-3 border-l-2 border-gray-300 pl-2">
              <FieldValue label="Media" value={mediaType} />
              <FieldValue label="Supplements" value={mediaSupplements} />
              <FieldValue label="Selection" value={mediaSelection} />
            </div>

            {/* Group 3: Concentration + Date + Researcher */}
            <div className="flex flex-col gap-0.5 mt-3 border-l-2 border-gray-300 pl-2">
              <FieldValue label="Concentration" value={formattedConcentration} />
              <FieldValue label="Date" value={formattedDate} />
              <FieldValue label="Researcher" value={researcherDisplay} />
            </div>
          </InfoSection>
        )}

        {/* Notes */}
        {notes && (
          <InfoSection title="NOTES" color="gray">
            <div className="text-odysseus-secondary text-xs leading-tight pr-4">{notes}</div>
          </InfoSection>
        )}

        {/* Lock Information - Only show for locked tubes */}
        {firstTube.isLocked &&
          lockContext &&
          (() => {
            const isOwnLock = lockContext.isLockedByCurrentUser(firstTube);
            const isLockedOut = lockContext.isLockedOutFrom(firstTube);
            const ownerName = lockContext.getLockOwnerName(firstTube) ?? 'Unknown';
            const sharedNames = lockContext.getSharedUserNames(firstTube);
            const hasSharedUsers =
              firstTube.sharedWithUserIds && firstTube.sharedWithUserIds.length > 0;

            // Determine styling based on lock ownership/access
            const containerClass = isOwnLock
              ? 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-400'
              : isLockedOut
                ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-300'
                : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-400';

            const headerClass = isOwnLock
              ? 'text-slate-700'
              : isLockedOut
                ? 'text-red-600'
                : 'text-amber-600';

            const headerText = isOwnLock ? 'Locked by You' : `Locked by ${ownerName}`;

            return (
              <div className={`rounded-lg px-2 py-2 border-2 shadow-md ${containerClass}`}>
                <div
                  className={`font-bold uppercase tracking-wider text-xs flex items-center gap-1 ${headerClass}`}
                >
                  <Lock className="w-3 h-3" />
                  {headerText}
                </div>
                <div className="border-t border-current/20 my-1.5"></div>
                <div className="space-y-1 text-xs">
                  {/* Lock Note */}
                  {firstTube.lockNote && (
                    <div className="flex items-start gap-1 text-odysseus-dark">
                      <Notebook className="w-3 h-3 text-odysseus-muted mt-0.5" />
                      <div>
                        <span className="text-odysseus-muted">Note: </span>
                        <span className="italic">&quot;{firstTube.lockNote}&quot;</span>
                      </div>
                    </div>
                  )}

                  {/* Shared Users */}
                  {hasSharedUsers && (
                    <div className="flex items-start gap-1">
                      <UsersRound className="w-3 h-3 text-odysseus-muted mt-0.5" />
                      <div>
                        <span className="text-odysseus-muted">Shared with: </span>
                        <span className="text-odysseus-dark">
                          {sharedNames.join(', ') ||
                            `${firstTube.sharedWithUserIds!.length} user(s)`}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Access indicator - only show if locked out */}
                  {isLockedOut && (
                    <div className="text-red-500 font-medium mt-1">You cannot edit this tube</div>
                  )}
                </div>
              </div>
            );
          })()}
      </div>
    </div>
  );
}
