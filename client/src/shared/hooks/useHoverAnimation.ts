/**
 * Hover Animation Hook
 *
 * Triggers an animation on each hover of an element.
 */
import { useState, useCallback } from 'react';

interface UseHoverAnimationReturn {
  isAnimating: boolean;
  onMouseEnter: () => void;
}

export function useHoverAnimation(): UseHoverAnimationReturn {
  const [isAnimating, setIsAnimating] = useState(false);

  const onMouseEnter = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 350);
  }, []);

  return { isAnimating, onMouseEnter };
}
