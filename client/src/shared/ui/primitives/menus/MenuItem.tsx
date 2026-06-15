/**
 * Menu Item
 *
 * Shared item component for dropdown menus, overflow menus, and context menus.
 */

import { useState, useCallback } from 'react';

import type { MenuItemProps } from './types';

export function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger = false,
  warning = false,
  disabled = false,
  shortcut,
  isActive = false,
  children,
}: MenuItemProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 350);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      disabled={disabled}
      className={`
        group relative z-10 w-full flex items-center justify-between py-2 px-3 font-mono text-[12px] tracking-[0.04em]
        transition-colors duration-150
        disabled:opacity-40 disabled:cursor-not-allowed
        ${
          isActive
            ? 'bg-primary/[0.08] text-foreground font-medium'
            : danger
              ? 'text-danger-text hover:bg-danger-light'
              : warning
                ? 'text-warning-text hover:bg-warning-light'
                : 'text-foreground hover:bg-primary/[0.06]'
        }
      `}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <span className={isAnimating ? 'animate-icon-pop' : ''}>
            <Icon
              size={16}
              className={`transition-colors ${
                isActive
                  ? 'text-foreground'
                  : danger
                    ? 'text-danger-text'
                    : warning
                      ? 'text-warning-text'
                      : 'text-muted-foreground group-hover:text-foreground'
              }`}
            />
          </span>
        )}
        <span>{label}</span>
      </div>
      {shortcut && (
        <span
          className={`ml-4 font-mono text-xs ${danger ? 'text-danger-text/80' : 'text-muted-foreground/70'}`}
        >
          {shortcut}
        </span>
      )}
      {children}
    </button>
  );
}
