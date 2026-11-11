import { useCallback, useEffect, useRef, useState } from 'react';

import { colorLineOf, type VesselMapBlock } from '@odysseus/shared-schemas';

import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';

import { useElementWidth } from '../../../../hooks/useElementWidth';
import { useUpdateBlock } from '../../../../hooks/useUpdateBlock';
import { bandWidthPad } from '../../../../utils/vessels/plateGeometry';
import { lineLayers, plateBands, plateCaptions } from '../../../../utils/vessels/plateLayers';
import { replicateMerges, withMergedWells } from '../../../../utils/vessels/replicateMerges';
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
import { setWellsText, wellRows } from '../../../../utils/vessels/wellEdits';

import { useConfirmation } from './useConfirmation';
import { useUpdateVesselMap } from './useUpdateVesselMap';
import { useVesselChanges } from './useVesselChanges';
import { useVesselMapCalculation } from './useVesselMapCalculation';
import { useWellKeyboard } from './useWellKeyboard';
import { useWellSelection } from './useWellSelection';
import { WorkbenchPlateLegendSection } from './WorkbenchPlateLegendSection';
import { WorkbenchPlateTable } from './WorkbenchPlateTable';
import { WorkbenchVesselMapControls, type VesselTabLabel } from './WorkbenchVesselMapControls';
import { WorkbenchVesselShelfList } from './WorkbenchVesselShelfList';
import { WorkbenchWellEditorPanel } from './WorkbenchWellEditorPanel';

interface WorkbenchVesselMapPanelProps {
  block: VesselMapBlock;
}

interface EditorOpening {
  focusesFirstRow: boolean;
  generation: number;
}

export function WorkbenchVesselMapPanel({ block }: WorkbenchVesselMapPanelProps) {
  const calculation = useVesselMapCalculation(block);
  const updateBlock = useUpdateBlock(block);
  const bodyRef = useRef<HTMLDivElement>(null);
  const roomWidth = useElementWidth(bodyRef);
  const tabs = vesselTabs(block);
  const tab = activeTabOf(block);
  const sheet = sheetOf(block, tab);
  const colorLine = colorLineOf(block);
  const layers = lineLayers(block, colorLine, calculation);
  const captions = plateCaptions(layers);
  const bands = sheet.isPlate ? plateBands(block, sheet, layers, calculation) : [];
  const updateVesselMap = useUpdateVesselMap(block);
  const [editor, setEditor] = useState<EditorOpening>();
  const openEditor = useCallback(
    () => setEditor(current => current ?? { focusesFirstRow: false, generation: 0 }),
    []
  );
  const focusEditor = () =>
    setEditor(current => ({ focusesFirstRow: true, generation: (current?.generation ?? 0) + 1 }));
  const merges = replicateMerges(block, sheet, calculation);
  const expandToMerges = (keys: ReadonlySet<string>) => withMergedWells(merges, keys);
  const selection = useWellSelection(sheet, tab.id, expandToMerges, openEditor);

  const openEditorWith = (seedText?: string) => {
    if (seedText === undefined) return openEditor();
    const keys = [...selection.keys];
    const firstLineId = wellRows(block, keys, colorLine)[0]?.line?.id;
    updateVesselMap(draft => setWellsText(draft, keys, firstLineId, seedText));
    focusEditor();
  };

  const { confirmation, ask, dismiss } = useConfirmation();
  const { onKeyDown, clearSelected } = useWellKeyboard(
    block,
    tab,
    sheet,
    selection,
    ask,
    openEditorWith
  );
  const vesselChanges = useVesselChanges(block, tab, ask);

  const openWell = (key: string) => {
    selection.selectKeys([key]);
    focusEditor();
  };

  useEffect(() => {
    if (!selection.keys.size) setEditor(undefined);
  }, [selection.keys.size]);

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

  const renameTab = (tabId: string, name: string) =>
    updateBlock(draft => {
      const plate = draft.plates.find(({ id }) => id === tabId);
      if (plate) plate.name = name.trim();
      else draft.shelfName = name.trim() || undefined;
    });

  return (
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
      />
      {captions.length > 0 && (
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
            bands={bands}
            size={wellSizeFor(tab.plate.vessel, roomWidth - bandWidthPad(bands), sheet.cols)}
            calculation={calculation}
            selection={selection}
            merges={merges}
            onKeyDown={onKeyDown}
            onOpenWell={openWell}
          />
        ) : (
          <WorkbenchVesselShelfList
            block={block}
            sheet={sheet}
            colorLine={colorLine}
            scale={shelfScaleFor(block, roomWidth)}
            calculation={calculation}
            selection={selection}
            onKeyDown={onKeyDown}
            onOpenWell={openWell}
          />
        ))}
      <WorkbenchPlateLegendSection
        block={block}
        colorLine={colorLine}
        counts={vesselCounts(block)}
        bands={bands}
      />
      {editor && selection.keys.size > 0 && (
        <WorkbenchWellEditorPanel
          key={editor.generation}
          block={block}
          tab={tab}
          sheet={sheet}
          keys={selection.keys}
          colorLine={colorLine}
          layers={layers}
          wellsRef={bodyRef}
          focusesFirstRow={editor.focusesFirstRow}
          onClear={clearSelected}
          onClose={() => setEditor(undefined)}
        />
      )}
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
  );
}
