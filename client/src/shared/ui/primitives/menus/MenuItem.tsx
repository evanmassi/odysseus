/**
 * Menu Item
 *
 * Shared item component for dropdown menus, overflow menus, and context menus.
 */

import { useState } from 'react';

import { useResolvedTheme } from '@shared/hooks';

import type { MenuItemProps } from './types';

type MenuTone = 'danger' | 'warning' | 'default';

// Hover: light is a flat tone tint; dark restores the scanline + directional wash.
// Keyed off the global theme (not Tailwind `dark:`) so it stays correct when the menu
// renders inside the forced-dark header island.
const TONE_HOVER: Record<MenuTone, { base: string; darkBg: string; lightBg: string }> = {
  danger: {
    base: 'text-danger-text hover:shadow-[inset_2px_0_0_hsl(var(--color-danger-bg)/0.65)]',
    darkBg:
      'hover:bg-[repeating-linear-gradient(to_bottom,hsl(var(--scanline))_0,hsl(var(--scanline))_1px,transparent_1px,transparent_3px),linear-gradient(90deg,hsl(var(--color-danger-bg)/0.18),hsl(var(--color-danger-bg)/0.11)_55%,transparent_100%)]',
    lightBg:
      'hover:bg-[linear-gradient(0deg,hsl(var(--color-danger-bg)/0.1),hsl(var(--color-danger-bg)/0.1))]',
  },
  warning: {
    base: 'text-warning-text hover:shadow-[inset_2px_0_0_hsl(var(--color-warning-bg)/0.65)]',
    darkBg:
      'hover:bg-[repeating-linear-gradient(to_bottom,hsl(var(--scanline))_0,hsl(var(--scanline))_1px,transparent_1px,transparent_3px),linear-gradient(90deg,hsl(var(--color-warning-bg)/0.18),hsl(var(--color-warning-bg)/0.11)_55%,transparent_100%)]',
    lightBg:
      'hover:bg-[linear-gradient(0deg,hsl(var(--color-warning-bg)/0.1),hsl(var(--color-warning-bg)/0.1))]',
  },
  default: {
    base: 'text-foreground hover:shadow-[inset_2px_0_0_hsl(var(--primary)/0.55)]',
    darkBg:
      'hover:bg-[repeating-linear-gradient(to_bottom,hsl(var(--scanline))_0,hsl(var(--scanline))_1px,transparent_1px,transparent_3px),linear-gradient(90deg,hsl(var(--primary)/0.12),hsl(var(--primary)/0.07)_55%,transparent_100%)]',
    lightBg: 'hover:bg-[linear-gradient(0deg,hsl(var(--primary)/0.08),hsl(var(--primary)/0.08))]',
  },
};

const TONE_ICON: Record<MenuTone, string> = {
  danger: 'text-danger-text',
  warning: 'text-warning-text',
  default: 'text-muted-foreground group-hover:text-foreground',
};

export function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger = false,
  warning = false,
  disabled = false,
  shortcut,
  children,
}: MenuItemProps) {
  const isDark = useResolvedTheme() === 'dark';
  const [isAnimating, setIsAnimating] = useState(false);

  const handleMouseEnter = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 350);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  const tone: MenuTone = danger ? 'danger' : warning ? 'warning' : 'default';
  const hover = TONE_HOVER[tone];
  const stateClass = `${hover.base} ${isDark ? hover.darkBg : hover.lightBg}`;

  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={0}
      onClick={onClick}
      // Keep focus on the menu so its blur-to-close doesn't fire before onClick.
      // Firefox/Safari don't focus a button on mousedown, so without this the menu's
      // focusout lands outside the menu and closes it before the click registers.
      onMouseDown={e => e.preventDefault()}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      disabled={disabled}
      className={`
        group relative z-10 w-full flex items-center justify-between py-2 px-3 font-mono text-data tracking-data
        transition-colors duration-150
        disabled:opacity-40 disabled:cursor-not-allowed
        ${stateClass}
      `}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <span className={isAnimating ? 'animate-icon-pop' : ''}>
            <Icon size={16} className={`transition-colors ${TONE_ICON[tone]}`} />
          </span>
        )}
        <span>{label}</span>
      </div>
      {shortcut && (
        <span
          className={`ml-4 font-mono text-data-sm ${danger ? 'text-danger-text/80' : 'text-muted-foreground/70'}`}
        >
          {shortcut}
        </span>
      )}
      {children}
    </button>
  );
}
