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
