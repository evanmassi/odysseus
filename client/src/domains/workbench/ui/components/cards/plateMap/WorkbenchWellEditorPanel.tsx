import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

import { Plus } from 'lucide-react';
import { createPortal } from 'react-dom';

import { Button } from '@shared/ui';

import { usePlacedBeside } from '../../../../hooks/usePlacedBeside';
import { useWorkbenchData } from '../../../../hooks/useWorkbenchSlice';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { focusOnMount } from '../../../../utils/dom/focusOnMount';
import { createId } from '../../../../utils/ids/createId';
import { isSameBareName } from '../../../../utils/materials/renameFollowing';
import { ratioRow } from '../../../../utils/plateMap/cellRatios';
import { MIXED_LABWARE_WORDS, wordsForTypes } from '../../../../utils/plateMap/labwareCatalog';
import { seriesSummary } from '../../../../utils/plateMap/plateSeries';
import {
  lineUnitOf,
  removeSeries,
  seriesFormFor,
  seriesPreview,
  writeSeries,
  type SeriesForm,
} from '../../../../utils/plateMap/seriesEdits';
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
  toggleIndicatorPart,
  startingLineId,
  wellRows,
  type HeldName,
  type WellRow,
} from '../../../../utils/plateMap/wellEdits';
import { selectionName } from '../../../../utils/plateMap/wellSelection';
import { knownNamesIn } from '../../../../utils/plateMap/wellValueSuggestions';
import { ADD_ICON } from '../../board/addIconClass';
import { POPOUT_PANEL } from '../../board/popoutPanelClass';

import { useUpdatePlateMap } from './useUpdatePlateMap';
import { WorkbenchWellLineRow } from './WorkbenchWellLineRow';
import { WorkbenchWellSeriesForm } from './WorkbenchWellSeriesForm';

