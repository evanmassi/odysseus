import React, { useMemo, useState, useEffect } from 'react';

import {
  formatConcentrationDisplay,
  formatResearcherDropdownDisplay,
} from '@odysseus/shared-schemas';
import { AlertTriangle, Lock, MapPin, Notebook, Pencil, TestTube, UsersRound } from 'lucide-react';

import { useResearchersQuery } from '@domains/researchers';
import {
  useStorageData,
  useStorageLocationNames,
  formatPositionRangesForBox,
  DEFAULT_GRID_CONFIG,
} from '@domains/storage';
import { useFieldResolverQuery } from '@domains/tubes/hooks';
import { useUserSettings } from '@domains/users';
import { parsePositionKey } from '@shared/types/GridSelection';
import { Chip, Tooltip } from '@shared/ui';
import { formatDateForDisplay } from '@shared/utils/dateUtils';

import { useTubeStore } from '../../../stores/tubeStore';
import { FieldValue } from '../displays/FieldValue';
import { InfoSection } from '../displays/InfoSection';
import { EditLockNoteModal } from '../modals/EditLockNoteModal';

import type { Researcher } from '@odysseus/shared-schemas';
import type { LockContext } from '@shared/types/GridSelection';
import type { TubeData } from '@shared/types/Tube';

const FIELD_PATHS = [
  'sample.cellType',
  'sample.donorInternalId',
  'sample.donorSourceId',
  'sample.cultureCondition',
  'sample.lotNumber',
  'sample.species',
  'sample.source',
  'sample.catalogNumber',
  'sample.passageNumber',
  'sample.mediaType',
  'sample.mediaSupplements',
  'sample.mediaSelection',
  'sample.concentration',
  'sample.concentrationUnit',
  'sample.date',
  'sample.notes',
  'researcherId',
  'createdByName',
] as const;

const SAMPLE_INFO_PATHS = [
  'sample.concentration',
  'sample.mediaType',
  'sample.mediaSupplements',
  'sample.mediaSelection',
  'sample.cultureCondition',
  'sample.lotNumber',
  'sample.passageNumber',
  'sample.date',
  'sample.source',
  'sample.catalogNumber',
  'researcherId',
] as const;

interface TubeInfoPanelProps {
  selectedTubes: TubeData[];
  lockContext?: LockContext;
}

