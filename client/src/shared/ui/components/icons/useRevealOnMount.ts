/**
 * Reveal On Mount
 *
 * Flips to true shortly after mount so an entrance transition plays from the
 * initial hidden state instead of appearing already-complete.
 */

import { useEffect, useState } from 'react';

const REVEAL_DELAY_MS = 50;

export function useRevealOnMount(): boolean {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return isVisible;
}
