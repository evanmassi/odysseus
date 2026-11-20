import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { colorLineOf, type VesselMapBlock, withGreekLetters } from '@odysseus/shared-schemas';

import { RestingTooltipProvider } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';

import { useElementWidth } from '../../../../hooks/useElementWidth';
import { BLOCK_ID_ATTRIBUTE } from '../../../../hooks/useShowBlock';
import { useUpdateBlock } from '../../../../hooks/useUpdateBlock';
import { useBlocksOf, useWorkbenchData } from '../../../../hooks/useWorkbenchSlice';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { APP_ROOT_ID } from '../../../../utils/dom/appRoot';
import { sourceSummaries } from '../../../../utils/materials/materialSources';
import { bandWidthPad } from '../../../../utils/vessels/plateGeometry';
import {
  fillAmounts,
  lineLayers,
  plateBands,
  plateCaptions,
} from '../../../../utils/vessels/plateLayers';
import { replicateMerges } from '../../../../utils/vessels/replicateMerges';
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

type VesselDisplay = Pick<VesselMapBlock, 'activeTab' | 'mergesReplicates'>;

interface WorkbenchVesselMapPanelProps {
  block: VesselMapBlock;
  onDisplayChange?: (recipe: (display: VesselDisplay) => void) => void;
}

// PITFALL: the well editor, menus and dialogs are portaled outside the app root, so clicks in them never count as clicking away.
const APP_HEADER = '.app-header';

interface EditorOpening {
  focusesFirstRow: boolean;
  generation: number;
}

export function WorkbenchVesselMapPanel({ block, onDisplayChange }: WorkbenchVesselMapPanelProps) {
  const calculation = useVesselMapCalculation(block);
  const sources = useWorkbenchData(state => sourceSummaries(state.protocol));
  const updateBlock = useUpdateBlock(block);
  const updateDisplay = onDisplayChange ?? updateBlock;
  const bodyRef = useRef<HTMLDivElement>(null);
  const roomWidth = useElementWidth(bodyRef);
  const tabs = useMemo(() => vesselTabs(block), [block]);
  const tab = useMemo(() => activeTabOf(block), [block]);
  const sheet = useMemo(() => sheetOf(block, tab), [block, tab]);
  const isStain = block.side === 'stain';
  const panels = useBlocksOf('cytometer');
  const mixes = useMemo(() => stainMixes(panels), [panels]);
  const mixById = useMemo(() => new Map(mixes.map(mix => [mix.id, mix])), [mixes]);
  const colorLine = useMemo(() => colorLineOf(block), [block]);
  const layers = useMemo(
    () => lineLayers(block, colorLine, calculation),
    [block, colorLine, calculation]
  );
  const captions = useMemo(() => plateCaptions(layers), [layers]);
  const printsInWells =
    tab.kind !== 'plate' || wellSizeFor(tab.plate.vessel, roomWidth, sheet.cols).density !== 'tiny';
  const bands = useMemo(
    () => (sheet.isPlate ? plateBands(block, sheet, layers, calculation, printsInWells) : []),
    [block, sheet, layers, calculation, printsInWells]
  );
  const legendAmounts = useMemo(
    () => fillAmounts(block, colorLine, calculation),
    [block, colorLine, calculation]
  );
  const stainCounts = useMemo(() => stainedWellCounts([block]), [block]);
  const updateVesselMap = useUpdateVesselMap(block);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const recolorMix = (mixId: string, color: string) =>
    updateProtocol(draft => {
      for (const panel of draft.blocks) {
        if (panel.type !== 'cytometer') continue;
        const mix = panel.mixes.find(candidate => candidate.id === mixId);
        if (mix) mix.color = color;
      }
    });
  const [editor, setEditor] = useState<EditorOpening>();
  const closeEditor = useCallback(() => setEditor(undefined), []);
  const focusEditor = () =>
    setEditor(current => ({ focusesFirstRow: true, generation: (current?.generation ?? 0) + 1 }));
  const merges = useMemo(
    () => replicateMerges(block, sheet, calculation, isStain),
    [block, sheet, calculation, isStain]
  );
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
    openEditorWith,
    isStain
  );
  const vesselChanges = useVesselChanges(block, tab, ask);

  const [menuAt, setMenuAt] = useState<{ x: number; y: number }>();
  const openMenu = (key: string, at: { x: number; y: number }) => {
    const spot = sheet.spots.find(candidate => candidate.key === key);
    if (spot) selection.openAt(spot);
    setMenuAt(at);
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

  useEffect(() => {
    if (!selection.keys.size) setEditor(undefined);
  }, [selection.keys.size]);

  const hasSelection = selection.keys.size > 0;
  const clearSelection = selection.clear;
  useEffect(() => {
    if (!hasSelection) return;
    const card = bodyRef.current?.closest(`[${BLOCK_ID_ATTRIBUTE}]`);
    const appRoot = document.getElementById(APP_ROOT_ID);
    const clearOnClickAway = (event: PointerEvent) => {
      const { target } = event;
      const isAway =
        target instanceof Element &&
        appRoot?.contains(target) &&
        !card?.contains(target) &&
        !target.closest(APP_HEADER);
      if (isAway) clearSelection();
    };
    document.addEventListener('pointerdown', clearOnClickAway, true);
    return () => document.removeEventListener('pointerdown', clearOnClickAway, true);
  }, [hasSelection, clearSelection]);

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
            updateDisplay(draft => {
              draft.activeTab = tabs.findIndex(candidate => candidate.id === id);
            })
          }
          onRenameTab={renameTab}
          onRemovePlate={vesselChanges.removePlate}
          onToggleMerge={() =>
            updateDisplay(draft => {
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
              onKeyDown={onKeyDown}
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
              stainMixes={isStain ? mixById : undefined}
              onKeyDown={onKeyDown}
              onOpenWell={openWell}
              onOpenMenu={openMenu}
            />
          ))}
        {isStain ? (
          <WorkbenchPlateStainLegend
            mixes={mixes}
            counts={stainCounts}
            hasSelection={selection.keys.size > 0}
            onPick={stainSelected}
            onFillUnstained={fillUnstained}
            onRecolor={recolorMix}
          />
        ) : (
          <WorkbenchPlateLegendSection
            block={block}
            colorLine={colorLine}
            counts={vesselCounts(block)}
            bands={bands}
            fillAmounts={legendAmounts}
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
          hasFilledSelection={[...selection.keys].some(key =>
            isStain ? block.stain[key] !== undefined : isWellFilled(block, key)
          )}
          canPaste={!!menuAt && canPaste()}
          onClose={() => setMenuAt(undefined)}
          onEdit={isStain ? undefined : focusEditor}
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
