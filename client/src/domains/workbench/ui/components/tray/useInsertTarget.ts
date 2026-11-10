import { useCallback, useEffect, useRef } from 'react';
import type { FocusEvent, RefObject } from 'react';

import { useInsertTrayStore, type InsertTarget, type TrayMode } from './insertTrayStore';
import { isInInsertTray } from './trayFocus';

interface InsertTargetOptions {
  mode: TrayMode;
  anchorRef: RefObject<HTMLElement>;
  insert: InsertTarget['insert'];
  placeCaretAt?: InsertTarget['placeCaretAt'];
  onLeave?: () => void;
}

export function useInsertTarget({
  mode,
  anchorRef,
  insert,
  placeCaretAt,
  onLeave,
}: InsertTargetOptions) {
  const focusTarget = useInsertTrayStore(state => state.focusTarget);
  const releaseTarget = useInsertTrayStore(state => state.releaseTarget);
  const latest = useRef({ insert, placeCaretAt, onLeave });
  latest.current = { insert, placeCaretAt, onLeave };
  const focusedElement = useRef<HTMLElement>();

  useEffect(
    () => () => {
      const element = focusedElement.current;
      // PITFALL: StrictMode replays this cleanup while the element is still mounted and focused; only a detached element is really gone.
      if (element && !element.isConnected) releaseTarget(element);
    },
    [releaseTarget]
  );

  const onFocus = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      const element = event.currentTarget;
      focusedElement.current = element;
      focusTarget({
        element,
        anchor: anchorRef.current ?? element,
        mode,
        insert: insertion => latest.current.insert(insertion),
        placeCaretAt: (x, y) => latest.current.placeCaretAt?.(x, y),
        leave: () => {
          releaseTarget(element);
          latest.current.onLeave?.();
        },
      });
    },
    [anchorRef, focusTarget, mode, releaseTarget]
  );

  const onBlur = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      if (isInInsertTray(event.relatedTarget)) return;
      focusedElement.current = undefined;
      releaseTarget(event.currentTarget);
    },
    [releaseTarget]
  );

  return { onFocus, onBlur };
}
