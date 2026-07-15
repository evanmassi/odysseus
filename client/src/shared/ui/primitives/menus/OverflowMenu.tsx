/**
 * Overflow Menu
 *
 * Three-dot dropdown menu with portal rendering and viewport collision detection.
 */

import { useState, useRef, useLayoutEffect, useCallback } from 'react';

import { MoreVertical } from 'lucide-react';

import { DropdownMenu } from './DropdownMenu';
import { MenuDivider } from './MenuDivider';
import { MenuItem } from './MenuItem';

import type { OverflowMenuProps } from './types';

// Width mirrors the DropdownMenu's min-w-40 (10rem) so the flip math matches the render.
const MENU_WIDTH = 160;
const ITEM_HEIGHT = 40;
const DIVIDER_HEIGHT = 8;
const MENU_PADDING_Y = 12;
const TRIGGER_GAP = 4;
const VIEWPORT_MARGIN = 10;

export function OverflowMenu({
  items,
  dividerBefore = [],
  size = 'md',
  'aria-label': ariaLabel = 'More actions',
}: OverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [placement, setPlacement] = useState<{
    vertical: 'below' | 'above';
    horizontal: 'right' | 'left';
  }>({
    vertical: 'below',
    horizontal: 'right',
  });

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const menuHeight =
      items.length * ITEM_HEIGHT + dividerBefore.length * DIVIDER_HEIGHT + MENU_PADDING_Y;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = rect.bottom + TRIGGER_GAP;
    let left = rect.right - MENU_WIDTH;
    let vertical: 'below' | 'above' = 'below';
    let horizontal: 'right' | 'left' = 'right';

    if (left < VIEWPORT_MARGIN) {
      left = rect.left;
      horizontal = 'left';
    }

    if (left + MENU_WIDTH > viewportWidth - VIEWPORT_MARGIN) {
      left = viewportWidth - MENU_WIDTH - VIEWPORT_MARGIN;
    }

    if (top + menuHeight > viewportHeight - VIEWPORT_MARGIN) {
      top = rect.top - menuHeight - TRIGGER_GAP;
      vertical = 'above';
    }

    setPosition({ top, left });
    setPlacement({ vertical, horizontal });
  }, [items.length, dividerBefore.length]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    updatePosition();

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  const handleToggle = () => {
    setIsOpen(prev => !prev);
  };

  const sizeClasses = size === 'sm' ? 'p-0.5' : 'p-1';
  const iconSize = size === 'sm' ? 14 : 16;

  const dividerSet = new Set(dividerBefore);

  if (items.length === 0) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={`text-muted-foreground hover:text-secondary-foreground hover:bg-accent rounded transition-colors ${sizeClasses}`}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <MoreVertical size={iconSize} />
      </button>

      <DropdownMenu
        isOpen={isOpen}
        onClose={handleClose}
        triggerRef={triggerRef}
        portal
        motion={placement.vertical === 'above' ? 'slide-up' : 'slide-down'}
        aria-label={ariaLabel}
        className="min-w-40"
        style={{
          top: position.top,
          left: position.left,
          transformOrigin: `${placement.vertical === 'above' ? 'bottom' : 'top'} ${placement.horizontal}`,
        }}
      >
        <div>
          {items.map((item, index) => (
            <div key={item.label}>
              {dividerSet.has(item.label) && index > 0 && <MenuDivider />}
              <MenuItem
                icon={item.icon}
                label={item.label}
                onClick={() => {
                  item.onClick();
                  handleClose();
                }}
                danger={item.danger}
                warning={item.warning}
                disabled={item.disabled}
              />
            </div>
          ))}
        </div>
      </DropdownMenu>
    </>
  );
}
