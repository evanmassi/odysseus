import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

import { createPortal } from 'react-dom';

import { Button } from '@shared/ui';

import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { focusOnMount } from '../../../../utils/dom/focusOnMount';
import { createId } from '../../../../utils/ids/createId';
import { isSameBareName } from '../../../../utils/materials/renameFollowing';
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
  recolorValue,
  nameElsewhere,
  removeLineFromWells,
  renameValue,
  setWellsAmount,
  setWellsText,
  setWellsUnit,
  wellRows,
  type HeldName,
  type WellRow,
} from '../../../../utils/vessels/wellEdits';
import { selectionName } from '../../../../utils/vessels/wellSelection';

import { useUpdateVesselMap } from './useUpdateVesselMap';
import { WorkbenchWellLineRow } from './WorkbenchWellLineRow';
import { WorkbenchWellSeriesForm } from './WorkbenchWellSeriesForm';

import type { lineLayers } from '../../../../utils/vessels/plateLayers';
import type { VesselSheet, VesselTab } from '../../../../utils/vessels/vesselTabs';
import type { PlateLine, VesselMapBlock } from '@odysseus/shared-schemas';

interface OpenSeries {
  form: SeriesForm;
  rowIndex: number;
}

interface WorkbenchWellEditorPanelProps {
  block: VesselMapBlock;
  tab: VesselTab;
  sheet: VesselSheet;
  keys: ReadonlySet<string>;
  startedNames: ReadonlyMap<string, HeldName>;
  colorLine: PlateLine | undefined;
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
const GAP = 12;
const MARGIN = 8;

function placeBeside(anchor: DOMRect, editor: HTMLElement) {
  const width = editor.offsetWidth;
  const height = editor.offsetHeight;
  const fitsRight = anchor.right + GAP + width <= window.innerWidth - MARGIN;
  const fitsLeft = anchor.left - GAP - width >= MARGIN;
  const left = fitsRight
    ? anchor.right + GAP
    : fitsLeft
      ? anchor.left - GAP - width
      : Math.max(MARGIN, Math.min(anchor.left, window.innerWidth - width - MARGIN));
  const top = fitsRight || fitsLeft ? anchor.top : anchor.bottom + MARGIN;
  return { left, top: Math.max(MARGIN, Math.min(top, window.innerHeight - height - MARGIN)) };
}

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
  colorLine,
  layers,
  wellsRef,
  focusesFirstRow,
  onClear,
  onClose,
}: WorkbenchWellEditorPanelProps) {
  const calculation = useWorkbenchStore(state => state.calculation);
  const updateVesselMap = useUpdateVesselMap(block);
  const editorRef = useRef<HTMLDivElement>(null);
  const [blankRows, setBlankRows] = useState(0);
  const [position, setPosition] = useState({ left: -9999, top: 0 });
  const [openSeries, setOpenSeries] = useState<OpenSeries>();
  const keyList = [...keys];
  const rows = [
    ...wellRows(block, keyList, colorLine),
    ...Array.from({ length: blankRows }, () => BLANK_ROW),
  ];
  const { noun, plural } = wordsForTypes(
    tab.kind === 'plate' ? [tab.plate.vessel] : block.sets.map(set => set.vessel)
  );
  const where = selectionName(sheet, keys);
  const count = `${keys.size} ${keys.size === 1 ? noun : plural}`;

  useEffect(() => setOpenSeries(undefined), [keys]);

  const changeSeries = (change: Partial<SeriesForm>) => {
    if (!openSeries) return;
    const next = { ...openSeries.form, ...change };
    const isNewLine = !block.lines.some(line => line.id === next.lineId);
    let { seriesId } = next;
    updateVesselMap(draft => {
      seriesId = writeSeries(draft, sheet, keys, next);
    });
    setOpenSeries({ ...openSeries, form: { ...next, seriesId } });
    if (isNewLine && blankRows) setBlankRows(blankRows - 1);
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

  useLayoutEffect(() => {
    const place = () => {
      const root = wellsRef.current;
      const editor = editorRef.current;
      const anchor = root && selectionBox(root, keys);
      if (anchor && editor) setPosition(placeBeside(anchor, editor));
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [keys, wellsRef, rows.length, openSeries?.rowIndex]);

  return createPortal(
    <div
      ref={editorRef}
      role="dialog"
      aria-label={`Edit ${where || count}`}
      className="fixed z-50 flex w-[420px] max-w-[calc(100vw-16px)] flex-col gap-2 border border-line-mid bg-card p-3 shadow-lg"
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
      {rows.map((row, index) => {
        const series = row.seriesId === undefined ? undefined : block.series[row.seriesId];
        const lineId = row.line?.id;
        const edit = (change: (draft: VesselMapBlock) => void) => {
          updateVesselMap(change);
          if (!lineId && blankRows) setBlankRows(blankRows - 1);
        };
        const form = openSeries?.rowIndex === index ? openSeries.form : undefined;
        const started = lineId ? startedNames.get(lineId) : undefined;
        const elsewhere =
          lineId && started && row.text && !isSameBareName(started.text, row.text)
            ? nameElsewhere(block, lineId, started.valueId, keyList)
            : undefined;
        const sharedName =
          elsewhere && !isSameBareName(elsewhere.text, row.text) ? elsewhere : undefined;
        return (
          <div key={`row-${index}`} className="flex flex-col gap-2">
            <WorkbenchWellLineRow
              row={row}
              textPlaceholder={
                index === 0
                  ? `What’s in ${keys.size === 1 ? `this ${noun}` : `these ${plural}`}`
                  : 'Another line'
              }
              seriesText={series && seriesSummary(series, calculation)}
              autoRole={layers.find(layer => layer.line.id === lineId)?.role}
              showsRole={sheet.isPlate}
              canRemove={!!lineId && rows.length > 1}
              inputRef={index === 0 && focusesFirstRow ? focusOnMount : undefined}
              sharedName={sharedName}
              onTextChange={text => edit(draft => setWellsText(draft, keyList, lineId, text))}
              onRenameEverywhere={() =>
                started && updateVesselMap(draft => renameValue(draft, started.valueId, row.text))
              }
              onAmountChange={amount =>
                edit(draft => setWellsAmount(draft, keyList, lineId, amount))
              }
              onUnitChange={unit => edit(draft => setWellsUnit(draft, keyList, lineId, unit))}
              onRoleChange={role =>
                updateVesselMap(draft => {
                  const line = draft.lines.find(candidate => candidate.id === lineId);
                  if (line) line.role = role;
                })
              }
              onRemove={() =>
                lineId && updateVesselMap(draft => removeLineFromWells(draft, keyList, lineId))
              }
              onPickColor={color => {
                const valueId = row.value?.id;
                if (valueId) updateVesselMap(draft => recolorValue(draft, valueId, color));
              }}
              onOpenSeries={() =>
                setOpenSeries({
                  rowIndex: index,
                  form: seriesFormFor(lineId ?? createId(), row.seriesId, series, {
                    amount: row.amount,
                    unit: row.unit || (lineId ? lineUnitOf(block, lineId) : ''),
                  }),
                })
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
        onClick={() => setBlankRows(blankRows + 1)}
      >
        + Line
      </button>
    </div>,
    document.body
  );
}
