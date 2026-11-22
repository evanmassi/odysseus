import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { colorLineOf, type PlateMapBlock, withGreekLetters } from '@odysseus/shared-schemas';

import { RestingTooltipProvider } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';

import { useElementWidth } from '../../../../hooks/useElementWidth';
import { BLOCK_ID_ATTRIBUTE } from '../../../../hooks/useShowBlock';
import { useUpdateBlock } from '../../../../hooks/useUpdateBlock';
import { useBlocksOf, useWorkbenchData } from '../../../../hooks/useWorkbenchSlice';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { APP_ROOT_ID } from '../../../../utils/dom/appRoot';
import { sourceSummaries } from '../../../../utils/materials/materialSources';
import { labwareOf } from '../../../../utils/plateMap/labwareCatalog';
import { otherLabwareScaleFor, wellSizeFor } from '../../../../utils/plateMap/labwareSizing';
import { indicatorWidthPad } from '../../../../utils/plateMap/plateGeometry';
import { lineLayers, plateIndicators, plateCaptions } from '../../../../utils/plateMap/plateLayers';
import { plateMapCounts } from '../../../../utils/plateMap/plateMapNames';
import {
  activeTabOf,
  plateNameOf,
  sheetOf,
  otherLabwareKinds,
  otherLabwareTabNameOf,
  tabWords,
  plateMapTabs,
} from '../../../../utils/plateMap/plateMapTabs';
import { replicatesShownAsOne } from '../../../../utils/plateMap/replicatesShownAsOne';
import {
  canPoolReplicates,
  canPoolSamples,
  canUnpool,
  poolReplicates,
  poolSamples,
  stainSamples,
  unpool,
} from '../../../../utils/plateMap/stainLayout';
import { stainedWellCounts, plateStains, stainWells } from '../../../../utils/plateMap/stainSide';
import { setWellsText, startingLineId } from '../../../../utils/plateMap/wellEdits';
import { isWellFilled, selectionName } from '../../../../utils/plateMap/wellSelection';

import { useConfirmation } from './useConfirmation';
import { useLabwareChanges } from './useLabwareChanges';
import { usePlateMapBoard } from './usePlateMapBoard';
import { useUpdatePlateMap } from './useUpdatePlateMap';
import { useWellEditSession } from './useWellEditSession';
import { useWellKeyboard } from './useWellKeyboard';
import { useWellSelection } from './useWellSelection';
import { WorkbenchOtherLabwareList } from './WorkbenchOtherLabwareList';
import { WorkbenchPlateContextMenu, type StainPooling } from './WorkbenchPlateContextMenu';
import { WorkbenchPlateLegendSection } from './WorkbenchPlateLegendSection';
import { WorkbenchPlateMapControls, type PlateMapTabLabel } from './WorkbenchPlateMapControls';
import { WorkbenchPlateStainLegend } from './WorkbenchPlateStainLegend';
import { WorkbenchPlateTable } from './WorkbenchPlateTable';
import { WorkbenchWellEditorPanel } from './WorkbenchWellEditorPanel';

type LabwareDisplay = Pick<PlateMapBlock, 'activeTab' | 'mergesReplicates'>;

interface WorkbenchPlateMapPanelProps {
  block: PlateMapBlock;
  onDisplayChange?: (recipe: (display: LabwareDisplay) => void) => void;
}

// PITFALL: the well editor, menus and dialogs are portaled outside the app root, so clicks in them never count as clicking away.
const APP_HEADER = '.app-header';

interface EditorOpening {
  focusesFirstRow: boolean;
  generation: number;
}

