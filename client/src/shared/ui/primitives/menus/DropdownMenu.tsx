/**
 * Dropdown Menu
 *
 * Shared container for trigger-anchored dropdown menus with click-outside
 * detection, keyboard navigation, animated open/close, and optional portal rendering.
 */

import { useState, useRef, useEffect, useLayoutEffect, type RefObject } from 'react';

import { createPortal } from 'react-dom';

import { useMenuKeyboardNavigation } from '@shared/hooks';

export interface DropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLElement>;
  portal?: boolean;
  align?: 'start' | 'end';
  animated?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  'aria-label'?: string;
}

export function DropdownMenu({
  isOpen,
  onClose,
  triggerRef,
  portal = false,
  align = 'end',
  animated = true,
  className = '',
  style,
  children,
  'aria-label': ariaLabel,
}: DropdownMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reacts to isOpen changes only — visible and animated are read but intentionally
  // excluded to avoid re-triggering when visible changes (would cancel our own timeout)
  useLayoutEffect(() => {
    if (isOpen) {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setVisible(true);
    } else if (visible && animated) {
      closeTimeoutRef.current = setTimeout(() => setVisible(false), 200);
    } else {
      setVisible(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // Click-outside detection
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, triggerRef]);

  // Keyboard navigation
  const { handleKeyDown, handleBlur } = useMenuKeyboardNavigation({
    menuRef,
    triggerRef,
    isOpen,
    onClose,
  });

  if (!visible) return null;

  const isClosing = !isOpen && visible;
  const animationClass = animated
    ? isClosing
      ? 'animate-dropdown-reveal-out'
      : 'animate-dropdown-reveal-in'
    : '';

  const alignClass = portal ? '' : align === 'start' ? 'left-0' : 'right-0';
  const positionClass = portal ? 'fixed z-[9999]' : 'absolute z-50';

  const menu = (
    <div
      ref={menuRef}
      role="menu"
      aria-label={ariaLabel}
      aria-hidden={!isOpen}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className={`${positionClass} bg-popover rounded-lg shadow-lg border border-border py-1.5 ${alignClass} ${animationClass} ${className}`}
      style={style}
    >
      {children}
    </div>
  );

  if (portal) return createPortal(menu, document.body);
  return menu;
}
