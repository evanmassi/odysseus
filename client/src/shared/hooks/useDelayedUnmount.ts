/**
 * Delayed Unmount Hook
 *
 * Keeps a subtree mounted for the length of its exit animation after isOpen
 * goes false, so a parent's conditional render doesn't cut the animation short.
 */

import { useState, useEffect, useRef } from 'react';

export function useDelayedUnmount(isOpen: boolean, exitDuration: number): boolean {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (isOpen) {
      setShouldRender(true);
      return;
    }

    timeoutRef.current = setTimeout(() => {
      setShouldRender(false);
    }, exitDuration);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isOpen, exitDuration]);

  return shouldRender;
}
