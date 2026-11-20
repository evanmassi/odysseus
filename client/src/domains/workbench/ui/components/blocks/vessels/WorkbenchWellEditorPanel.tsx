import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

import { createPortal } from 'react-dom';

import { Button } from '@shared/ui';

import { usePlacedBeside } from '../../../../hooks/usePlacedBeside';
import { useWorkbenchData } from '../../../../hooks/useWorkbenchSlice';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { focusOnMount } from '../../../../utils/dom/focusOnMount';
import { createId } from '../../../../utils/ids/createId';
import { isSameBareName } from '../../../../utils/materials/renameFollowing';
import { ratioRow } from '../../../../utils/vessels/cellRatios';
import { seriesSummary } from '../../../../utils/vessels/plateSeries';
import {
  lineUnitOf,
  removeSeries,
  seriesFormFor,
  seriesPreview,
  writeSeries,
  type SeriesForm,
} from '../../../../utils/vessels/seriesEdits';
import { wordsForTypes } from '../../../../utils/vessels/vesselCatalog';
import {
  lineNamed,
  linesOffWells,
  moveWellsToLine,
  recolorValue,
  nameElsewhere,
  removeLineFromWells,
  renameLine,
  renameValue,
  setRatioPartner,
  setWellsAmount,
  setWellsText,
  setWellsUnit,
  toggleLineMark,
  startingLineId,
  wellRows,
  type HeldName,
  type WellRow,
} from '../../../../utils/vessels/wellEdits';
import { selectionName } from '../../../../utils/vessels/wellSelection';
import { knownNamesIn } from '../../../../utils/vessels/wellValueSuggestions';
import { POPOUT_PANEL } from '../../board/popoutPanelClass';

import { useUpdateVesselMap } from './useUpdateVesselMap';
import { WorkbenchWellLineRow } from './WorkbenchWellLineRow';
import { WorkbenchWellSeriesForm } from './WorkbenchWellSeriesForm';

import type { lineLayers } from '../../../../utils/vessels/plateLayers';
import type { VesselSheet, VesselTab } from '../../../../utils/vessels/vesselTabs';
import type { VesselMapBlock } from '@odysseus/shared-schemas';

interface DraftLine {
  lineId: string;
  name: string;
}

interface EditorRow {
  row: WellRow;
  lineId: string;
  draft: DraftLine | undefined;
}

interface WorkbenchWellEditorPanelProps {
  block: VesselMapBlock;
  tab: VesselTab;
  sheet: VesselSheet;
  keys: ReadonlySet<string>;
  startedNames: ReadonlyMap<string, HeldName>;
  layers: ReturnType<typeof lineLayers>;
  wellsRef: RefObject<HTMLElement>;
  focusesFirstRow: boolean;
  onClear: () => void;
  onClose: () => void;
}

const BLANK_ROW: WellRow = {
  line: undefined,
  value: undefined,
  text: '',
  isTextMixed: false,
  amount: '',
  isAmountMixed: false,
  unit: '',
  seriesId: undefined,
};
function selectionBox(root: HTMLElement, keys: ReadonlySet<string>): DOMRect | undefined {
  const rects = [...root.querySelectorAll<HTMLElement>('[data-well-key]')]
    .filter(element => keys.has(element.dataset['wellKey'] ?? ''))
    .map(element => element.getBoundingClientRect());
  if (!rects.length) return undefined;
  const left = Math.min(...rects.map(rect => rect.left));
  const top = Math.min(...rects.map(rect => rect.top));
  return new DOMRect(
    left,
    top,
    Math.max(...rects.map(rect => rect.right)) - left,
    Math.max(...rects.map(rect => rect.bottom)) - top
  );
}

