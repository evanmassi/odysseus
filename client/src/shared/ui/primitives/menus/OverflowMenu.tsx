/**
 * Overflow Menu
 *
 * Three-dot dropdown menu with portal rendering and viewport collision detection.
 */

import { useState, useRef, useEffect, useCallback } from 'react';

import { MoreVertical } from 'lucide-react';

import { DropdownMenu } from './DropdownMenu';
import { MenuDivider } from './MenuDivider';
import { MenuItem } from './MenuItem';

import type { OverflowMenuProps } from './types';

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

  // Calculate position when menu opens
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 160;
    const menuHeight = items.length * 40 + dividerBefore.length * 8 + 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = rect.bottom + 4;
    let left = rect.right - menuWidth;
    let vertical: 'below' | 'above' = 'below';
    let horizontal: 'right' | 'left' = 'right';

    if (left < 10) {
      left = rect.left;
      horizontal = 'left';
    }

    if (left + menuWidth > viewportWidth - 10) {
      left = viewportWidth - menuWidth - 10;
    }

    if (top + menuHeight > viewportHeight - 10) {
      top = rect.top - menuHeight - 4;
      vertical = 'above';
    }

    setPosition({ top, left });
    setPlacement({ vertical, horizontal });
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
        <div className="px-1">
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
