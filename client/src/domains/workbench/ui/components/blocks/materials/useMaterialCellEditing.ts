import { useCallback, useMemo, useRef, useState } from 'react';

export interface MaterialCell {
  itemId: string;
  key: string;
}

export interface MaterialCellEditing {
  cell: MaterialCell | undefined;
  start: (cell: MaterialCell) => void;
  finish: (cell: MaterialCell) => void;
  move: (cell: MaterialCell, step: 1 | -1) => void;
  stop: () => void;
}

export const isSameCell = (a: MaterialCell | undefined, b: MaterialCell | undefined): boolean =>
  !!a && !!b && a.itemId === b.itemId && a.key === b.key;

export function useMaterialCellEditing(
  order: readonly MaterialCell[],
  onLeave: (cell: MaterialCell) => void
): MaterialCellEditing {
  const [cell, setCell] = useState<MaterialCell>();
  const current = useRef<MaterialCell>();
  const latestOrder = useRef(order);
  latestOrder.current = order;

  const show = useCallback(
    (next: MaterialCell | undefined) => {
      const left = current.current;
      current.current = next;
      setCell(next);
      if (left && !isSameCell(left, next)) onLeave(left);
    },
    [onLeave]
  );

  const finish = useCallback(
    (expected: MaterialCell) => {
      if (isSameCell(current.current, expected)) show(undefined);
    },
    [show]
  );

  const move = useCallback(
    (from: MaterialCell, step: 1 | -1) => {
      const cells = latestOrder.current;
      const at = cells.findIndex(candidate => isSameCell(candidate, from));
      show(at < 0 ? undefined : cells[at + step]);
    },
    [show]
  );

  const stop = useCallback(() => show(undefined), [show]);

  return useMemo(
    () => ({ cell, start: show, finish, move, stop }),
    [cell, show, finish, move, stop]
  );
}
