/**
 * Modal Keyboard Navigation Hook
 *
 * Industry-standard keyboard shortcuts for modals:
 * - Escape: Close/Cancel (only if focus is inside this modal)
 * - Enter: Handled naturally by HTML <form> elements (not intercepted)
 *
 * Zero technical debt, follows existing keyboard navigation patterns
 *
 * Design Principle: Don't interfere with native browser behavior.
 * HTML forms handle Enter → submit naturally since 1993.
 * React Hook Form leverages this built-in behavior.
 * This hook only adds modal-specific enhancements (Escape to close).
 *
 * Nested Modal Support: When containerRef is provided, Escape only fires
 * if the currently focused element is inside this modal. This prevents
 * parent modals from closing when a child modal handles Escape.
 */

import { useEffect, useCallback, type RefObject } from 'react';

export interface ModalKeyboardNavConfig {
  onEnter?: () => void; // Deprecated - forms should handle Enter naturally
  onEscape?: () => void;
  enabled?: boolean;
  preventDefaultEnter?: boolean; // Deprecated
  preventDefaultEscape?: boolean;
  /** Container ref for focus scoping - only handle Escape if focus is inside */
  containerRef?: RefObject<HTMLElement>;
}

/**
 * Hook for handling keyboard navigation in modals
 * @param config - Configuration for keyboard handlers
 */
export function useModalKeyboardNavigation(config: ModalKeyboardNavConfig) {
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onEnter,
    onEscape,
    enabled = true,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    preventDefaultEnter = true,
    preventDefaultEscape = true,
    containerRef,
  } = config;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      switch (event.key) {
        case 'Escape':
          // If containerRef is provided, only handle Escape if focus is inside this modal
          // This enables proper nested modal behavior - only the topmost modal responds
          if (containerRef?.current) {
            const activeElement = document.activeElement;
            if (!activeElement || !containerRef.current.contains(activeElement)) {
              // Focus is outside this modal, let another modal handle it
              return;
            }
          }

          // Allow Escape to work even when focused on inputs
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

    // Attach to document to capture all keyboard events
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  return {
    enabled,
  };
}
