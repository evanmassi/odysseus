import React, { useMemo } from 'react';

import {
  formatConcentrationDisplay,
  formatResearcherDropdownDisplay,
  EQUIPMENT_DEFAULTS,
} from '@odysseus/shared-schemas';
import { AlertTriangle, Lock, MapPin, Notebook, TestTube, UsersRound } from 'lucide-react';

import { useFieldResolverQuery } from '@app/hooks';
import { useUserSettings } from '@domains/authentication';
import { useResearchersQuery } from '@domains/researchers';
import {
  useStorageData,
  useLocationDisplayNames,
  formatPositionRangesForBox,
} from '@domains/storage';
import { parsePositionKey } from '@shared/types/grid';
import { formatDateForDisplay } from '@shared/utils/dateFormatter';

import { useTubeStore } from '../../../stores/tubeStore';
import { FieldValue } from '../displays/FieldValue';
import { InfoSection } from '../displays/InfoSection';

import type { Researcher } from '@odysseus/shared-schemas';
import type { LockContext } from '@shared/types/grid';
import type { TubeData } from '@shared/types/tubeTypes';

// All field paths for conflict analysis
const FIELD_PATHS = [
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
  'sample.notes',
  'researcherId',
  'createdByName',
] as const;

// Sample info field paths for checking section visibility
const SAMPLE_INFO_PATHS = [
  'sample.cultureCondition',
  'sample.lotNumber',
  'sample.media.type',
  'sample.media.supplements',
  'sample.media.selection',
  'sample.concentration',
  'sample.date',
  'researcherId',
] as const;

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
  const { currentLab } = useStorageData();

  // Single source of truth for location display names (includes customLabels)
  const {
    tankName,
    rackName,
    boxName,
    box: currentBoxObj,
  } = useLocationDisplayNames(currentTank, currentRack, currentBox);

  // Format position summary with flexible display
  // IMPORTANT: Must be before early return to comply with Rules of Hooks
  const positionSummary = useMemo(() => {
    if (selectedTubes.length === 0) return { positionLabel: '', formattedPositions: '' };

    const firstTube = selectedTubes[0];
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
    return { positionLabel, formattedPositions };
  }, [selectedTubes, currentBoxObj, currentLab, userSettings]);

  // Memoized field analysis - compute all conflicts and values once
  // IMPORTANT: Must be before early return to comply with Rules of Hooks
  const fieldAnalysis = useMemo(() => {
    if (selectedTubes.length === 0) {
      return { mixedFields: new Set<string>(), values: {} };
    }

    const firstTube = selectedTubes[0];
    const mixedFields = new Set<string>();
    const values: Record<string, string | number | null | undefined> = {};

    for (const path of FIELD_PATHS) {
      if (selectedTubes.length === 1) {
        values[path] = getTubeValue(firstTube, path);
      } else {
        const analysis = analyzeFieldConflicts(selectedTubes, path);
        if (analysis.hasConflict) {
          mixedFields.add(path);
          values[path] = undefined;
        } else {
          // Type guard: Filter out non-display types
          const value = analysis.commonValue;
          if (
            typeof value === 'string' ||
            typeof value === 'number' ||
            value === null ||
            value === undefined
          ) {
            values[path] = value;
          } else {
            values[path] = undefined;
          }
        }
      }
    }

    return { mixedFields, values };
  }, [selectedTubes, getTubeValue, analyzeFieldConflicts]);

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
        <div className="space-y-3">
          {/* Position Header - Vertical stack layout */}
          <div className="bg-slate-50 rounded-md px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-odysseus-dark/60 text-xs uppercase tracking-wider mb-2">
              <MapPin className="w-3 h-3" />
              <span>{tankName}</span>
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <span className="text-slate-400 text-xs">Rack</span>
              <span className="text-odysseus-dark font-medium text-sm">{rackName}</span>
              <span className="text-slate-400 text-xs">Box</span>
              <span className="text-odysseus-dark font-medium text-sm">{boxName}</span>
              {formattedPositions && (
                <>
                  <span className="text-slate-400 text-xs">
                    Position{positionCount > 1 ? 's' : ''}
                  </span>
                  <span className="text-odysseus-dark font-medium text-sm">
                    {formattedPositions}
                  </span>
                </>
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
            <p className="text-odysseus-dark/40 text-sm">{positionText}</p>
          </div>
        </div>
      </div>
    );
  }

  // Get first tube for display (or common values if multiple selected)
  const firstTube = selectedTubes[0];

  // Helper to check if a field has conflicting values
  const isFieldMixed = (path: string): boolean => {
    return fieldAnalysis.mixedFields.has(path);
  };

  // Helper to get display value for a field
  const getDisplayValue = (path: string): string | number | null | undefined => {
    return fieldAnalysis.values[path];
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

  // Check if any sample information fields have values or are mixed
  const hasSampleInfo =
    cultureCondition !== undefined ||
    lotNumber !== undefined ||
    mediaType !== undefined ||
    mediaSupplements !== undefined ||
    mediaSelection !== undefined ||
    formattedConcentration !== undefined ||
    formattedDate !== undefined ||
    researcherDisplay !== undefined ||
    SAMPLE_INFO_PATHS.some(path => fieldAnalysis.mixedFields.has(path));

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
    <div style={{ minWidth: '280px' }}>
      <div className="space-y-3">
        {/* Position Header - Vertical stack layout */}
        <div className="bg-slate-50 rounded-md px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-odysseus-dark/60 text-xs uppercase tracking-wider mb-2">
            <MapPin className="w-3 h-3" />
            <span>{tankName}</span>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <span className="text-slate-400 text-xs">Rack</span>
            <span className="text-odysseus-dark font-medium text-sm">{rackName}</span>
            <span className="text-slate-400 text-xs">Box</span>
            <span className="text-odysseus-dark font-medium text-sm">{boxName}</span>
            <span className="text-slate-400 text-xs">{positionSummary.positionLabel}</span>
            <span className="text-odysseus-dark font-medium text-sm">
              {positionSummary.formattedPositions}
            </span>
          </div>
          {selectedTubes.length > 1 && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                <TestTube className="w-2.5 h-2.5" />
                {selectedTubes.length} selected
              </span>
              {hasConflicts && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-xs font-medium">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Mixed values
                </span>
              )}
            </div>
          )}
        </div>

        {/* Lock Status - Pill badges */}
        {lockInfo && (
          <div className="flex flex-wrap gap-1.5">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
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
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                <Notebook className="w-2.5 h-2.5" />
                {firstTube.lockNote}
              </span>
            )}
            {lockInfo.hasSharedUsers && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-ice-50 text-edit-hover">
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
          {cellType ? (
            <div className="text-odysseus-dark font-semibold text-sm mb-1">{cellType}</div>
          ) : isFieldMixed('sample.cellType') ? (
            <div className="mb-1">
              <div className="flex items-center gap-1 text-odysseus-dark/50 text-xs">
                Cell Type
                <AlertTriangle className="w-3 h-3 text-amber-500" />
              </div>
              <div className="text-odysseus-dark/30 text-sm">—</div>
            </div>
          ) : null}
          {/* IDs in two columns - stacked layout for consistency */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <FieldValue
              label="Internal ID"
              value={donorInternalId}
              inline={false}
              isMixed={isFieldMixed('sample.donorInternalId')}
            />
            <FieldValue
              label="Source ID"
              value={donorSourceId}
              inline={false}
              isMixed={isFieldMixed('sample.donorSourceId')}
            />
          </div>
        </InfoSection>

        {/* Sample Information - Only show if at least one field has a value */}
        {hasSampleInfo && (
          <InfoSection title="Sample Information">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <FieldValue
                label="Condition"
                value={cultureCondition}
                inline={false}
                isMixed={isFieldMixed('sample.cultureCondition')}
              />
              <FieldValue
                label="Lot #"
                value={lotNumber}
                inline={false}
                isMixed={isFieldMixed('sample.lotNumber')}
              />
              <FieldValue
                label="Concentration"
                value={formattedConcentration}
                inline={false}
                isMixed={isFieldMixed('sample.concentration')}
              />
              <FieldValue
                label="Date"
                value={formattedDate}
                inline={false}
                isMixed={isFieldMixed('sample.date')}
              />
              <FieldValue
                label="Media"
                value={mediaType}
                inline={false}
                isMixed={isFieldMixed('sample.media.type')}
              />
              <FieldValue
                label="Supplements"
                value={mediaSupplements}
                inline={false}
                isMixed={isFieldMixed('sample.media.supplements')}
              />
              <FieldValue
                label="Selection"
                value={mediaSelection}
                inline={false}
                isMixed={isFieldMixed('sample.media.selection')}
              />
              <FieldValue
                label="Researcher"
                value={researcherDisplay}
                inline={false}
                isMixed={isFieldMixed('researcherId')}
              />
            </div>
          </InfoSection>
        )}

        {/* Notes */}
        {(Boolean(notes) || isFieldMixed('sample.notes')) && (
          <InfoSection title="Notes">
            {notes ? (
              <div className="text-odysseus-dark/70 text-sm leading-relaxed">{notes}</div>
            ) : (
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span className="text-odysseus-dark/30 text-sm">—</span>
              </div>
            )}
          </InfoSection>
        )}
      </div>
    </div>
  );
}
