/**
 * Menu Item
 *
 * Shared item component for dropdown menus, overflow menus, and context menus.
 */

import type { MenuItemProps } from './types';

export function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger = false,
  disabled = false,
  shortcut,
  isActive = false,
  children,
}: MenuItemProps) {
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
      disabled={disabled}
      className={`
        w-full flex items-center justify-between py-2 px-3 rounded-md text-sm
        transition-colors duration-150
        disabled:opacity-40 disabled:cursor-not-allowed
        ${
          isActive
            ? 'bg-accent text-accent-foreground font-medium'
            : danger
              ? 'text-danger-text hover:bg-danger-light'
              : 'text-secondary-foreground hover:bg-accent hover:text-accent-foreground'
        }
      `}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <Icon
            size={16}
            className={
              isActive
                ? 'text-accent-foreground'
                : danger
                  ? 'text-danger-text'
                  : 'text-muted-foreground'
            }
          />
        )}
        <span>{label}</span>
      </div>
      {shortcut && (
        <span
          className={`text-xs font-mono ml-4 ${danger ? 'text-danger-text' : 'text-muted-foreground'}`}
        >
          {shortcut}
        </span>
      )}
      {children}
    </button>
  );
}
