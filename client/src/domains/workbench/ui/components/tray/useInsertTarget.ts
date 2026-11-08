import { useCallback, useEffect, useRef } from 'react';
import type { FocusEvent, RefObject } from 'react';

import { useInsertTrayStore, type InsertTarget, type TrayMode } from './insertTrayStore';

interface InsertTargetOptions {
  mode: TrayMode;
  anchorRef: RefObject<HTMLElement>;
  insert: InsertTarget['insert'];
  placeCaretAt?: InsertTarget['placeCaretAt'];
}

export function useInsertTarget({ mode, anchorRef, insert, placeCaretAt }: InsertTargetOptions) {
  const focusTarget = useInsertTrayStore(state => state.focusTarget);
  const releaseTarget = useInsertTrayStore(state => state.releaseTarget);
  const latest = useRef({ insert, placeCaretAt });
  latest.current = { insert, placeCaretAt };
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
      });
    },
    [anchorRef, focusTarget, mode]
  );

  const onBlur = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      focusedElement.current = undefined;
      releaseTarget(event.currentTarget);
    },
    [releaseTarget]
  );

  return { onFocus, onBlur };
}