export function WorkbenchPlateMapPanel({ block, onDisplayChange }: WorkbenchPlateMapPanelProps) {
  const board = usePlateMapBoard(block);
  const sources = useWorkbenchData(state => sourceSummaries(state.protocol));
  const updateBlock = useUpdateBlock(block);
  const updateDisplay = onDisplayChange ?? updateBlock;
  const bodyRef = useRef<HTMLDivElement>(null);
  const roomWidth = useElementWidth(bodyRef);
  const tabs = useMemo(() => plateMapTabs(block), [block]);
  const tab = useMemo(() => activeTabOf(block), [block]);
  const sheet = useMemo(() => sheetOf(block, tab), [block, tab]);
  const words = tabWords(block, tab);
  const isStain = block.side === 'stain';
  const panels = useBlocksOf('cytometer');
  const stains = useMemo(() => plateStains(panels), [panels]);
  const stainById = useMemo(() => new Map(stains.map(stain => [stain.id, stain])), [stains]);
  const colorLine = useMemo(() => colorLineOf(block), [block]);
  const layers = useMemo(() => lineLayers(block, colorLine, board), [block, colorLine, board]);
  const captions = useMemo(() => plateCaptions(layers), [layers]);
  const printsInWells =
    tab.kind !== 'plate' || wellSizeFor(tab.plate.vessel, roomWidth, sheet.cols).density !== 'tiny';
  const indicators = useMemo(
    () => (sheet.isPlate ? plateIndicators(block, sheet, layers, board, printsInWells) : []),
    [block, sheet, layers, board, printsInWells]
  );
  const stainCounts = useMemo(() => stainedWellCounts([block]), [block]);
  const updatePlateMap = useUpdatePlateMap(block);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const recolorStain = (stainId: string, color: string) =>
    updateProtocol(draft => {
      for (const panel of draft.blocks) {
        if (panel.type !== 'cytometer') continue;
        const stain = panel.mixes.find(candidate => candidate.id === stainId);
        if (stain) stain.color = color;
      }
    });
  const [editor, setEditor] = useState<EditorOpening>();
  const closeEditor = useCallback(() => setEditor(undefined), []);
  const focusEditor = () =>
    setEditor(current => ({ focusesFirstRow: true, generation: (current?.generation ?? 0) + 1 }));
  const samples = useMemo(
    () => (isStain ? stainSamples(block, sheet) : undefined),
    [block, sheet, isStain]
  );
  const shownAsOne = useMemo(
    () => replicatesShownAsOne(block, sheet, board, samples),
    [block, sheet, board, samples]
  );
  const selection = useWellSelection(sheet, tab.id, closeEditor);
  const startedNames = useWellEditSession(block.id, selection.keys, editor !== undefined);

  const openEditorWith = (seedText?: string) => {
    if (seedText === undefined) return focusEditor();
    const keys = [...selection.keys];
    const firstLineId = startingLineId(block, keys);
    updatePlateMap(draft => setWellsText(draft, keys, firstLineId, seedText));
    focusEditor();
  };

  const { confirmation, ask, dismiss } = useConfirmation();
  const {
    onKeyDown,
    clearSelected,
    copySelected,
    cutSelected,
    paste,
    canPaste,
    cutKeys,
    copiedKeys,
  } = useWellKeyboard(block, tab, sheet, selection, ask, openEditorWith, isStain);
  const labwareChanges = useLabwareChanges(block, tab, ask);

  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>();
  const openMenu = (key: string, at: { x: number; y: number }) => {
    const position = sheet.positions.find(candidate => candidate.key === key);
    if (position) selection.openAt(position);
    setMenuPosition(at);
  };

  const openWell = (key: string) => {
    const position = sheet.positions.find(candidate => candidate.key === key);
    if (position) selection.openAt(position);
    if (!isStain) focusEditor();
  };

  const stainSelected = (stainId: string | undefined) =>
    updateBlock(draft => stainWells(draft, selection.keys, stainId));

  const fillUnassigned = (stainId: string) =>
    updateBlock(draft =>
      stainWells(
        draft,
        sheet.positions
          .map(position => position.key)
          .filter(key => samples?.get(key)?.length && !block.stain[key]),
        stainId
      )
    );

  const regroupSelected = (edit: (draft: PlateMapBlock) => string[]) => () => {
    let regrouped: string[] = [];
    updateBlock(draft => {
      regrouped = edit(draft);
    });
    selection.selectKeys(regrouped);
  };

  const poolingFor = (wells: NonNullable<typeof samples>): StainPooling => {
    const keys = selection.keys;
    return {
      poolCount: [...keys].filter(key => wells.get(key)?.length).length,
      onPoolSamples: canPoolSamples(sheet, wells, keys)
        ? regroupSelected(draft => poolSamples(draft, sheet, keys))
        : undefined,
      onPoolReplicates: canPoolReplicates(block, sheet, wells, keys, board)
        ? regroupSelected(draft => poolReplicates(draft, sheet, keys, board))
        : undefined,
      onUnpool: canUnpool(wells, keys)
        ? regroupSelected(draft => unpool(draft, sheet, keys))
        : undefined,
    };
  };

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
    setMenuPosition(undefined);
  }, [isStain]);

  const tabLabels = tabs.map(
    (candidate): PlateMapTabLabel =>
      candidate.kind === 'plate'
        ? {
            id: candidate.id,
            name: plateNameOf(block, candidate.plate),
            kind: labwareOf(candidate.plate.vessel).label.replace(' plate', ''),
            ownName: candidate.plate.name,
            isPlate: true,
          }
        : {
            id: candidate.id,
            name: otherLabwareTabNameOf(block),
            kind: otherLabwareKinds(block),
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
        <WorkbenchPlateMapControls
          block={block}
          tabs={tabLabels}
          activeId={tab.id}
          onShowTab={id =>
            updateDisplay(draft => {
              draft.activeTab = tabs.findIndex(candidate => candidate.id === id);
            })
          }
          onRenameTab={renameTab}
          onRemovePlate={labwareChanges.removePlate}
          onToggleReplicatesAsOne={() =>
            updateDisplay(draft => {
              draft.mergesReplicates = !draft.mergesReplicates;
            })
          }
          onSetCount={labwareChanges.setCount}
          onDuplicate={labwareChanges.duplicateTab}
          editLabel={
            selection.keys.size && !editor && !isStain
              ? selectionName(sheet, selection.keys) || `${selection.keys.size} selected`
              : undefined
          }
          onEdit={focusEditor}
        />
        {captions.length > 0 && !isStain && (
          <p className="text-body-sm text-muted-foreground">
            Every {words.noun}: <b className="text-foreground">{captions.join(' · ')}</b>
          </p>
        )}
        {roomWidth > 0 &&
          (tab.kind === 'plate' ? (
            <WorkbenchPlateTable
              block={block}
              sheet={sheet}
              colorLine={colorLine}
              layers={layers}
              indicators={indicators}
              size={wellSizeFor(
                tab.plate.vessel,
                roomWidth - indicatorWidthPad(indicators),
                sheet.cols
              )}
              board={board}
              sources={sources}
              selection={selection}
              shownAsOne={shownAsOne}
              stains={stainById}
              stainSamples={samples}
              cutKeys={cutKeys}
              copiedKeys={copiedKeys}
              onKeyDown={onKeyDown}
              onOpenWell={openWell}
              onOpenMenu={openMenu}
            />
          ) : (
            <WorkbenchOtherLabwareList
              block={block}
              sheet={sheet}
              colorLine={colorLine}
              layers={layers}
              scale={otherLabwareScaleFor(block, roomWidth)}
              board={board}
              sources={sources}
              selection={selection}
              stains={stainById}
              stainSamples={samples}
              cutKeys={cutKeys}
              copiedKeys={copiedKeys}
              onKeyDown={onKeyDown}
              onOpenWell={openWell}
              onOpenMenu={openMenu}
            />
          ))}
        {isStain ? (
          <WorkbenchPlateStainLegend
            stains={stains}
            counts={stainCounts}
            hasSelection={selection.keys.size > 0}
            words={words}
            onPick={stainSelected}
            onFillUnassigned={fillUnassigned}
            onRecolor={recolorStain}
          />
        ) : (
          <WorkbenchPlateLegendSection
            block={block}
            colorLine={colorLine}
            counts={plateMapCounts(block)}
            indicators={indicators}
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
          menuPosition={menuPosition}
          hasFilledSelection={[...selection.keys].some(key =>
            samples
              ? block.stain[key] !== undefined || !!samples.get(key)?.length
              : isWellFilled(block, key)
          )}
          canPaste={!!menuPosition && canPaste()}
          pooling={menuPosition && samples ? poolingFor(samples) : undefined}
          onClose={() => setMenuPosition(undefined)}
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
