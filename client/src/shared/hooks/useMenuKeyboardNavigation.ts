/**
 * Menu Keyboard Navigation Hook
 *
 * Implements WAI-ARIA Menu Button pattern for accessible dropdown menus.
 * Supports arrow key navigation, Home/End, Escape to close, and focus management.
 */

import { useEffect, useCallback, type RefObject } from 'react';

export interface MenuKeyboardNavigationConfig {
  /** Ref to the menu container element */
  menuRef: RefObject<HTMLElement>;
  /** Ref to the trigger button (for returning focus on close) */
  triggerRef?: RefObject<HTMLElement>;
  /** Whether the menu is currently open */
  isOpen: boolean;
  /** Callback to close the menu */
  onClose: () => void;
  /** Whether keyboard navigation is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook for handling keyboard navigation in dropdown menus
 *
 * Features:
 * - ArrowDown/ArrowUp: Navigate between menu items (wraps around)
 * - Home/End: Jump to first/last item
 * - Escape: Close menu and return focus to trigger
 * - Tab: Close menu (via onBlur)
 * - Auto-focus first item when menu opens
 */
export function useMenuKeyboardNavigation({
  menuRef,
  triggerRef,
  isOpen,
  onClose,
  enabled = true,
}: MenuKeyboardNavigationConfig) {
  // Focus first menu item when menu opens
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

  // Keyboard event handler
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

  // Close menu when focus leaves the container
  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      if (!enabled) return;

      // relatedTarget is the element receiving focus
      // Only close if focus is moving outside the menu container
      if (!menuRef.current?.contains(e.relatedTarget as Node)) {
        onClose();
      }
    },
    [enabled, menuRef, onClose]
  );

  return {
    handleKeyDown,
    handleBlur,
  };
}
