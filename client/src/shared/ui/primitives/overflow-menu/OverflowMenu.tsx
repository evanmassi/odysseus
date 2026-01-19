/**
 * OverflowMenu Component
 *
 * A vertical three-dot menu (⋮) that opens a dropdown with action items.
 * Uses portal-based rendering to escape overflow containers.
 */

import { useState, useRef, useEffect, useCallback } from 'react';

import { MoreVertical } from 'lucide-react';
import { createPortal } from 'react-dom';

import type { OverflowMenuProps, OverflowMenuItem } from './types';

function MenuDivider() {
  return <div className="h-px bg-secondary my-1" />;
}

function MenuItem({ item, onClose }: { item: OverflowMenuItem; onClose: () => void }) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={() => {
        if (!item.disabled) {
          item.onClick();
          onClose();
        }
      }}
      disabled={item.disabled}
      className={`
        w-full flex items-center gap-3 py-2 px-3 rounded-md text-sm
        transition-colors duration-150
        disabled:opacity-40 disabled:cursor-not-allowed
        ${item.danger ? 'text-secondary-foreground hover:bg-danger-light hover:text-danger-text' : 'text-secondary-foreground hover:bg-accent'}
      `}
    >
      <Icon
        size={16}
        className={
          item.danger
            ? 'text-muted-foreground group-hover:text-danger-text'
            : 'text-muted-foreground'
        }
      />
      <span>{item.label}</span>
    </button>
  );
}

export function OverflowMenu({
  items,
  dividerBefore = [],
  size = 'md',
  'aria-label': ariaLabel = 'More actions',
}: OverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Calculate position when menu opens
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 160; // min-w-40 = 10rem = 160px
    const menuHeight = items.length * 40 + dividerBefore.length * 8 + 12; // Estimated height
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = rect.bottom + 4;
    let left = rect.right - menuWidth; // Align right edge with trigger

    // Adjust if menu would go off-screen to the left
    if (left < 10) {
      left = rect.left;
    }

    // Adjust if menu would go off-screen to the right
    if (left + menuWidth > viewportWidth - 10) {
      left = viewportWidth - menuWidth - 10;
    }

    // Adjust if menu would go off-screen at the bottom
    if (top + menuHeight > viewportHeight - 10) {
      top = rect.top - menuHeight - 4; // Position above trigger
    }

    setPosition({ top, left });
  }, [items.length, dividerBefore.length]);

  // Update position when opening and on scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => updatePosition();

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedTrigger = triggerRef.current?.contains(target);
      const clickedMenu = menuRef.current?.contains(target);

      if (!clickedTrigger && !clickedMenu) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(prev => !prev);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Size classes for trigger button
  const sizeClasses = size === 'sm' ? 'p-0.5' : 'p-1';
  const iconSize = size === 'sm' ? 14 : 16;

  // Build items with dividers
  const dividerSet = new Set(dividerBefore);

  if (items.length === 0) return null;

  return (
    <>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={`text-muted-foreground hover:text-secondary-foreground hover:bg-accent rounded transition-colors focus-ring-default ${sizeClasses}`}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <MoreVertical size={iconSize} />
      </button>

      {/* Dropdown Menu - rendered via portal */}
      {createPortal(
        <div
          ref={menuRef}
          className={`fixed z-[9999] bg-popover rounded-lg shadow-lg border border-border py-1.5 min-w-40 transition-opacity duration-150 ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            top: position.top,
            left: position.left,
          }}
          role="menu"
          aria-hidden={!isOpen}
        >
          <div className="px-1">
            {items.map((item, index) => (
              <div key={item.label}>
                {dividerSet.has(item.label) && index > 0 && <MenuDivider />}
                <MenuItem item={item} onClose={handleClose} />
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