export function WorkbenchWellEditorPanel({
  block,
  tab,
  sheet,
  keys,
  startedNames,
  layers,
  wellsRef,
  focusesFirstRow,
  onClear,
  onClose,
}: WorkbenchWellEditorPanelProps) {
  const calculation = useWorkbenchStore(state => state.calculation);
  const knownNames = useWorkbenchData(state => knownNamesIn(state.protocol));
  const updateVesselMap = useUpdateVesselMap(block);
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionAnchor = useCallback(
    () => (wellsRef.current ? selectionBox(wellsRef.current, keys) : undefined),
    [wellsRef, keys]
  );
  const position = usePlacedBeside(editorRef, selectionAnchor);
  const [drafts, setDrafts] = useState<DraftLine[]>([]);
  const [freshLineId] = useState(createId);
  const [openSeries, setOpenSeries] = useState<SeriesForm>();
  const keyList = [...keys];
  const onWells = wellRows(block, keyList).flatMap(row =>
    row.line ? [{ row, lineId: row.line.id, draft: undefined }] : []
  );
  const shownDrafts: DraftLine[] =
    onWells.length || drafts.length
      ? drafts
      : [{ lineId: startingLineId(block, keyList) ?? freshLineId, name: '' }];
  const rows: EditorRow[] = [
    ...onWells,
    ...shownDrafts.map(draft => ({
      row: { ...BLANK_ROW, line: block.lines.find(line => line.id === draft.lineId) },
      lineId: draft.lineId,
      draft,
    })),
  ];
  const offeredNames = (lineId: string) => [
    ...new Set(
      linesOffWells(block, keyList)
        .filter(line => line.id !== lineId && !shownDrafts.some(draft => draft.lineId === line.id))
        .map(line => line.name)
    ),
  ];
  const { noun, plural } = wordsForTypes(
    tab.kind === 'plate' ? [tab.plate.vessel] : block.sets.map(set => set.vessel)
  );
  const where = selectionName(sheet, keys);
  const count = `${keys.size} ${keys.size === 1 ? noun : plural}`;

  useEffect(() => {
    setOpenSeries(undefined);
    setDrafts([]);
  }, [keys]);

  const writeRow = (target: EditorRow, change: (draft: VesselMapBlock) => void) => {
    const pending = target.draft;
    updateVesselMap(draft => {
      change(draft);
      if (pending?.name) renameLine(draft, target.lineId, pending.name);
    });
    if (pending) setDrafts(shownDrafts.filter(draft => draft !== pending));
  };

  const nameRow = (target: EditorRow, name: string) => {
    const existing = lineNamed(block, keyList, name);
    if (target.draft) {
      const next = existing ? { lineId: existing.id, name: '' } : { lineId: createId(), name };
      setDrafts(shownDrafts.map(draft => (draft === target.draft ? next : draft)));
      return;
    }
    updateVesselMap(draft =>
      existing
        ? moveWellsToLine(draft, keyList, target.lineId, existing.id)
        : renameLine(draft, target.lineId, name)
    );
  };

  const changeSeries = (change: Partial<SeriesForm>) => {
    if (!openSeries) return;
    const next = { ...openSeries, ...change };
    let { seriesId } = next;
    const write = (draft: VesselMapBlock) => {
      seriesId = writeSeries(draft, sheet, keys, next);
    };
    const target = rows.find(candidate => candidate.lineId === next.lineId);
    if (target) writeRow(target, write);
    else updateVesselMap(write);
    setOpenSeries({ ...next, seriesId });
  };

  const removeOpenSeries = (seriesId: string) => {
    updateVesselMap(draft => removeSeries(draft, seriesId));
    setOpenSeries(undefined);
  };

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return createPortal(
    <div
      ref={editorRef}
      role="dialog"
      aria-label={`Edit ${where || count}`}
      className={POPOUT_PANEL}
      style={position}
    >
      <div className="flex items-center gap-2">
        <b className="text-label-md text-foreground">{where || count}</b>
        {where && <span className="text-caption text-muted-foreground">{count}</span>}
        <span className="flex-1" />
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
        <Button variant="secondary" size="sm" onClick={onClose}>
          Done
        </Button>
      </div>
      {rows.map((target, index) => {
        const { row, lineId, draft } = target;
        const series = row.seriesId === undefined ? undefined : block.series[row.seriesId];
        const edit = (change: (draft: VesselMapBlock) => void) => writeRow(target, change);
        const form = openSeries?.lineId === lineId ? openSeries : undefined;
        const started = draft ? undefined : startedNames.get(lineId);
        const elsewhere =
          started && row.text && !isSameBareName(started.text, row.text)
            ? nameElsewhere(block, lineId, started.valueId, keyList)
            : undefined;
        const sharedName =
          elsewhere && !isSameBareName(elsewhere.text, row.text) ? elsewhere : undefined;
        return (
          <div key={`row-${lineId}`} className="flex flex-col gap-2">
            <WorkbenchWellLineRow
              knownNames={knownNames}
              row={row}
              lineName={draft?.name ? draft.name : (row.line?.name ?? '')}
              lineOffers={offeredNames(lineId)}
              textPlaceholder={
                index === 0
                  ? `What’s in ${keys.size === 1 ? `this ${noun}` : `these ${plural}`}`
                  : 'Another line'
              }
              seriesText={series && seriesSummary(series, calculation)}
              autoRole={layers.find(layer => layer.line.id === lineId)?.role}
              showsRole={sheet.isPlate}
              canRemove={!draft && rows.length > 1}
              inputRef={index === 0 && focusesFirstRow ? focusOnMount : undefined}
              sharedName={sharedName}
              ratio={row.line && ratioRow(block, keyList, row.line, calculation)}
              onTextChange={text => edit(change => setWellsText(change, keyList, lineId, text))}
              onRenameLine={name => nameRow(target, name)}
              onPartnerChange={partnerId =>
                updateVesselMap(change => setRatioPartner(change, lineId, partnerId))
              }
              onRenameEverywhere={() =>
                started && updateVesselMap(change => renameValue(change, started.valueId, row.text))
              }
              onAmountChange={amount =>
                edit(change => setWellsAmount(change, keyList, lineId, amount))
              }
              onUnitChange={unit => edit(change => setWellsUnit(change, keyList, lineId, unit))}
              onRoleChange={role =>
                updateVesselMap(change => {
                  const line = change.lines.find(candidate => candidate.id === lineId);
                  if (line) line.role = role;
                })
              }
              onToggleMark={mark => updateVesselMap(change => toggleLineMark(change, lineId, mark))}
              onRemove={() =>
                updateVesselMap(change => removeLineFromWells(change, keyList, lineId))
              }
              onPickColor={color => {
                const valueId = row.value?.id;
                if (valueId) updateVesselMap(change => recolorValue(change, valueId, color));
              }}
              onOpenSeries={() =>
                setOpenSeries(
                  seriesFormFor(lineId, row.seriesId, series, {
                    amount: row.amount,
                    unit: row.unit || lineUnitOf(block, lineId),
                  })
                )
              }
            />
            {form && (
              <WorkbenchWellSeriesForm
                form={form}
                isUnnamed={!row.text.trim() && !row.isTextMixed}
                preview={seriesPreview(block, sheet, keys, form, calculation)}
                calculation={calculation}
                startRef={focusOnMount}
                onChange={changeSeries}
                onDone={() => setOpenSeries(undefined)}
                onRemove={
                  form.seriesId === undefined
                    ? undefined
                    : () => form.seriesId && removeOpenSeries(form.seriesId)
                }
              />
            )}
          </div>
        );
      })}
      <button
        type="button"
        className="self-start text-body-sm text-primary hover:underline"
        onClick={() => setDrafts([...shownDrafts, { lineId: createId(), name: '' }])}
      >
        + Line
      </button>
    </div>,
    document.body
  );
}
