/**
 * Modal Keyboard Navigation Hook
 *
 * Industry-standard keyboard shortcuts for modals:
 * - Escape: Close/Cancel
 * - Enter: Handled naturally by HTML <form> elements (not intercepted)
 *
 * Zero technical debt, follows existing keyboard navigation patterns
 *
 * Design Principle: Don't interfere with native browser behavior.
 * HTML forms handle Enter → submit naturally since 1993.
 * React Hook Form leverages this built-in behavior.
 * This hook only adds modal-specific enhancements (Escape to close).
 */

import { useEffect, useCallback } from 'react';

export interface ModalKeyboardNavConfig {
  onEnter?: () => void;  // Deprecated - forms should handle Enter naturally
  onEscape?: () => void;
  enabled?: boolean;
  preventDefaultEnter?: boolean;  // Deprecated
  preventDefaultEscape?: boolean;
}

/**
 * Hook for handling keyboard navigation in modals
 * @param config - Configuration for keyboard handlers
 */
export function useModalKeyboardNav(config: ModalKeyboardNavConfig) {
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onEnter,
    onEscape,
    enabled = true,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    preventDefaultEnter = true,
    preventDefaultEscape = true,
  } = config;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    switch (event.key) {
      case 'Escape':
        // Allow Escape to work even when focused on inputs
        if (preventDefaultEscape) {
          event.preventDefault();
        }
        onEscape?.();
        break;
    }
  }, [enabled, onEscape, preventDefaultEscape]);

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
