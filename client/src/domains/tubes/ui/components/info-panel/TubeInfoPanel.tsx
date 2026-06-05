/**
 * Tube Info Panel
 *
 * Read-only detail panel for one or more selected tubes with conflict indicators.
 */

import { useMemo, useState, useEffect, type ReactNode } from 'react';

import {
  formatConcentrationDisplay,
  formatResearcherDropdownDisplay,
} from '@odysseus/shared-schemas';
import {
  AlertTriangle,
  Lock,
  Notebook,
  NotepadText,
  SquarePen,
  TestTubeDiagonal,
  UsersRound,
} from 'lucide-react';

import { useModalStore } from '@app/stores/modalStore';
import { useDonorRegistryStore } from '@domains/donors/stores/donorRegistryStore';
import { useResearchersQuery } from '@domains/researchers';
import {
  useStorageData,
  useStorageLocationNames,
  formatPositionRangesForBox,
  DEFAULT_GRID_CONFIG,
} from '@domains/storage';
import { useTubeFieldResolver } from '@domains/tubes/hooks';
import { useUserSettings } from '@domains/users';
import { Button, Chip, PanelHeader, SectionHeader, Tooltip } from '@shared/ui';
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { formatDateForDisplay } from '@shared/utils/dateFormatters';

import { useTubeStore } from '../../../stores/tubeStore';
import { parsePositionKey } from '../../../types/gridSelectionTypes';
import { getTubeColor } from '../../../utils/tubeColorCoding';
import { TubeLockNoteModal } from '../locking/TubeLockNoteModal';

import { TubeLocationDisplay } from './TubeLocationDisplay';

import type { LockContext } from '../../../types/gridSelectionTypes';
import type { Researcher, TubeData } from '@odysseus/shared-schemas';

/** Mono-uppercase field label, matching the tube editor form. */
const FIELD_LABEL = 'font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground';

// Row hover mirrors the data Table's row glow: primary directional wash, leading stripe, soft bloom.
// Shares the same --alpha-hover-* tokens so it reads identically to table-row hover.
const ROW_HOVER =
  'hover:[background-image:linear-gradient(90deg,hsl(var(--primary)/var(--alpha-hover-wash-1))_0%,hsl(var(--primary)/var(--alpha-hover-wash-2))_18%,hsl(var(--primary)/var(--alpha-hover-wash-3))_48%,hsl(var(--primary)/var(--alpha-hover-wash-4))_78%,hsl(var(--primary)/0)_100%)] hover:shadow-[inset_3px_0_0_0_hsl(var(--primary)/var(--alpha-hover-stripe)),inset_14px_0_36px_-10px_hsl(var(--primary)/var(--alpha-hover-edge)),inset_0_1px_0_hsl(var(--primary)/var(--alpha-hover-rim)),inset_0_-1px_0_hsl(var(--primary)/var(--alpha-hover-rim)),inset_0_10px_16px_-8px_hsl(var(--primary)/var(--alpha-hover-bloom-edge)),inset_0_-10px_16px_-8px_hsl(var(--primary)/var(--alpha-hover-bloom-edge)),0_0_22px_-4px_hsl(var(--primary)/var(--alpha-hover-bloom)),0_0_50px_4px_hsl(var(--primary)/var(--alpha-hover-bloom-far))]';

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

/** Single-column detail row: mono label left, value right, hairline divider. */
function DetailRow({
  label,
  value,
  isMixed = false,
  children,
}: {
  label: string;
  value?: string | number | null;
  isMixed?: boolean;
  children?: ReactNode;
}) {
  const isEmpty = !children && !value && value !== 0 && !isMixed;
  if (isEmpty) return null;

  return (
    <div
      className={`group -mx-4 flex items-baseline justify-between gap-3 border-b border-line-faint px-4 py-2 transition-[color,box-shadow] duration-150 last:border-b-0 ${ROW_HOVER}`}
    >
      <span
        className={`flex items-center gap-1 whitespace-nowrap transition-colors group-hover:text-foreground/70 group-hover:[text-shadow:0_0_5px_color-mix(in_srgb,currentColor_30%,transparent)] ${FIELD_LABEL}`}
      >
        {label}
        {isMixed && <AlertTriangle className="h-3 w-3 text-warning-text" />}
      </span>
      {isMixed ? (
        <span className="text-sm text-card-foreground/30">—</span>
      ) : children ? (
        <span className="min-w-0 text-right">{children}</span>
      ) : (
        <span className="min-w-0 break-words text-right text-sm font-medium text-card-foreground transition-[text-shadow] duration-150 group-hover:[text-shadow:0_0_5px_color-mix(in_srgb,currentColor_30%,transparent)]">
          {value}
        </span>
      )}
    </div>
  );
}

interface TubeInfoPanelProps {
  selectedTubes: TubeData[];
  lockContext?: LockContext;
}

