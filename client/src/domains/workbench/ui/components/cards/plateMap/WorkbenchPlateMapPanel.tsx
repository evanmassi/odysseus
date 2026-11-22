import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { colorLineOf, type PlateMapCard, withGreekLetters } from '@odysseus/shared-schemas';

import { RestingTooltipProvider } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';

import { useElementWidth } from '../../../../hooks/useElementWidth';
import { CARD_ID_ATTRIBUTE } from '../../../../hooks/useShowCard';
import { useUpdateCard } from '../../../../hooks/useUpdateCard';
import { useCardsOf, useWorkbenchData } from '../../../../hooks/useWorkbenchSlice';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { APP_ROOT_ID } from '../../../../utils/dom/appRoot';
import { donorSummaries } from '../../../../utils/materials/materialDonors';
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

type LabwareDisplay = Pick<PlateMapCard, 'activeTab' | 'showsReplicatesAsOne'>;

interface WorkbenchPlateMapPanelProps {
  card: PlateMapCard;
  onDisplayChange?: (recipe: (display: LabwareDisplay) => void) => void;
}

// PITFALL: the well editor, menus and dialogs are portaled outside the app root, so clicks in them never count as clicking away.
const APP_HEADER = '.app-header';

interface EditorOpening {
  focusesFirstRow: boolean;
  generation: number;
}

export function WorkbenchPlateMapPanel({ card, onDisplayChange }: WorkbenchPlateMapPanelProps) {
  const board = usePlateMapBoard(card);
  const summaries = useWorkbenchData(state => donorSummaries(state.protocol));
  const updateCard = useUpdateCard(card);
  const updateDisplay = onDisplayChange ?? updateCard;
  const bodyRef = useRef<HTMLDivElement>(null);
  const roomWidth = useElementWidth(bodyRef);
  const tabs = useMemo(() => plateMapTabs(card), [card]);
  const tab = useMemo(() => activeTabOf(card), [card]);
  const sheet = useMemo(() => sheetOf(card, tab), [card, tab]);
  const words = tabWords(card, tab);
  const isStain = card.side === 'stain';
  const panels = useCardsOf('flowCytometryPanel');
  const stains = useMemo(() => plateStains(panels), [panels]);
  const stainById = useMemo(() => new Map(stains.map(stain => [stain.id, stain])), [stains]);
  const colorLine = useMemo(() => colorLineOf(card), [card]);
  const layers = useMemo(() => lineLayers(card, colorLine, board), [card, colorLine, board]);
  const captions = useMemo(() => plateCaptions(layers), [layers]);
  const printsInWells =
    tab.kind !== 'plate' ||
    wellSizeFor(tab.plate.labware, roomWidth, sheet.cols).density !== 'tiny';
  const indicators = useMemo(
    () => (sheet.isPlate ? plateIndicators(card, sheet, layers, board, printsInWells) : []),
    [card, sheet, layers, board, printsInWells]
  );
  const stainCounts = useMemo(() => stainedWellCounts([card]), [card]);
  const updatePlateMap = useUpdatePlateMap(card);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const recolorStain = (stainId: string, color: string) =>
    updateProtocol(draft => {
      for (const panel of draft.cards) {
        if (panel.type !== 'flowCytometryPanel') continue;
        const stain = panel.stains.find(candidate => candidate.id === stainId);
        if (stain) stain.color = color;
      }
    });
  const [editor, setEditor] = useState<EditorOpening>();
  const closeEditor = useCallback(() => setEditor(undefined), []);
  const focusEditor = () =>
    setEditor(current => ({ focusesFirstRow: true, generation: (current?.generation ?? 0) + 1 }));
  const samples = useMemo(
    () => (isStain ? stainSamples(card, sheet) : undefined),
    [card, sheet, isStain]
  );
  const shownAsOne = useMemo(
    () => replicatesShownAsOne(card, sheet, board, samples),
    [card, sheet, board, samples]
  );
  const selection = useWellSelection(sheet, tab.id, closeEditor);
  const startedNames = useWellEditSession(card.id, selection.keys, editor !== undefined);

  const openEditorWith = (seedText?: string) => {
    if (seedText === undefined) return focusEditor();
    const keys = [...selection.keys];
    const firstLineId = startingLineId(card, keys);
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
  } = useWellKeyboard(card, tab, sheet, selection, ask, openEditorWith, isStain);
  const labwareChanges = useLabwareChanges(card, tab, ask);

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
    updateCard(draft => stainWells(draft, selection.keys, stainId));

  const fillUnassigned = (stainId: string) =>
    updateCard(draft =>
      stainWells(
        draft,
        sheet.positions
          .map(position => position.key)
          .filter(key => samples?.get(key)?.length && !card.stain[key]),
        stainId
      )
    );

  const regroupSelected = (edit: (draft: PlateMapCard) => string[]) => () => {
    let regrouped: string[] = [];
    updateCard(draft => {
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
      onPoolReplicates: canPoolReplicates(card, sheet, wells, keys, board)
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
    const cardElement = bodyRef.current?.closest(`[${CARD_ID_ATTRIBUTE}]`);
    const appRoot = document.getElementById(APP_ROOT_ID);
    const clearOnClickAway = (event: PointerEvent) => {
      const { target } = event;
      const isAway =
        target instanceof Element &&
        appRoot?.contains(target) &&
        !cardElement?.contains(target) &&
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
            name: plateNameOf(card, candidate.plate),
            kind: labwareOf(candidate.plate.labware).label.replace(' plate', ''),
            ownName: candidate.plate.name,
            isPlate: true,
          }
        : {
            id: candidate.id,
            name: otherLabwareTabNameOf(card),
            kind: otherLabwareKinds(card),
            ownName: card.otherLabwareTabName ?? '',
            isPlate: false,
          }
  );

  const renameTab = (tabId: string, typed: string) => {
    const name = withGreekLetters(typed.trim());
    updateCard(draft => {
      const plate = draft.plates.find(({ id }) => id === tabId);
      if (plate) plate.name = name;
      else draft.otherLabwareTabName = name || undefined;
    });
  };

  return (
    <RestingTooltipProvider>
      <div ref={bodyRef} className="flex flex-col gap-2 px-3 pb-1">
        <WorkbenchPlateMapControls
          card={card}
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
              draft.showsReplicatesAsOne = !draft.showsReplicatesAsOne;
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
              card={card}
              sheet={sheet}
              colorLine={colorLine}
              layers={layers}
              indicators={indicators}
              size={wellSizeFor(
                tab.plate.labware,
                roomWidth - indicatorWidthPad(indicators),
                sheet.cols
              )}
              board={board}
              donorSummaries={summaries}
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
              card={card}
              sheet={sheet}
              colorLine={colorLine}
              layers={layers}
              scale={otherLabwareScaleFor(card, roomWidth)}
              board={board}
              donorSummaries={summaries}
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
            card={card}
            colorLine={colorLine}
            counts={plateMapCounts(card)}
            indicators={indicators}
          />
        )}
        {editor && !isStain && selection.keys.size > 0 && (
          <WorkbenchWellEditorPanel
            key={editor.generation}
            card={card}
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
              ? card.stain[key] !== undefined || !!samples.get(key)?.length
              : isWellFilled(card, key)
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
