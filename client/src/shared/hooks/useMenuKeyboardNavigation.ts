/**
 * Menu Keyboard Navigation Hook
 *
 * Implements WAI-ARIA Menu Button pattern for accessible dropdown menus.
 * Supports arrow key navigation, Home/End, Escape to close, and focus management.
 */

import { useEffect, useCallback, type RefObject } from 'react';

export interface MenuKeyboardNavigationConfig {
  menuRef: RefObject<HTMLElement>;
  triggerRef?: RefObject<HTMLElement>;
  isOpen: boolean;
  onClose: () => void;
  enabled?: boolean;
}

export function useMenuKeyboardNavigation({
  menuRef,
  triggerRef,
  isOpen,
  onClose,
  enabled = true,
}: MenuKeyboardNavigationConfig) {
  useEffect(() => {
    if (!isOpen || !enabled) return;

    // Small delay to ensure DOM is ready after portal render
    const timeoutId = setTimeout(() => {
      const firstItem = menuRef.current?.querySelector<HTMLElement>(
        'button[role="menuitem"]:not([disabled])'
      );
      firstItem?.focus();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [isOpen, enabled, menuRef]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!enabled) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          triggerRef?.current?.focus();
          break;

        case 'ArrowDown':
        case 'ArrowUp': {
          e.preventDefault();
          const items = menuRef.current?.querySelectorAll<HTMLElement>(
            'button[role="menuitem"]:not([disabled])'
          );
          if (!items?.length) return;

          const currentIndex = Array.from(items).findIndex(item => item === document.activeElement);
          const nextIndex =
            e.key === 'ArrowDown'
              ? (currentIndex + 1) % items.length
              : (currentIndex - 1 + items.length) % items.length;
          items[nextIndex].focus();
          break;
        }

        case 'Home':
        case 'End': {
          e.preventDefault();
          const items = menuRef.current?.querySelectorAll<HTMLElement>(
            'button[role="menuitem"]:not([disabled])'
          );
          if (!items?.length) return;
          items[e.key === 'Home' ? 0 : items.length - 1].focus();
          break;
        }
      }
    },
    [enabled, menuRef, triggerRef, onClose]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      if (!enabled) return;

      // relatedTarget is the element receiving focus — keep open if returning to trigger
      const movingToMenu = menuRef.current?.contains(e.relatedTarget as Node);
      const movingToTrigger = triggerRef?.current?.contains(e.relatedTarget as Node);
      if (!movingToMenu && !movingToTrigger) {
        onClose();
      }
    },
    [enabled, menuRef, triggerRef, onClose]
  );

  return {
    handleKeyDown,
    handleBlur,
  };
}