export function TubeInfoPanel({ selectedTubes, lockContext }: TubeInfoPanelProps) {
  const { getTubeValue, analyzeFieldConflicts, hasAnyConflicts } = useTubeFieldResolver();
  const { data: researchers = [] } = useResearchersQuery();
  const openDonorRegistry = useDonorRegistryStore(s => s.open);
  const showTubeEditorModal = useModalStore(s => s.showTubeEditorModal);
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

  // Lit chassis mirroring the tube editor modal: header, locator strip, scroll body, footer.
  const renderPanel = (
    position: { word: string; value: string },
    body: ReactNode,
    footer?: ReactNode
  ) => (
    <ConsolePanel intensity="soft" className="flex h-full min-h-0 flex-col">
      <div className="flex-shrink-0 border-b border-line-faint px-4 py-3">
        <PanelHeader icon={<NotepadText className="h-4 w-4" />} title="Tube Information" />
      </div>

      <div className="relative flex-shrink-0 border-b border-line-faint bg-black/35 px-4 py-2.5">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-foreground/[0.05]"
        />
        <div className="space-y-2">
          <TubeLocationDisplay
            variant="strip"
            tankName={tankName}
            rackName={rackName}
            boxName={boxName}
            positionLabel=""
          />
          {position.value && (
            <div className="flex items-baseline gap-2">
              <span className="flex items-center gap-2 whitespace-nowrap font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground">
                <span
                  aria-hidden
                  className="h-2.5 w-0.5 bg-warning-bg/80 shadow-[0_0_6px_hsl(var(--color-warning-bg)/0.55)]"
                />
                {position.word}
              </span>
              <span className="break-all font-mono text-[11px] tracking-[0.06em] text-foreground">
                {position.value}
              </span>
            </div>
          )}
        </div>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-primary/30 shadow-[0_0_8px_hsl(var(--primary)/0.45)]"
        />
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">{body}</div>
      </ScrollArea>

      {footer}
    </ConsolePanel>
  );

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
        : 'Select a tube to view details';

    return renderPanel(
      { word: positionCount > 1 ? 'Positions' : 'Position', value: formattedPositions },
      <div className="py-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <TestTubeDiagonal className="h-6 w-6 text-card-foreground/30" />
        </div>
        <p className="text-sm text-card-foreground/40">{positionText}</p>
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
    return createdByName as string | undefined;
  })();

  // createdByName is a historical fallback, not a tube field — exclude from conflict detection
  const conflictPaths = FIELD_PATHS.filter(p => p !== 'createdByName');
  const hasConflicts = hasAnyConflicts(selectedTubes, [...conflictPaths]);

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

  const swatch = getTubeColor(firstTube);

  const speciesTag = species ? (
    <Chip size="sm">{species}</Chip>
  ) : isFieldMixed('sample.species') ? (
    <span className="flex items-center gap-1 text-sm text-card-foreground/30">
      —
      <AlertTriangle className="h-3 w-3 text-warning-text" />
    </span>
  ) : null;

  const body = (
    <>
      <div className="flex items-center gap-3 border-b border-line-faint pb-4">
        <div
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center border"
          style={{ background: swatch.backgroundColor, borderColor: swatch.borderColor }}
        >
          <TestTubeDiagonal className="h-5 w-5" style={{ color: swatch.textColor }} />
        </div>
        <div className="min-w-0 flex-1">
          {speciesTag && (
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">{speciesTag}</div>
          )}
          {cellType ? (
            <div className="truncate text-lg font-semibold leading-tight text-foreground">
              {cellType}
            </div>
          ) : isFieldMixed('sample.cellType') ? (
            <div className="flex items-center gap-1 text-sm text-card-foreground/30">
              —
              <AlertTriangle className="h-3 w-3 text-warning-text" />
            </div>
          ) : (
            <div className="text-sm text-card-foreground/40">Unknown</div>
          )}
        </div>
      </div>

      {selectedTubes.length > 1 && (
        <div className="flex items-center gap-2">
          <Chip size="sm" color="info" leftIcon={<TestTubeDiagonal />}>
            {selectedTubes.length} selected
          </Chip>
          {hasConflicts && (
            <Chip size="sm" color="warning">
              Mixed values
            </Chip>
          )}
        </div>
      )}

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
              <Chip
                size="sm"
                behavior="action"
                onClick={() => setShowEditLockNoteModal(true)}
                onFocus={e => {
                  if (!e.currentTarget.matches(':focus-visible')) {
                    e.currentTarget.blur();
                  }
                }}
                lead={
                  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR: false isMixed should fall through to note check
                  lockNoteDisplay?.isMixed || lockNoteDisplay?.note ? <Notebook /> : <SquarePen />
                }
                labelClassName={
                  lockNoteDisplay?.isMixed
                    ? 'italic'
                    : lockNoteDisplay?.note
                      ? 'normal-case tracking-[0.02em] opacity-100'
                      : undefined
                }
              >
                {lockNoteDisplay?.isMixed ? (
                  <>
                    Mixed notes
                    <SquarePen className="w-2.5 h-2.5 ml-1.5 opacity-60" />
                  </>
                ) : lockNoteDisplay?.note ? (
                  <>
                    {lockNoteDisplay.note}
                    <SquarePen className="w-2.5 h-2.5 ml-1.5 opacity-60" />
                  </>
                ) : (
                  'Add note'
                )}
              </Chip>
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

      <div>
        <SectionHeader title="Donor information" size="sm" />
        <div>
          {donorInternalId && !isFieldMixed('sample.donorInternalId') ? (
            <DetailRow label="Internal ID">
              <button
                type="button"
                onClick={() => openDonorRegistry(donorInternalId as string, 'internal')}
                className="cursor-pointer break-all text-right text-sm font-medium text-card-foreground hover:text-primary hover:underline"
              >
                {donorInternalId}
              </button>
            </DetailRow>
          ) : (
            <DetailRow
              label="Internal ID"
              value={donorInternalId}
              isMixed={isFieldMixed('sample.donorInternalId')}
            />
          )}
          {donorSourceId && !isFieldMixed('sample.donorSourceId') ? (
            <DetailRow label="Source ID">
              <button
                type="button"
                onClick={() => openDonorRegistry(donorSourceId as string, 'source')}
                className="cursor-pointer break-all text-right text-sm font-medium text-card-foreground hover:text-primary hover:underline"
              >
                {donorSourceId}
              </button>
            </DetailRow>
          ) : (
            <DetailRow
              label="Source ID"
              value={donorSourceId}
              isMixed={isFieldMixed('sample.donorSourceId')}
            />
          )}
        </div>
      </div>

      {hasSampleInfo && (
        <div>
          <SectionHeader title="Sample information" size="sm" />
          <div>
            <DetailRow
              label="Concentration"
              value={formattedConcentration}
              isMixed={isFieldMixed('sample.concentration')}
            />
            <DetailRow
              label="Condition"
              value={cultureCondition}
              isMixed={isFieldMixed('sample.cultureCondition')}
            />
            <DetailRow
              label="Passage #"
              value={passageNumber}
              isMixed={isFieldMixed('sample.passageNumber')}
            />
            <DetailRow label="Media" value={mediaType} isMixed={isFieldMixed('sample.mediaType')} />
            <DetailRow
              label="Supplements"
              value={mediaSupplements}
              isMixed={isFieldMixed('sample.mediaSupplements')}
            />
            <DetailRow
              label="Selection"
              value={mediaSelection}
              isMixed={isFieldMixed('sample.mediaSelection')}
            />
            <DetailRow label="Source" value={source} isMixed={isFieldMixed('sample.source')} />
            <DetailRow
              label="Catalog #"
              value={catalogNumber}
              isMixed={isFieldMixed('sample.catalogNumber')}
            />
            <DetailRow label="Lot #" value={lotNumber} isMixed={isFieldMixed('sample.lotNumber')} />
            <DetailRow label="Date" value={formattedDate} isMixed={isFieldMixed('sample.date')} />
            <DetailRow
              label="Researcher"
              value={researcherDisplay}
              isMixed={isFieldMixed('researcherId')}
            />
          </div>
        </div>
      )}

      {(Boolean(notes) || isFieldMixed('sample.notes')) && (
        <div>
          <SectionHeader
            title="Notes"
            size="sm"
            meta={
              isFieldMixed('sample.notes') ? (
                <AlertTriangle className="h-3 w-3 text-warning-text" />
              ) : undefined
            }
          />
          {notes ? (
            <div className="text-sm leading-relaxed text-card-foreground/85">{notes}</div>
          ) : (
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-warning-text" />
              <span className="text-sm text-card-foreground/30">—</span>
            </div>
          )}
        </div>
      )}
    </>
  );

  const footer =
    selectedTubes.length === 1 ? (
      <div className="relative flex-shrink-0 border-t border-line-faint bg-black/15 px-4 py-3">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-px h-px bg-primary/30 shadow-[0_0_8px_hsl(var(--primary)/0.45)]"
        />
        <Button
          variant="primary"
          size="sm"
          fullWidth
          leftIcon={<SquarePen className="h-4 w-4" />}
          onClick={() => showTubeEditorModal({ mode: 'edit', tubeId: firstTube.id })}
        >
          Edit tube
        </Button>
      </div>
    ) : undefined;

  return (
    <>
      {renderPanel(
        { word: positionSummary.positionLabel, value: positionSummary.formattedPositions },
        body,
        footer
      )}

      <TubeLockNoteModal
        isOpen={showEditLockNoteModal && ownedLockedTubes.length > 0}
        tubes={ownedLockedTubes}
        onClose={() => setShowEditLockNoteModal(false)}
      />
    </>
  );
}
