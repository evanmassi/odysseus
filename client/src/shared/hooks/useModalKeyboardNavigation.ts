/**
 * Modal Keyboard Navigation Hook
 *
 * Handles Escape-to-close with nested modal support via focus scoping.
 * Enter is intentionally not intercepted — HTML forms handle it natively.
 */

import { useEffect, useCallback, type RefObject } from 'react';

export interface ModalKeyboardNavConfig {
  onEscape?: () => void;
  enabled?: boolean;
  preventDefaultEscape?: boolean;
  containerRef?: RefObject<HTMLElement>;
}

export function useModalKeyboardNavigation(config: ModalKeyboardNavConfig) {
  const { onEscape, enabled = true, preventDefaultEscape = true, containerRef } = config;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      switch (event.key) {
        case 'Escape':
          // Only the topmost modal responds when nested modals are open
          if (containerRef?.current) {
            const activeElement = document.activeElement;
            if (!activeElement || !containerRef.current.contains(activeElement)) {
              return;
            }
          }

          if (preventDefaultEscape) {
            event.preventDefault();
          }
          onEscape?.();
          break;
      }
    },
    [enabled, onEscape, preventDefaultEscape, containerRef]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}
