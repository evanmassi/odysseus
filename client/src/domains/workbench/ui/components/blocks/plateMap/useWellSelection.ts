import { useCallback, useEffect, useRef, useState } from 'react';

import { keysInRect, movedPoint, type GridPoint } from '../../../../utils/plateMap/wellSelection';

import type { PlateMapSheet, PlateMapPosition } from '../../../../utils/plateMap/plateMapTabs';

interface SelectionState {
  keys: ReadonlySet<string>;
  anchor?: GridPoint;
  cursor?: GridPoint;
}

export interface PressModifiers {
  isExtending: boolean;
  isToggling: boolean;
}

type ModifierKeys = Pick<MouseEvent, 'shiftKey' | 'ctrlKey' | 'metaKey'>;

export const pressModifiers = (event: ModifierKeys): PressModifiers => ({
  isExtending: event.shiftKey,
  isToggling: event.ctrlKey || event.metaKey,
});

const EMPTY: SelectionState = { keys: new Set() };
const DOUBLE_CLICK_DELAY_MS = 300;

export type WellSelection = ReturnType<typeof useWellSelection>;

export function useWellSelection(sheet: PlateMapSheet, tabId: string, onReselect: () => void) {
  const [selection, setSelection] = useState<SelectionState>(EMPTY);
  const dragStart = useRef<GridPoint>();
  const dragBase = useRef<ReadonlySet<string>>(new Set());
  const draggedOver = useRef<string>();
  const pendingNarrow = useRef<ReturnType<typeof setTimeout>>();

  const cancelNarrow = () => {
    clearTimeout(pendingNarrow.current);
    pendingNarrow.current = undefined;
  };

  useEffect(() => setSelection(EMPTY), [tabId]);

  useEffect(() => {
    const endDrag = () => {
      dragStart.current = undefined;
      dragBase.current = new Set();
      draggedOver.current = undefined;
    };
    window.addEventListener('pointerup', endDrag);
    return () => {
      window.removeEventListener('pointerup', endDrag);
      clearTimeout(pendingNarrow.current);
    };
  }, []);

  const selectRect = useCallback(
    (from: GridPoint, to: GridPoint, kept: ReadonlySet<string> = new Set(), anchor = from) =>
      setSelection({
        keys: new Set([...kept, ...keysInRect(sheet, from, to)]),
        anchor,
        cursor: to,
      }),
    [sheet]
  );

  const toggleRect = (from: GridPoint, to: GridPoint) => {
    const touched = keysInRect(sheet, from, to);
    const isAllSelected = touched.every(key => selection.keys.has(key));
    const keys = new Set(selection.keys);
    for (const key of touched) {
      if (isAllSelected) keys.delete(key);
      else keys.add(key);
    }
    setSelection({ keys, anchor: from, cursor: to });
  };

  const press = (position: PlateMapPosition, { isExtending, isToggling }: PressModifiers) => {
    onReselect();
    cancelNarrow();
    const point = { row: position.row, col: position.col };
    draggedOver.current = position.key;
    if (isExtending && selection.anchor) {
      selectRect(selection.anchor, point, isToggling ? selection.keys : new Set());
      return;
    }
    if (isToggling && selection.keys.has(position.key)) {
      toggleRect(point, point);
      return;
    }
    dragStart.current = point;
    dragBase.current = isToggling ? selection.keys : new Set();
    if (!isToggling && selection.keys.has(position.key) && selection.keys.size > 1) {
      pendingNarrow.current = setTimeout(() => selectRect(point, point), DOUBLE_CLICK_DELAY_MS);
      return;
    }
    selectRect(point, point, dragBase.current);
  };

  const dragOver = (position: PlateMapPosition) => {
    if (!dragStart.current || draggedOver.current === position.key) return;
    draggedOver.current = position.key;
    cancelNarrow();
    selectRect(dragStart.current, { row: position.row, col: position.col }, dragBase.current);
  };

  const openAt = (position: PlateMapPosition) => {
    cancelNarrow();
    if (selection.keys.has(position.key)) return;
    const point = { row: position.row, col: position.col };
    selectRect(point, point);
  };

  const move = (rowStep: number, colStep: number, isExtending: boolean) => {
    onReselect();
    const to = movedPoint(
      sheet,
      selection.cursor ?? selection.anchor ?? { row: 0, col: 0 },
      rowStep,
      colStep
    );
    selectRect(isExtending && selection.anchor ? selection.anchor : to, to);
  };

  const lastRow = sheet.rows - 1;
  const lastCol = sheet.cols - 1;

  const selectSpan = (
    start: GridPoint,
    end: GridPoint,
    { isExtending, isToggling }: PressModifiers,
    spanStartFrom: (anchor: GridPoint) => GridPoint
  ) => {
    onReselect();
    if (isExtending && selection.anchor) {
      const from = spanStartFrom(selection.anchor);
      return selectRect(from, end, isToggling ? selection.keys : new Set(), from);
    }
    if (isToggling) return toggleRect(start, end);
    selectRect(start, end);
  };

  const clear = useCallback(() => setSelection(EMPTY), []);

  return {
    keys: selection.keys,
    press,
    dragOver,
    openAt,
    move,
    selectKeys: (keys: Iterable<string>) => setSelection({ keys: new Set(keys) }),
    selectRow: (row: number, modifiers: PressModifiers) =>
      selectSpan({ row, col: 0 }, { row, col: lastCol }, modifiers, from => ({
        row: from.row,
        col: 0,
      })),
    selectColumn: (col: number, modifiers: PressModifiers) =>
      selectSpan({ row: 0, col }, { row: lastRow, col }, modifiers, from => ({
        row: 0,
        col: from.col,
      })),
    selectAll: () => {
      onReselect();
      selectRect({ row: 0, col: 0 }, { row: lastRow, col: lastCol });
    },
    clear,
  };
}
