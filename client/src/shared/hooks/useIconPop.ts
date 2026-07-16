/**
 * Icon Pop
 *
 * Hover animation flag that self-clears after a delay, cancelling any prior timer and on unmount.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export function useIconPop(durationMs = 350): { isAnimating: boolean; trigger: () => void } {
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const trigger = useCallback(() => {
    setIsAnimating(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsAnimating(false), durationMs);
  }, [durationMs]);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  return { isAnimating, trigger };
}
