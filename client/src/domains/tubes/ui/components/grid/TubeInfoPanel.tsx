import React, { useMemo, useState, useEffect } from 'react';

import {
  formatConcentrationDisplay,
  formatResearcherDropdownDisplay,
  EQUIPMENT_DEFAULTS,
} from '@odysseus/shared-schemas';
import { AlertTriangle, Lock, MapPin, Notebook, Pencil, TestTube, UsersRound } from 'lucide-react';

import { useFieldResolverQuery } from '@app/hooks';
import { useUserSettings } from '@domains/authentication';
import { useResearchersQuery } from '@domains/researchers';
import {
  useStorageData,
  useLocationDisplayNames,
  formatPositionRangesForBox,
} from '@domains/storage';
import { parsePositionKey } from '@shared/types/GridSelection';
import { Tooltip } from '@shared/ui';
import { formatDateForDisplay } from '@shared/utils/dateUtils';

import { useTubeStore } from '../../../stores/tubeStore';
import { FieldValue } from '../displays/FieldValue';
import { InfoSection } from '../displays/InfoSection';
import { EditLockNoteModal } from '../modals/EditLockNoteModal';

import type { Researcher } from '@odysseus/shared-schemas';
import type { LockContext } from '@shared/types/GridSelection';
import type { TubeData } from '@shared/types/Tube';

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

  // Modal state for editing lock notes
  const [showEditLockNoteModal, setShowEditLockNoteModal] = useState(false);

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

  // For multi-tube editing: find all tubes where user owns the lock
  // Must be before early return to comply with Rules of Hooks
  const ownedLockedTubes = useMemo(() => {
    if (!lockContext || selectedTubes.length === 0) return [];
    return selectedTubes.filter(tube => tube.isLocked && lockContext.isLockedByCurrentUser(tube));
  }, [selectedTubes, lockContext]);

  // Check if all selected tubes have the same lock note (for display)
  const lockNoteDisplay = useMemo(() => {
    if (ownedLockedTubes.length === 0) return null;
    if (ownedLockedTubes.length === 1) {
      return { note: ownedLockedTubes[0].lockNote, isMixed: false };
    }
    const firstNote = ownedLockedTubes[0].lockNote ?? '';
    const allSame = ownedLockedTubes.every(t => (t.lockNote ?? '') === firstNote);
    return {
      note: allSame ? firstNote : undefined,
      isMixed: !allSame,
    };
  }, [ownedLockedTubes]);

  // Reset modal state when underlying data becomes invalid
  // This prevents "auto-opening" when selecting new locked tubes after the modal
  // was closed due to selection change (ownedLockedTubes became empty)
  useEffect(() => {
    if (showEditLockNoteModal && ownedLockedTubes.length === 0) {
      setShowEditLockNoteModal(false);
    }
  }, [showEditLockNoteModal, ownedLockedTubes.length]);

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
          <div className="bg-muted rounded-md px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-card-foreground/60 text-xs tracking-wider mb-2">
              <MapPin className="w-3 h-3" />
              <span>{tankName}</span>
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <span className="text-muted-foreground text-xs">Rack</span>
              <span className="text-card-foreground font-medium text-sm">{rackName}</span>
              <span className="text-muted-foreground text-xs">Box</span>
              <span className="text-card-foreground font-medium text-sm">{boxName}</span>
              {formattedPositions && (
                <>
                  <span className="text-muted-foreground text-xs">
                    Position{positionCount > 1 ? 's' : ''}
                  </span>
                  <span className="text-card-foreground font-medium text-sm">
                    {formattedPositions}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Placeholder Message */}
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
              <TestTube className="w-6 h-6 text-card-foreground/30" />
            </div>
            <p className="text-card-foreground/40 text-sm">{positionText}</p>
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
        <div className="bg-muted rounded-md px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-card-foreground/60 text-xs tracking-wider mb-2">
            <MapPin className="w-3 h-3" />
            <span>{tankName}</span>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <span className="text-muted-foreground text-xs">Rack</span>
            <span className="text-card-foreground font-medium text-sm">{rackName}</span>
            <span className="text-muted-foreground text-xs">Box</span>
            <span className="text-card-foreground font-medium text-sm">{boxName}</span>
            <span className="text-muted-foreground text-xs">{positionSummary.positionLabel}</span>
            <span className="text-card-foreground font-medium text-sm">
              {positionSummary.formattedPositions}
            </span>
          </div>
          {selectedTubes.length > 1 && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-secondary-foreground bg-muted px-2 py-0.5 rounded-full">
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
                  ? 'bg-muted text-secondary-foreground'
                  : lockInfo.isLockedOut
                    ? 'bg-red-50 text-red-600'
                    : 'bg-amber-50 text-amber-600'
              }`}
            >
              <Lock className="w-2.5 h-2.5" />
              {lockInfo.isOwnLock ? 'Locked by you' : `Locked by ${lockInfo.ownerName}`}
            </span>
            {ownedLockedTubes.length > 0 ? (
              // Clickable pill for lock owner(s) - can edit note
              <Tooltip
                content={
                  lockNoteDisplay?.isMixed
                    ? 'Edit lock notes'
                    : lockNoteDisplay?.note
                      ? 'Edit lock note'
                      : 'Add lock note'
                }
                side="bottom"
              >
                <button
                  type="button"
                  onClick={() => setShowEditLockNoteModal(true)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-secondary-foreground hover:bg-accent transition-colors cursor-pointer focus-ring-default"
                >
                  {lockNoteDisplay?.isMixed ? (
                    <>
                      <Notebook className="w-2.5 h-2.5" />
                      <span className="italic">Mixed notes</span>
                      <Pencil className="w-2.5 h-2.5 ml-0.5 opacity-60" />
                    </>
                  ) : lockNoteDisplay?.note ? (
                    <>
                      <Notebook className="w-2.5 h-2.5" />
                      {lockNoteDisplay.note}
                      <Pencil className="w-2.5 h-2.5 ml-0.5 opacity-60" />
                    </>
                  ) : (
                    <>
                      <Pencil className="w-2.5 h-2.5" />
                      Add note
                    </>
                  )}
                </button>
              </Tooltip>
            ) : (
              // Non-clickable pill for non-owners - read-only
              firstTube.lockNote && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-secondary-foreground">
                  <Notebook className="w-2.5 h-2.5" />
                  {firstTube.lockNote}
                </span>
              )
            )}
            {lockInfo.hasSharedUsers && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-info-light text-info-text">
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
            <div className="text-card-foreground font-semibold text-sm mb-1">{cellType}</div>
          ) : isFieldMixed('sample.cellType') ? (
            <div className="mb-1">
              <div className="flex items-center gap-1 text-card-foreground/50 text-xs">
                Cell Type
                <AlertTriangle className="w-3 h-3 text-amber-500" />
              </div>
              <div className="text-card-foreground/30 text-sm">—</div>
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
              <div className="text-card-foreground/70 text-sm leading-relaxed">{notes}</div>
            ) : (
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span className="text-card-foreground/30 text-sm">—</span>
              </div>
            )}
          </InfoSection>
        )}
      </div>

      {/* Edit Lock Note Modal */}
      <EditLockNoteModal
        isOpen={showEditLockNoteModal && ownedLockedTubes.length > 0}
        tubes={ownedLockedTubes}
        onClose={() => setShowEditLockNoteModal(false)}
      />
    </div>
  );
}
