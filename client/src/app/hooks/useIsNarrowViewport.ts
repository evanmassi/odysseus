/**
 * Narrow Viewport
 *
 * Tracks whether the window is too narrow to lay out the workspace. The three-column
 * layout reserves ~410px for the side panels alone, so the grid stops being usable
 * well before the panels themselves overflow.
 */

import { useEffect, useState } from 'react';

const MIN_WORKSPACE_WIDTH_PX = 900;

const QUERY = `(max-width: ${MIN_WORKSPACE_WIDTH_PX - 1}px)`;

export function useIsNarrowViewport(): boolean {
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia(QUERY);
    const update = (event: MediaQueryListEvent) => setIsNarrow(event.matches);

    setIsNarrow(mediaQuery.matches);
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return isNarrow;
}
