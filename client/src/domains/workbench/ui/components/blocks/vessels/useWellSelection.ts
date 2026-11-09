import { useCallback, useEffect, useRef, useState } from 'react';

import { keysInRect, movedPoint, type GridPoint } from '../../../../utils/vessels/wellSelection';

import type { VesselSheet, VesselSpot } from '../../../../utils/vessels/vesselTabs';

interface SelectionState {
  keys: ReadonlySet<string>;
  anchor?: GridPoint;
  cursor?: GridPoint;
}

interface PressModifiers {
  isExtending: boolean;
  isToggling: boolean;
}

const EMPTY: SelectionState = { keys: new Set() };

export type WellSelection = ReturnType<typeof useWellSelection>;

export function useWellSelection(
  sheet: VesselSheet,
  tabId: string,
  expand: (keys: ReadonlySet<string>) => ReadonlySet<string>,
  onDragEnd: () => void
) {
  const [selection, setSelection] = useState<SelectionState>(EMPTY);
  const dragStart = useRef<GridPoint>();

  useEffect(() => setSelection(EMPTY), [tabId]);

  useEffect(() => {
    const endDrag = () => {
      if (!dragStart.current) return;
      dragStart.current = undefined;
      onDragEnd();
    };
    window.addEventListener('pointerup', endDrag);
    return () => window.removeEventListener('pointerup', endDrag);
  }, [onDragEnd]);

  const selectRect = useCallback(
    (from: GridPoint, to: GridPoint, anchor = from) =>
      setSelection({ keys: expand(new Set(keysInRect(sheet, from, to))), anchor, cursor: to }),
    [sheet, expand]
  );

  const press = (spot: VesselSpot, { isExtending, isToggling }: PressModifiers) => {
    const point = { row: spot.row, col: spot.col };
    if (isToggling) {
      const touched = expand(new Set([spot.key]));
      const keys = new Set(selection.keys);
      for (const key of touched) {
        if (selection.keys.has(spot.key)) keys.delete(key);
        else keys.add(key);
      }
      setSelection({ keys, anchor: point, cursor: point });
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
    if (dragStart.current) selectRect(dragStart.current, { row: spot.row, col: spot.col });
  };

  const move = (rowStep: number, colStep: number, isExtending: boolean) => {
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

  return {
    keys: selection.keys,
    press,
    dragOver,
    move,
    selectKeys: (keys: Iterable<string>) => setSelection({ keys: expand(new Set(keys)) }),
    selectRow: (row: number) => selectRect({ row, col: 0 }, { row, col: lastCol }),
    selectColumn: (col: number) => selectRect({ row: 0, col }, { row: lastRow, col }),
    selectAll: () => selectRect({ row: 0, col: 0 }, { row: lastRow, col: lastCol }),
    clear: () => setSelection(EMPTY),
  };
}
