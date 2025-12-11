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
      <div className="p-1" style={{ minWidth: '280px' }}>
        <div className="space-y-3">
          {/* Position Header - Subtle background */}
          <div className="bg-slate-50 rounded-md px-3 py-2">
            <div className="flex items-center gap-1.5 text-odysseus-dark/60 text-[10px] uppercase tracking-wider mb-0.5">
              <MapPin className="w-3 h-3" />
              <span>{tankName}</span>
            </div>
            <div className="text-odysseus-dark font-semibold text-sm">
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
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-odysseus-dark/30"
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
            <p className="text-odysseus-dark/40 text-xs">{positionText}</p>
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

  // Lock information for pill badges
  const lockInfo =
    firstTube.isLocked && lockContext
      ? {
          isOwnLock: lockContext.isLockedByCurrentUser(firstTube),
          isLockedOut: lockContext.isLockedOutFrom(firstTube),
          ownerName: lockContext.getLockOwnerName(firstTube) ?? 'Unknown',
          sharedNames: lockContext.getSharedUserNames(firstTube),
          hasSharedUsers: firstTube.sharedWithUserIds && firstTube.sharedWithUserIds.length > 0,
        }
      : null;

  return (
    <div className="p-1" style={{ minWidth: '280px' }}>
      <div className="space-y-3">
        {/* Position Header - Subtle background */}
        <div className="bg-slate-50 rounded-md px-3 py-2">
          <div className="flex items-center gap-1.5 text-odysseus-dark/60 text-[10px] uppercase tracking-wider mb-0.5">
            <MapPin className="w-3 h-3" />
            <span>{tankName}</span>
          </div>
          <div className="text-odysseus-dark font-semibold text-sm">{positionSummary}</div>
          {selectedTubes.length > 1 && (
            <div className="text-odysseus-dark/50 text-xs mt-0.5">
              {selectedTubes.length} tubes selected
              {hasConflicts && <span className="text-amber-500 ml-1">• Values differ</span>}
            </div>
          )}
        </div>

        {/* Lock Status - Pill badges */}
        {lockInfo && (
          <div className="flex flex-wrap gap-1.5">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                lockInfo.isOwnLock
                  ? 'bg-slate-100 text-slate-600'
                  : lockInfo.isLockedOut
                    ? 'bg-red-50 text-red-600'
                    : 'bg-amber-50 text-amber-600'
              }`}
            >
              <Lock className="w-2.5 h-2.5" />
              {lockInfo.isOwnLock ? 'Locked by you' : `Locked by ${lockInfo.ownerName}`}
            </span>
            {firstTube.lockNote && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                <Notebook className="w-2.5 h-2.5" />
                {firstTube.lockNote}
              </span>
            )}
            {lockInfo.hasSharedUsers && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-ice-50 text-edit-hover">
                <UsersRound className="w-2.5 h-2.5" />
                {lockInfo.sharedNames.length > 0
                  ? lockInfo.sharedNames.join(', ')
                  : `${firstTube.sharedWithUserIds!.length} user(s)`}
              </span>
            )}
          </div>
        )}

        {/* Donor Information */}
        <InfoSection title="Donor Information">
          {/* Cell Type - Prominent */}
          {cellType && (
            <div className="text-odysseus-dark font-semibold text-sm mb-1">{cellType}</div>
          )}
          {/* IDs in two columns - stacked layout for consistency */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <FieldValue label="Internal ID" value={donorInternalId} inline={false} />
            <FieldValue label="Source ID" value={donorSourceId} inline={false} />
          </div>
        </InfoSection>

        {/* Sample Information - Only show if at least one field has a value */}
        {hasSampleInfo && (
          <InfoSection title="Sample Information">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <FieldValue label="Condition" value={cultureCondition} inline={false} />
              <FieldValue label="Lot #" value={lotNumber} inline={false} />
              <FieldValue label="Concentration" value={formattedConcentration} inline={false} />
              <FieldValue label="Date" value={formattedDate} inline={false} />
              <FieldValue label="Media" value={mediaType} inline={false} />
              <FieldValue label="Supplements" value={mediaSupplements} inline={false} />
              <FieldValue label="Selection" value={mediaSelection} inline={false} />
              <FieldValue label="Researcher" value={researcherDisplay} inline={false} />
            </div>
          </InfoSection>
        )}

        {/* Notes */}
        {notes && (
          <InfoSection title="Notes">
            <div className="text-odysseus-dark/70 text-xs leading-relaxed">{notes}</div>
          </InfoSection>
        )}
      </div>
    </div>
  );
}