export function TubeInfoPanel({ selectedTubes, lockContext }: TubeInfoPanelProps) {
  const { getTubeValue, analyzeFieldConflicts, tubes } = useFieldResolverQuery();
  const { data: researchers = [] } = useResearchersQuery();
  const { settings: userSettings } = useUserSettings();

  const researcherMap = useMemo(() => {
    const map = new Map<string, Researcher>();
    researchers.forEach(researcher => {
      map.set(researcher.id, researcher);
    });
    return map;
  }, [researchers]);

  const { currentTank, currentRack, currentBox, selectedPositions } = useTubeStore();
  const { currentLab } = useStorageData();

  const [showEditLockNoteModal, setShowEditLockNoteModal] = useState(false);

  const {
    tankName,
    rackName,
    boxName,
    box: currentBoxObj,
  } = useStorageLocationNames(currentTank, currentRack, currentBox);

  const positionSummary = useMemo(() => {
    if (selectedTubes.length === 0) return { positionLabel: '', formattedPositions: '' };

    const firstTube = selectedTubes[0];
    const positions = selectedTubes.map(t => t.location.position);

    const gridConfig = currentBoxObj?.gridConfig ?? DEFAULT_GRID_CONFIG;

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

  const ownedLockedTubes = useMemo(() => {
    if (!lockContext || selectedTubes.length === 0) return [];
    return selectedTubes.filter(tube => tube.isLocked && lockContext.isLockedByCurrentUser(tube));
  }, [selectedTubes, lockContext]);

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

  // Prevents auto-opening when selecting new locked tubes after previous selection was cleared
  useEffect(() => {
    if (showEditLockNoteModal && ownedLockedTubes.length === 0) {
      setShowEditLockNoteModal(false);
    }
  }, [showEditLockNoteModal, ownedLockedTubes.length]);

  if (selectedTubes.length === 0) {
    const positionCount = selectedPositions.size;

    const positions = Array.from(selectedPositions)
      .map(key => {
        const parsed = parsePositionKey(key);
        return parsed.position;
      })
      .sort((a, b) => a - b);

    const gridConfig = currentBoxObj?.gridConfig ?? DEFAULT_GRID_CONFIG;

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
          <div className="bg-muted rounded-md px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs">
              <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <Tooltip content={tankName} side="bottom">
                <span className="text-card-foreground font-medium truncate max-w-24">
                  {tankName}
                </span>
              </Tooltip>
              <span className="text-muted-foreground flex-shrink-0">›</span>
              <Tooltip content={rackName} side="bottom">
                <span className="text-card-foreground font-medium truncate max-w-24">
                  {rackName}
                </span>
              </Tooltip>
              <span className="text-muted-foreground flex-shrink-0">›</span>
              <Tooltip content={boxName} side="bottom">
                <span className="text-card-foreground font-medium truncate max-w-24">
                  {boxName}
                </span>
              </Tooltip>
            </div>
            {formattedPositions && (
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span className="text-muted-foreground text-xs">
                  Position{positionCount > 1 ? 's' : ''}:
                </span>
                <span className="text-card-foreground font-medium text-sm">
                  {formattedPositions}
                </span>
              </div>
            )}
          </div>

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

  const firstTube = selectedTubes[0];

  const isFieldMixed = (path: string): boolean => {
    return fieldAnalysis.mixedFields.has(path);
  };

  const getDisplayValue = (path: string): string | number | null | undefined => {
    return fieldAnalysis.values[path];
  };

  const cellType = getDisplayValue('sample.cellType');
  const donorInternalId = getDisplayValue('sample.donorInternalId');
  const donorSourceId = getDisplayValue('sample.donorSourceId');
  const cultureCondition = getDisplayValue('sample.cultureCondition');
  const lotNumber = getDisplayValue('sample.lotNumber');
  const mediaType = getDisplayValue('sample.mediaType');
  const mediaSupplements = getDisplayValue('sample.mediaSupplements');
  const mediaSelection = getDisplayValue('sample.mediaSelection');
  const species = getDisplayValue('sample.species');
  const source = getDisplayValue('sample.source');
  const catalogNumber = getDisplayValue('sample.catalogNumber');
  const passageNumber = getDisplayValue('sample.passageNumber');
  const concentration = getDisplayValue('sample.concentration');
  const concentrationUnit = getDisplayValue('sample.concentrationUnit');
  const date = getDisplayValue('sample.date');
  const researcherId = getDisplayValue('researcherId');
  const createdByName = getDisplayValue('createdByName');
  const notes = getDisplayValue('sample.notes');

  const formattedConcentration =
    concentration !== undefined
      ? formatConcentrationDisplay(
          concentration as number,
          concentrationUnit as 'c/v' | 'c/mL' | undefined
        )
      : undefined;
  const formattedDate = date ? formatDateForDisplay(date as string | Date) : undefined;

  // Fall back to historical createdByName if researcher was deleted
  const researcherDisplay = (() => {
    if (researcherId && researcherMap.has(researcherId as string)) {
      return formatResearcherDropdownDisplay(researcherMap.get(researcherId as string)!);
    }
    return (createdByName as string | undefined) ?? undefined;
  })();

  const hasConflicts = tubes.hasAnyConflicts(selectedTubes, [
    'sample.cellType',
    'sample.donorInternalId',
    'sample.donorSourceId',
    'sample.cultureCondition',
    'sample.lotNumber',
    'sample.species',
    'sample.source',
    'sample.catalogNumber',
    'sample.passageNumber',
    'sample.mediaType',
    'sample.mediaSupplements',
    'sample.mediaSelection',
    'sample.concentration',
    'sample.concentrationUnit',
    'sample.date',
    'researcherId',
    'sample.notes',
  ]);

  const hasSampleInfo =
    cultureCondition !== undefined ||
    lotNumber !== undefined ||
    source !== undefined ||
    catalogNumber !== undefined ||
    passageNumber !== undefined ||
    mediaType !== undefined ||
    mediaSupplements !== undefined ||
    mediaSelection !== undefined ||
    formattedConcentration !== undefined ||
    formattedDate !== undefined ||
    researcherDisplay !== undefined ||
    SAMPLE_INFO_PATHS.some(path => fieldAnalysis.mixedFields.has(path));

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
        <div className="bg-muted rounded-md px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs">
            <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <Tooltip content={tankName} side="bottom">
              <span className="text-card-foreground font-medium truncate max-w-24">{tankName}</span>
            </Tooltip>
            <span className="text-muted-foreground flex-shrink-0">›</span>
            <Tooltip content={rackName} side="bottom">
              <span className="text-card-foreground font-medium truncate max-w-24">{rackName}</span>
            </Tooltip>
            <span className="text-muted-foreground flex-shrink-0">›</span>
            <Tooltip content={boxName} side="bottom">
              <span className="text-card-foreground font-medium truncate max-w-24">{boxName}</span>
            </Tooltip>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-muted-foreground text-xs">{positionSummary.positionLabel}:</span>
            <span className="text-card-foreground font-medium text-sm">
              {positionSummary.formattedPositions}
            </span>
          </div>
          {selectedTubes.length > 1 && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
              <Chip size="sm" color="info" leftIcon={<TestTube />}>
                {selectedTubes.length} selected
              </Chip>
              {hasConflicts && (
                <Chip size="sm" color="warning" leftIcon={<AlertTriangle />}>
                  Mixed values
                </Chip>
              )}
            </div>
          )}
        </div>

        {lockInfo && (
          <div className="flex flex-wrap gap-1.5">
            <Chip
              size="sm"
              color={lockInfo.isOwnLock ? 'default' : lockInfo.isLockedOut ? 'danger' : 'info'}
              leftIcon={<Lock />}
            >
              {lockInfo.isOwnLock ? 'Locked by you' : `Locked by ${lockInfo.ownerName}`}
            </Chip>
            {ownedLockedTubes.length > 0 ? (
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
                  onFocus={e => {
                    if (!e.currentTarget.matches(':focus-visible')) {
                      e.currentTarget.blur();
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-secondary-foreground hover:bg-accent transition-colors cursor-pointer"
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
              firstTube.lockNote && (
                <Chip
                  size="sm"
                  color={lockInfo.isLockedOut ? 'danger' : 'info'}
                  leftIcon={<Notebook />}
                >
                  {firstTube.lockNote}
                </Chip>
              )
            )}
            {lockInfo.hasSharedUsers && (
              <Chip size="sm" color="info" leftIcon={<UsersRound />}>
                {lockInfo.sharedNames.length > 0
                  ? lockInfo.sharedNames.join(', ')
                  : `${firstTube.sharedWithUserIds!.length} user(s)`}
              </Chip>
            )}
          </div>
        )}

        <InfoSection title="Donor Information">
          <div className="flex items-baseline gap-1.5 -mt-0.5 mb-2">
            {cellType ? (
              <span className="text-card-foreground font-semibold text-sm">{cellType}</span>
            ) : isFieldMixed('sample.cellType') ? (
              <span className="flex items-center gap-1 text-card-foreground/30 text-sm">
                —
                <AlertTriangle className="w-3 h-3 text-warning-text" />
              </span>
            ) : null}
            {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR: empty string should fall through to mixed check */}
            {(cellType || isFieldMixed('sample.cellType')) &&
              // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR: empty string should fall through to mixed check
              (species || isFieldMixed('sample.species')) && (
                <span className="text-card-foreground/30">·</span>
              )}
            {species ? (
              <Chip size="sm">{species}</Chip>
            ) : isFieldMixed('sample.species') ? (
              <span className="flex items-center gap-1 text-card-foreground/30 text-sm">
                —
                <AlertTriangle className="w-3 h-3 text-warning-text" />
              </span>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
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

        {hasSampleInfo && (
          <InfoSection title="Sample Information">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              <FieldValue
                label="Concentration"
                value={formattedConcentration}
                inline={false}
                isMixed={isFieldMixed('sample.concentration')}
              />
              <FieldValue
                label="Condition"
                value={cultureCondition}
                inline={false}
                isMixed={isFieldMixed('sample.cultureCondition')}
              />
              <FieldValue
                label="Passage #"
                value={passageNumber}
                inline={false}
                isMixed={isFieldMixed('sample.passageNumber')}
              />
              <FieldValue
                label="Media"
                value={mediaType}
                inline={false}
                isMixed={isFieldMixed('sample.mediaType')}
              />
              <FieldValue
                label="Supplements"
                value={mediaSupplements}
                inline={false}
                isMixed={isFieldMixed('sample.mediaSupplements')}
              />
              <FieldValue
                label="Selection"
                value={mediaSelection}
                inline={false}
                isMixed={isFieldMixed('sample.mediaSelection')}
              />
              <FieldValue
                label="Source"
                value={source}
                inline={false}
                isMixed={isFieldMixed('sample.source')}
              />
              <FieldValue
                label="Catalog #"
                value={catalogNumber}
                inline={false}
                isMixed={isFieldMixed('sample.catalogNumber')}
              />
              <FieldValue
                label="Lot #"
                value={lotNumber}
                inline={false}
                isMixed={isFieldMixed('sample.lotNumber')}
              />
              <FieldValue
                label="Date"
                value={formattedDate}
                inline={false}
                isMixed={isFieldMixed('sample.date')}
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

        {(Boolean(notes) || isFieldMixed('sample.notes')) && (
          <InfoSection title="Notes">
            {notes ? (
              <div className="-mt-0.5 text-card-foreground/85 text-sm leading-relaxed">{notes}</div>
            ) : (
              <div className="-mt-0.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-warning-text" />
                <span className="text-card-foreground/30 text-sm">—</span>
              </div>
            )}
          </InfoSection>
        )}
      </div>

      <EditLockNoteModal
        isOpen={showEditLockNoteModal && ownedLockedTubes.length > 0}
        tubes={ownedLockedTubes}
        onClose={() => setShowEditLockNoteModal(false)}
      />
    </div>
  );
}
