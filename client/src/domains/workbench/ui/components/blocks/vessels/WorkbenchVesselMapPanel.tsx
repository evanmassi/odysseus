import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';

import { colorLineOf, type VesselMapBlock, withGreekLetters } from '@odysseus/shared-schemas';

import { RestingTooltipProvider } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';

import { useElementWidth } from '../../../../hooks/useElementWidth';
import { useUpdateBlock } from '../../../../hooks/useUpdateBlock';
import { useBlocksOf, useWorkbenchData } from '../../../../hooks/useWorkbenchSlice';
import { sourceSummaries } from '../../../../utils/materials/materialSources';
import { bandWidthPad } from '../../../../utils/vessels/plateGeometry';
import {
  fillAmounts,
  lineLayers,
  plateBands,
  plateCaptions,
} from '../../../../utils/vessels/plateLayers';
import { replicateMerges, type ReplicateMerges } from '../../../../utils/vessels/replicateMerges';
import { stainedWellCounts, stainMixes, stainWells } from '../../../../utils/vessels/stainSide';
import { vesselOf } from '../../../../utils/vessels/vesselCatalog';
import { vesselCounts } from '../../../../utils/vessels/vesselMapNames';
import { shelfScaleFor, wellSizeFor } from '../../../../utils/vessels/vesselSizing';
import {
  activeTabOf,
  plateNameOf,
  sheetOf,
  shelfKinds,
  shelfNameOf,
  vesselTabs,
} from '../../../../utils/vessels/vesselTabs';
import { setWellsText, startingLineId } from '../../../../utils/vessels/wellEdits';
import { isWellFilled, selectionName } from '../../../../utils/vessels/wellSelection';

import { useConfirmation } from './useConfirmation';
import { useUpdateVesselMap } from './useUpdateVesselMap';
import { useVesselChanges } from './useVesselChanges';
import { useVesselMapCalculation } from './useVesselMapCalculation';
import { useWellEditSession } from './useWellEditSession';
import { useWellKeyboard } from './useWellKeyboard';
import { useWellSelection } from './useWellSelection';
import { WorkbenchPlateContextMenu } from './WorkbenchPlateContextMenu';
import { WorkbenchPlateLegendSection } from './WorkbenchPlateLegendSection';
import { WorkbenchPlateStainLegend } from './WorkbenchPlateStainLegend';
import { WorkbenchPlateTable } from './WorkbenchPlateTable';
import { WorkbenchVesselMapControls, type VesselTabLabel } from './WorkbenchVesselMapControls';
import { WorkbenchVesselShelfList } from './WorkbenchVesselShelfList';
import { WorkbenchWellEditorPanel } from './WorkbenchWellEditorPanel';

interface WorkbenchVesselMapPanelProps {
  block: VesselMapBlock;
}

const NO_MERGES: ReplicateMerges = { anchors: new Map(), covered: new Set() };

interface EditorOpening {
  focusesFirstRow: boolean;
  generation: number;
}

