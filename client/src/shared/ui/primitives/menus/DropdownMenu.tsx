/**
 * Dropdown Menu
 *
 * Shared container for trigger-anchored dropdown menus with click-outside
 * detection, keyboard navigation, animated open/close, and optional portal rendering.
 */

import { useState, useRef, useEffect, useLayoutEffect, type RefObject } from 'react';

import { createPortal } from 'react-dom';

import { useMenuKeyboardNavigation, useResolvedTheme } from '@shared/hooks';

type DropdownMotion =
  | 'reveal'
  | 'slide-down'
  | 'slide-up'
  | 'slide-right'
  | 'slide-left'
  | 'instant';

const MOTION_CLASSES: Record<DropdownMotion, { in: string; out: string }> = {
  reveal: { in: 'animate-dropdown-reveal-in', out: 'animate-dropdown-reveal-out' },
  'slide-down': { in: 'animate-dropdown-slide-down-in', out: 'animate-dropdown-slide-down-out' },
  'slide-up': { in: 'animate-dropdown-slide-up-in', out: 'animate-dropdown-slide-up-out' },
  'slide-right': { in: 'animate-dropdown-slide-right-in', out: 'animate-dropdown-slide-right-out' },
  'slide-left': { in: 'animate-dropdown-slide-left-in', out: 'animate-dropdown-slide-left-out' },
  instant: { in: 'animate-dropdown-instant-in', out: 'animate-dropdown-instant-out' },
};

export interface DropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: RefObject<HTMLElement>;
  portal?: boolean;
  align?: 'start' | 'end';
  motion?: DropdownMotion;
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
  motion = 'reveal',
  className = '',
  style,
  children,
  'aria-label': ariaLabel,
}: DropdownMenuProps) {
  const theme = useResolvedTheme();
  const menuRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reacts to isOpen changes only — visible is read but intentionally excluded to
  // avoid re-triggering when visible changes (would cancel our own close timeout)
  useLayoutEffect(() => {
    if (isOpen) {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setVisible(true);
    } else if (visible) {
      closeTimeoutRef.current = setTimeout(() => setVisible(false), 200);
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
      if (triggerRef?.current?.contains(target)) return;
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
  const motionClass = MOTION_CLASSES[motion];
  const animationClass = isClosing ? motionClass.out : motionClass.in;

  const alignClass = portal ? '' : align === 'start' ? 'left-0' : 'right-0';
  const positionClass = portal ? 'fixed z-[9999]' : 'absolute z-50';

  const menu = (
    <div
      ref={menuRef}
      role="menu"
      data-theme={theme}
      aria-label={ariaLabel}
      aria-hidden={!isOpen}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className={`${positionClass} isolate bg-popover shadow-lg border border-border py-1.5 ${theme === 'dark' ? 'after:absolute after:inset-0 after:bg-scanlines after:pointer-events-none after:opacity-40 after:mix-blend-multiply' : ''} ${alignClass} ${animationClass} ${className}`}
      style={style}
    >
      {children}
    </div>
  );

  if (portal) return createPortal(menu, document.body);
  return menu;
}
