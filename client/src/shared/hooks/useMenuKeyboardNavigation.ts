/**
 * Menu Keyboard Navigation Hook
 *
 * Implements WAI-ARIA Menu Button pattern for accessible dropdown menus.
 */

import { useEffect, useCallback, type RefObject } from 'react';

const MENU_ITEM_SELECTOR = 'button[role="menuitem"]:not([disabled])';

interface MenuKeyboardNavigationConfig {
  menuRef: RefObject<HTMLElement>;
  triggerRef?: RefObject<HTMLElement>;
  isOpen: boolean;
  onClose: () => void;
}

export function useMenuKeyboardNavigation({
  menuRef,
  triggerRef,
  isOpen,
  onClose,
}: MenuKeyboardNavigationConfig) {
  useEffect(() => {
    if (!isOpen) return;

    // Small delay to ensure DOM is ready after portal render
    const timeoutId = setTimeout(() => {
      const firstItem = menuRef.current?.querySelector<HTMLElement>(MENU_ITEM_SELECTOR);
      firstItem?.focus();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [isOpen, menuRef]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          triggerRef?.current?.focus();
          break;

        case 'ArrowDown':
        case 'ArrowUp': {
          e.preventDefault();
          const items = menuRef.current?.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR);
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
          const items = menuRef.current?.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR);
          if (!items?.length) return;
          items[e.key === 'Home' ? 0 : items.length - 1].focus();
          break;
        }
      }
    },
    [menuRef, triggerRef, onClose]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      // relatedTarget is the element receiving focus — keep open if returning to trigger
      const movingToMenu = menuRef.current?.contains(e.relatedTarget as Node);
      const movingToTrigger = triggerRef?.current?.contains(e.relatedTarget as Node);
      if (!movingToMenu && !movingToTrigger) {
        onClose();
      }
    },
    [menuRef, triggerRef, onClose]
  );

  return {
    handleKeyDown,
    handleBlur,
  };
}
