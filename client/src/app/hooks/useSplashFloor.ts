/**
 * Splash Floor
 *
 * Holds the boot splash on screen for a minimum duration so a fast bootstrap
 * doesn't flash-and-vanish (which reads as a flicker, not a screen). Returns
 * true once `ready` is set AND the floor has elapsed since first mount.
 */

import { useEffect, useRef, useState } from 'react';

export function useSplashFloor(ready: boolean, minMs: number): boolean {
  const startRef = useRef(performance.now());
  const [floorElapsed, setFloorElapsed] = useState(false);

  useEffect(() => {
    const remaining = minMs - (performance.now() - startRef.current);
    if (remaining <= 0) {
      setFloorElapsed(true);
      return;
    }
    const timer = setTimeout(() => setFloorElapsed(true), remaining);
    return () => clearTimeout(timer);
  }, [minMs]);

  return ready && floorElapsed;
}
