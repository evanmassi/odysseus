import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

import { createPortal } from 'react-dom';

import { Button } from '@shared/ui';

import { focusOnMount } from '../../../../utils/dom/focusOnMount';
import { seriesSummary } from '../../../../utils/vessels/plateSeries';
import { wordsForTypes } from '../../../../utils/vessels/vesselCatalog';
import {
  removeLineFromWells,
  setWellsAmount,
  setWellsText,
  setWellsUnit,
  wellRows,
  type WellRow,
} from '../../../../utils/vessels/wellEdits';
import { selectionName } from '../../../../utils/vessels/wellSelection';

import { useUpdateVesselMap } from './useUpdateVesselMap';
import { WorkbenchWellLineRow } from './WorkbenchWellLineRow';

import type { BoardCalculation } from '../../../../utils/formulas/boardCalculation';
import type { lineLayers } from '../../../../utils/vessels/plateLayers';
import type { VesselSheet, VesselTab } from '../../../../utils/vessels/vesselTabs';
import type { PlateLine, VesselMapBlock } from '@odysseus/shared-schemas';

interface WorkbenchWellEditorPanelProps {
  block: VesselMapBlock;
  tab: VesselTab;
  sheet: VesselSheet;
  keys: ReadonlySet<string>;
  colorLine: PlateLine | undefined;
  layers: ReturnType<typeof lineLayers>;
  calculation: BoardCalculation;
  wellsRef: RefObject<HTMLElement>;
  focusesFirstRow: boolean;
  onClear: () => void;
  onClose: () => void;
}

const BLANK_ROW: WellRow = {
  line: undefined,
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
  colorLine,
  layers,
  calculation,
  wellsRef,
  focusesFirstRow,
  onClear,
  onClose,
}: WorkbenchWellEditorPanelProps) {
  const updateVesselMap = useUpdateVesselMap(block);
  const editorRef = useRef<HTMLDivElement>(null);
  const [blankRows, setBlankRows] = useState(0);
  const [position, setPosition] = useState({ left: -9999, top: 0 });
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
  }, [keys, wellsRef, rows.length]);

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
        return (
          <WorkbenchWellLineRow
            key={`row-${index}`}
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
            onTextChange={text => edit(draft => setWellsText(draft, keyList, lineId, text))}
            onAmountChange={amount => edit(draft => setWellsAmount(draft, keyList, lineId, amount))}
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
          />
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