export function WorkbenchVesselMapPanel({ block }: WorkbenchVesselMapPanelProps) {
  const calculation = useVesselMapCalculation(block);
  const sources = useWorkbenchData(state => sourceSummaries(state.protocol));
  const updateBlock = useUpdateBlock(block);
  const bodyRef = useRef<HTMLDivElement>(null);
  const roomWidth = useElementWidth(bodyRef);
  const tabs = vesselTabs(block);
  const tab = activeTabOf(block);
  const sheet = sheetOf(block, tab);
  const isStain = tab.kind === 'plate' && block.side === 'stain';
  const panels = useBlocksOf('cytometer');
  const mixes = useMemo(() => stainMixes(panels), [panels]);
  const mixById = useMemo(() => new Map(mixes.map(mix => [mix.id, mix])), [mixes]);
  const colorLine = colorLineOf(block);
  const layers = lineLayers(block, colorLine, calculation);
  const captions = plateCaptions(layers);
  const printsInWells =
    tab.kind !== 'plate' || wellSizeFor(tab.plate.vessel, roomWidth, sheet.cols).density !== 'tiny';
  const bands =
    sheet.isPlate && !isStain ? plateBands(block, sheet, layers, calculation, printsInWells) : [];
  const updateVesselMap = useUpdateVesselMap(block);
  const [editor, setEditor] = useState<EditorOpening>();
  const closeEditor = useCallback(() => setEditor(undefined), []);
  const focusEditor = () =>
    setEditor(current => ({ focusesFirstRow: true, generation: (current?.generation ?? 0) + 1 }));
  const merges = isStain ? NO_MERGES : replicateMerges(block, sheet, calculation);
  const selection = useWellSelection(sheet, tab.id, closeEditor);
  const startedNames = useWellEditSession(block.id, selection.keys, editor !== undefined);

  const openEditorWith = (seedText?: string) => {
    if (seedText === undefined) return focusEditor();
    const keys = [...selection.keys];
    const firstLineId = startingLineId(block, keys);
    updateVesselMap(draft => setWellsText(draft, keys, firstLineId, seedText));
    focusEditor();
  };

  const { confirmation, ask, dismiss } = useConfirmation();
  const { onKeyDown, clearSelected, copySelected, cutSelected, paste, canPaste } = useWellKeyboard(
    block,
    tab,
    sheet,
    selection,
    ask,
    openEditorWith
  );
  const vesselChanges = useVesselChanges(block, tab, ask);

  const [menuAt, setMenuAt] = useState<{ x: number; y: number }>();
  const openMenu = (key: string, at: { x: number; y: number }) => {
    const spot = sheet.spots.find(candidate => candidate.key === key);
    if (spot) selection.openAt(spot);
    if (!isStain) setMenuAt(at);
  };

  const openWell = (key: string) => {
    const spot = sheet.spots.find(candidate => candidate.key === key);
    if (spot) selection.openAt(spot);
    if (!isStain) focusEditor();
  };

  const stainSelected = (mixId: string | undefined) =>
    updateBlock(draft => stainWells(draft, selection.keys, mixId));

  const fillUnstained = (mixId: string) =>
    updateBlock(draft =>
      stainWells(
        draft,
        sheet.spots
          .map(spot => spot.key)
          .filter(key => isWellFilled(block, key) && !block.stain[key]),
        mixId
      )
    );

  const stainKeyDown = (event: KeyboardEvent) => {
    if ((event.key === 'Delete' || event.key === 'Backspace') && selection.keys.size) {
      event.preventDefault();
      stainSelected(undefined);
    } else if (event.key.startsWith('Arrow') || event.key === 'Escape') {
      onKeyDown(event);
    }
  };

  useEffect(() => {
    if (!selection.keys.size) setEditor(undefined);
  }, [selection.keys.size]);

  useEffect(() => {
    if (!isStain) return;
    setEditor(undefined);
    setMenuAt(undefined);
  }, [isStain]);

  const tabLabels = tabs.map(
    (candidate): VesselTabLabel =>
      candidate.kind === 'plate'
        ? {
            id: candidate.id,
            name: plateNameOf(block, candidate.plate),
            kind: vesselOf(candidate.plate.vessel).label.replace(' plate', ''),
            ownName: candidate.plate.name,
            isPlate: true,
          }
        : {
            id: candidate.id,
            name: shelfNameOf(block),
            kind: shelfKinds(block),
            ownName: block.shelfName ?? '',
            isPlate: false,
          }
  );

  const renameTab = (tabId: string, typed: string) => {
    const name = withGreekLetters(typed.trim());
    updateBlock(draft => {
      const plate = draft.plates.find(({ id }) => id === tabId);
      if (plate) plate.name = name;
      else draft.shelfName = name || undefined;
    });
  };

  return (
    <RestingTooltipProvider>
      <div ref={bodyRef} className="flex flex-col gap-2 px-3 pb-1">
        <WorkbenchVesselMapControls
          block={block}
          tabs={tabLabels}
          activeId={tab.id}
          onShowTab={id =>
            updateBlock(draft => {
              draft.activeTab = tabs.findIndex(candidate => candidate.id === id);
            })
          }
          onRenameTab={renameTab}
          onRemovePlate={vesselChanges.removePlate}
          onToggleMerge={() =>
            updateBlock(draft => {
              draft.mergesReplicates = !draft.mergesReplicates;
            })
          }
          onSetCount={vesselChanges.setCount}
          onDuplicate={vesselChanges.duplicateTab}
          editLabel={
            selection.keys.size && !editor && !isStain
              ? selectionName(sheet, selection.keys) || `${selection.keys.size} selected`
              : undefined
          }
          onEdit={focusEditor}
        />
        {captions.length > 0 && !isStain && (
          <p className="text-body-sm text-muted-foreground">
            Every well: <b className="text-foreground">{captions.join(' · ')}</b>
          </p>
        )}
        {roomWidth > 0 &&
          (tab.kind === 'plate' ? (
            <WorkbenchPlateTable
              block={block}
              sheet={sheet}
              colorLine={colorLine}
              layers={layers}
              bands={bands}
              size={wellSizeFor(tab.plate.vessel, roomWidth - bandWidthPad(bands), sheet.cols)}
              calculation={calculation}
              sources={sources}
              selection={selection}
              merges={merges}
              stainMixes={isStain ? mixById : undefined}
              onKeyDown={isStain ? stainKeyDown : onKeyDown}
              onOpenWell={openWell}
              onOpenMenu={openMenu}
            />
          ) : (
            <WorkbenchVesselShelfList
              block={block}
              sheet={sheet}
              colorLine={colorLine}
              layers={layers}
              scale={shelfScaleFor(block, roomWidth)}
              calculation={calculation}
              sources={sources}
              selection={selection}
              onKeyDown={onKeyDown}
              onOpenWell={openWell}
              onOpenMenu={openMenu}
            />
          ))}
        {isStain ? (
          <WorkbenchPlateStainLegend
            mixes={mixes}
            counts={stainedWellCounts([block])}
            hasSelection={selection.keys.size > 0}
            onPick={stainSelected}
            onFillUnstained={fillUnstained}
          />
        ) : (
          <WorkbenchPlateLegendSection
            block={block}
            colorLine={colorLine}
            counts={vesselCounts(block)}
            bands={bands}
            fillAmounts={fillAmounts(block, colorLine, calculation)}
          />
        )}
        {editor && !isStain && selection.keys.size > 0 && (
          <WorkbenchWellEditorPanel
            key={editor.generation}
            block={block}
            tab={tab}
            sheet={sheet}
            keys={selection.keys}
            startedNames={startedNames}
            layers={layers}
            wellsRef={bodyRef}
            focusesFirstRow={editor.focusesFirstRow}
            onClear={clearSelected}
            onClose={closeEditor}
          />
        )}
        <WorkbenchPlateContextMenu
          position={menuAt}
          hasFilledSelection={[...selection.keys].some(key => isWellFilled(block, key))}
          canPaste={!!menuAt && canPaste()}
          onClose={() => setMenuAt(undefined)}
          onEdit={focusEditor}
          onCopy={copySelected}
          onCut={cutSelected}
          onPaste={paste}
          onClear={clearSelected}
        />
        <ConfirmDialog
          isOpen={!!confirmation}
          variant="danger"
          title={confirmation?.title ?? ''}
          message={confirmation?.message ?? ''}
          confirmText={confirmation?.confirmText}
          onConfirm={() => confirmation?.onConfirm()}
          onCancel={dismiss}
        />
      </div>
    </RestingTooltipProvider>
  );
}
