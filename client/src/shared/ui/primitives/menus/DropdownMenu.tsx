/**
 * Dropdown Menu
 *
 * Shared container for trigger-anchored dropdown menus with click-outside
 * detection, keyboard navigation, animated open/close, and optional portal rendering.
 */

import { useState, useRef, useEffect, type RefObject } from 'react';

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
  const [isClosing, setIsClosing] = useState(false);
  const wasOpenRef = useRef(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animated close: detect isOpen transitioning from true → false
  useEffect(() => {
    if (wasOpenRef.current && !isOpen && animated) {
      setIsClosing(true);
      closeTimeoutRef.current = setTimeout(() => setIsClosing(false), 200);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, animated]);

  // Cleanup timeout on unmount
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

  const shouldRender = isOpen || isClosing;
  if (!shouldRender) return null;

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
