import { useCallback, useEffect, useRef, useState } from 'react';

import { keysInRect, movedPoint, type GridPoint } from '../../../../utils/vessels/wellSelection';

import type { VesselSheet, VesselSpot } from '../../../../utils/vessels/vesselTabs';

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

export type WellSelection = ReturnType<typeof useWellSelection>;

export function useWellSelection(
  sheet: VesselSheet,
  tabId: string,
  expand: (keys: ReadonlySet<string>) => ReadonlySet<string>,
  onReselect: () => void
) {
  const [selection, setSelection] = useState<SelectionState>(EMPTY);
  const dragStart = useRef<GridPoint>();
  const dragBase = useRef<ReadonlySet<string>>(new Set());

  useEffect(() => setSelection(EMPTY), [tabId]);

  useEffect(() => {
    const endDrag = () => {
      dragStart.current = undefined;
      dragBase.current = new Set();
    };
    window.addEventListener('pointerup', endDrag);
    return () => window.removeEventListener('pointerup', endDrag);
  }, []);

  const selectRect = useCallback(
    (from: GridPoint, to: GridPoint, kept: ReadonlySet<string> = new Set(), anchor = from) =>
      setSelection({
        keys: new Set([...kept, ...expand(new Set(keysInRect(sheet, from, to)))]),
        anchor,
        cursor: to,
      }),
    [sheet, expand]
  );

  const toggleRect = (from: GridPoint, to: GridPoint) => {
    const touched = expand(new Set(keysInRect(sheet, from, to)));
    const isAllSelected = [...touched].every(key => selection.keys.has(key));
    const keys = new Set(selection.keys);
    for (const key of touched) {
      if (isAllSelected) keys.delete(key);
      else keys.add(key);
    }
    setSelection({ keys, anchor: from, cursor: to });
  };

  const press = (spot: VesselSpot, { isExtending, isToggling }: PressModifiers) => {
    onReselect();
    const point = { row: spot.row, col: spot.col };
    if (isToggling && selection.keys.has(spot.key)) {
      toggleRect(point, point);
      return;
    }
    if (isToggling) {
      dragStart.current = point;
      dragBase.current = selection.keys;
      selectRect(point, point, selection.keys);
      return;
    }
    const own = expand(new Set([spot.key]));
    const isAlreadyAlone =
      !isExtending &&
      selection.keys.size === own.size &&
      [...own].every(key => selection.keys.has(key));
    if (isAlreadyAlone) {
      setSelection(EMPTY);
      return;
    }
    const start = isExtending && selection.anchor ? selection.anchor : point;
    dragStart.current = start;
    selectRect(start, point);
  };

  const dragOver = (spot: VesselSpot) => {
    if (dragStart.current) {
      selectRect(dragStart.current, { row: spot.row, col: spot.col }, dragBase.current);
    }
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
    if (isToggling) return toggleRect(start, end);
    if (isExtending && selection.anchor) {
      const from = spanStartFrom(selection.anchor);
      return selectRect(from, end, new Set(), from);
    }
    selectRect(start, end);
  };

  return {
    keys: selection.keys,
    press,
    dragOver,
    move,
    selectKeys: (keys: Iterable<string>) => setSelection({ keys: expand(new Set(keys)) }),
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
    clear: () => setSelection(EMPTY),
  };
}
