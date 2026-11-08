import { useEffect, useRef, useState } from 'react';

import { useInsertTrayStore, type TrayInsertion } from './insertTrayStore';

export const PICK_NAME_ATTRIBUTE = 'data-insert-name';
export const PICK_OPERATOR_ATTRIBUTE = 'data-insert-operator';

const DRAG_THRESHOLD_PX = 5;
const PICK_SELECTOR = `[${PICK_NAME_ATTRIBUTE}], [${PICK_OPERATOR_ATTRIBUTE}]`;

interface PickDrag {
  insertion: Extract<TrayInsertion, { kind: 'name' | 'operator' }>;
  startX: number;
  startY: number;
  hasMoved: boolean;
}

interface PickGhost {
  text: string;
  x: number;
  y: number;
}

function pickedInsertion(source: Element): PickDrag['insertion'] | undefined {
  const name = source.getAttribute(PICK_NAME_ATTRIBUTE)?.trim();
  if (name) return { kind: 'name', name };
  const token = source.getAttribute(PICK_OPERATOR_ATTRIBUTE);
  return token ? { kind: 'operator', token } : undefined;
}

const isOverTarget = (element: HTMLElement, x: number, y: number) => {
  const over = document.elementFromPoint(x, y);
  return !!over && element.contains(over);
};

export function useTrayPickDrag(): PickGhost | undefined {
  const [ghost, setGhost] = useState<PickGhost>();
  const drag = useRef<PickDrag>();

  useEffect(() => {
    const currentTarget = () => useInsertTrayStore.getState().target;
    const markDrop = (isOk: boolean) => {
      const target = currentTarget();
      if (target) target.element.toggleAttribute('data-drop-ok', isOk);
    };

    const onMouseDown = (event: MouseEvent) => {
      const target = currentTarget();
      if (!target || event.button !== 0 || !(event.target instanceof Element)) return;
      const source = event.target.closest(PICK_SELECTOR);
      if (!source || target.element.contains(source)) return;
      const insertion = pickedInsertion(source);
      if (!insertion) return;
      event.preventDefault();
      drag.current = { insertion, startX: event.clientX, startY: event.clientY, hasMoved: false };
    };

    const onMouseMove = (event: MouseEvent) => {
      const active = drag.current;
      if (!active) return;
      const distance = Math.hypot(event.clientX - active.startX, event.clientY - active.startY);
      if (!active.hasMoved && distance < DRAG_THRESHOLD_PX) return;
      active.hasMoved = true;
      const { insertion } = active;
      setGhost({
        text: insertion.kind === 'name' ? insertion.name : insertion.token,
        x: event.clientX,
        y: event.clientY,
      });
      const target = currentTarget();
      markDrop(!!target && isOverTarget(target.element, event.clientX, event.clientY));
    };

    const onMouseUp = (event: MouseEvent) => {
      const active = drag.current;
      if (!active) return;
      drag.current = undefined;
      setGhost(undefined);
      markDrop(false);
      const target = currentTarget();
      if (!target) return;
      if (active.hasMoved) {
        if (!isOverTarget(target.element, event.clientX, event.clientY)) return;
        target.placeCaretAt(event.clientX, event.clientY);
      }
      target.insert(active.insertion);
    };

    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp, true);
    return () => {
      document.removeEventListener('mousedown', onMouseDown, true);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp, true);
    };
  }, []);

  return ghost;
}