import type { lineLayers } from '../../../../utils/plateMap/plateLayers';
import type { PlateMapSheet, PlateMapTab } from '../../../../utils/plateMap/plateMapTabs';
import type { ShownPlateMap } from '../../../../utils/plateMap/shownPlateMap';
import type { PlateMap } from '@odysseus/shared-schemas';

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
  card: ShownPlateMap;
  tab: PlateMapTab;
  sheet: PlateMapSheet;
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
  card,
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
  const board = useWorkbenchStore(state => state.board);
  const knownNames = useWorkbenchData(state => knownNamesIn(state.protocol));
  const updatePlateMap = useUpdatePlateMap(card.id);
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionAnchor = useCallback(
    () => (wellsRef.current ? selectionBox(wellsRef.current, keys) : undefined),
    [wellsRef, keys]
  );
  const editorPosition = usePlacedBeside(editorRef, selectionAnchor);
  const [drafts, setDrafts] = useState<DraftLine[]>([]);
  const [freshLineId] = useState(createId);
  const [openSeries, setOpenSeries] = useState<SeriesForm>();
  const keyList = [...keys];
  const onWells = wellRows(card, keyList).flatMap(row =>
    row.line ? [{ row, lineId: row.line.id, draft: undefined }] : []
  );
  const shownDrafts: DraftLine[] =
    onWells.length || drafts.length
      ? drafts
      : [{ lineId: startingLineId(card, keyList) ?? freshLineId, name: '' }];
  const rows: EditorRow[] = [
    ...onWells,
    ...shownDrafts.map(draft => ({
      row: { ...BLANK_ROW, line: card.lines.find(line => line.id === draft.lineId) },
      lineId: draft.lineId,
      draft,
    })),
  ];
  const offeredNames = (lineId: string) => [
    ...new Set(
      linesOffWells(card, keyList)
        .filter(line => line.id !== lineId && !shownDrafts.some(draft => draft.lineId === line.id))
        .map(line => line.name)
    ),
  ];
  const words = wordsForTypes(
    tab.kind === 'plate' ? [tab.plate.labware] : card.otherLabware.map(set => set.labware)
  );
  const { noun, plural } = words;
  const where = selectionName(sheet, keys);
  const count =
    words === MIXED_LABWARE_WORDS
      ? `${keys.size} selected`
      : `${keys.size} ${keys.size === 1 ? noun : plural}`;

  useEffect(() => {
    setOpenSeries(undefined);
    setDrafts([]);
  }, [keys]);

  const writeRow = (target: EditorRow, change: (draft: PlateMap) => void) => {
    const pending = target.draft;
    updatePlateMap(draft => {
      change(draft);
      if (pending?.name) renameLine(draft, target.lineId, pending.name);
    });
    if (pending) setDrafts(shownDrafts.filter(draft => draft !== pending));
  };

  const nameRow = (target: EditorRow, name: string) => {
    const existing = lineNamed(card, keyList, name);
    if (target.draft) {
      const next = existing ? { lineId: existing.id, name: '' } : { lineId: createId(), name };
      setDrafts(shownDrafts.map(draft => (draft === target.draft ? next : draft)));
      return;
    }
    updatePlateMap(draft =>
      existing
        ? moveWellsToLine(draft, keyList, target.lineId, existing.id)
        : renameLine(draft, target.lineId, name)
    );
  };

  const changeSeries = (change: Partial<SeriesForm>) => {
    if (!openSeries) return;
    const next = { ...openSeries, ...change };
    let { seriesId } = next;
    const write = (draft: PlateMap) => {
      seriesId = writeSeries(draft, sheet, keys, next);
    };
    const target = rows.find(candidate => candidate.lineId === next.lineId);
    if (target) writeRow(target, write);
    else updatePlateMap(write);
    setOpenSeries({ ...next, seriesId });
  };

  const removeOpenSeries = (seriesId: string) => {
    updatePlateMap(draft => removeSeries(draft, seriesId));
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
      style={editorPosition}
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
        const series = row.seriesId === undefined ? undefined : card.series[row.seriesId];
        const edit = (change: (draft: PlateMap) => void) => writeRow(target, change);
        const form = openSeries?.lineId === lineId ? openSeries : undefined;
        const started = draft ? undefined : startedNames.get(lineId);
        const elsewhere =
          started && row.text && !isSameBareName(started.text, row.text)
            ? nameElsewhere(card, lineId, started.valueId, keyList)
            : undefined;
        const sharedName =
          elsewhere && !isSameBareName(elsewhere.text, row.text) ? elsewhere : undefined;
        return (
          <div key={`row-${lineId}`} className="flex flex-col gap-2">
            <WorkbenchWellLineRow
              words={words}
              knownNames={knownNames}
              row={row}
              lineName={draft?.name ? draft.name : (row.line?.name ?? '')}
              lineOffers={offeredNames(lineId)}
              textPlaceholder={
                index === 0
                  ? `What's in ${keys.size === 1 ? `this ${noun}` : `these ${plural}`}`
                  : 'Another line'
              }
              seriesText={series && seriesSummary(series, board)}
              autoRole={layers.find(layer => layer.line.id === lineId)?.role}
              showsRole={sheet.isPlate}
              canRemove={!draft && rows.length > 1}
              inputRef={index === 0 && focusesFirstRow ? focusOnMount : undefined}
              sharedName={sharedName}
              ratio={row.line && ratioRow(card, keyList, row.line, board)}
              onTextChange={text => edit(change => setWellsText(change, keyList, lineId, text))}
              onRenameLine={name => nameRow(target, name)}
              onPartnerChange={partnerId =>
                updatePlateMap(change => setRatioPartner(change, lineId, partnerId))
              }
              onRenameEverywhere={() =>
                started && updatePlateMap(change => renameValue(change, started.valueId, row.text))
              }
              onAmountChange={amount =>
                edit(change => setWellsAmount(change, keyList, lineId, amount))
              }
              onUnitChange={unit => edit(change => setWellsUnit(change, keyList, lineId, unit))}
              onRoleChange={role =>
                updatePlateMap(change => {
                  const line = change.lines.find(candidate => candidate.id === lineId);
                  if (line) line.role = role;
                })
              }
              onToggleIndicatorPart={part =>
                updatePlateMap(change => toggleIndicatorPart(change, lineId, part))
              }
              onRemove={() =>
                updatePlateMap(change => removeLineFromWells(change, keyList, lineId))
              }
              onPickColor={color => {
                const valueId = row.value?.id;
                if (valueId) updatePlateMap(change => recolorValue(change, valueId, color));
              }}
              onOpenSeries={() =>
                setOpenSeries(
                  seriesFormFor(lineId, row.seriesId, series, {
                    amount: row.amount,
                    unit: row.unit || lineUnitOf(card, lineId),
                  })
                )
              }
            />
            {form && (
              <WorkbenchWellSeriesForm
                words={words}
                form={form}
                isUnnamed={!row.text.trim() && !row.isTextMixed}
                preview={seriesPreview(card, sheet, keys, form, board)}
                board={board}
                firstFieldRef={focusOnMount}
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
        className="inline-flex items-center gap-1 self-start text-body-sm text-primary hover:underline"
        onClick={() => setDrafts([...shownDrafts, { lineId: createId(), name: '' }])}
      >
        <Plus aria-hidden className={ADD_ICON} />
        Add line
      </button>
    </div>,
    document.body
  );
}
