import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent, RefObject } from 'react';

export const STEP_ROW_ATTRIBUTE = 'data-step-id';

const DRAG_THRESHOLD_PX = 4;

export interface StepDrop {
  id: string;
  isAfter: boolean;
}

interface ActiveDrag {
  id: string;
  startX: number;
  startY: number;
  hasMoved: boolean;
  drop?: StepDrop;
}

export function useStepDrag(
  containerRef: RefObject<HTMLElement>,
  onDrop: (id: string, drop: StepDrop) => void
) {
  const [draggingId, setDraggingId] = useState<string>();
  const [drop, setDrop] = useState<StepDrop>();
  const latestOnDrop = useRef(onDrop);
  latestOnDrop.current = onDrop;
  const stopListening = useRef<() => void>();

  useEffect(() => () => stopListening.current?.(), []);

  const startDrag = useCallback(
    (id: string, event: MouseEvent) => {
      event.preventDefault();
      const active: ActiveDrag = {
        id,
        startX: event.clientX,
        startY: event.clientY,
        hasMoved: false,
      };

      const onMove = (move: globalThis.MouseEvent) => {
        const distance = Math.hypot(move.clientX - active.startX, move.clientY - active.startY);
        if (!active.hasMoved && distance < DRAG_THRESHOLD_PX) return;
        active.hasMoved = true;
        setDraggingId(id);
        const row = document
          .elementFromPoint(move.clientX, move.clientY)
          ?.closest<HTMLElement>(`[${STEP_ROW_ATTRIBUTE}]`);
        const rowId = row?.getAttribute(STEP_ROW_ATTRIBUTE);
        if (!row || !rowId || rowId === id || !containerRef.current?.contains(row)) {
          active.drop = undefined;
        } else {
          const rect = row.getBoundingClientRect();
          active.drop = { id: rowId, isAfter: move.clientY > rect.top + rect.height / 2 };
        }
        setDrop(active.drop);
      };

      const onUp = () => {
        stopListening.current?.();
        setDraggingId(undefined);
        setDrop(undefined);
        if (active.hasMoved && active.drop) latestOnDrop.current(id, active.drop);
      };

      stopListening.current?.();
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      stopListening.current = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        stopListening.current = undefined;
      };
    },
    [containerRef]
  );

  return { draggingId, drop, startDrag };
}
