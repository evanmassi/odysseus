/**
 * Tabs Primitive
 *
 * Tab navigation with automatic orientation based on tab count.
 * 2 tabs render horizontally, 3+ render vertically.
 */
import { createContext, useContext, Children, useMemo } from 'react';
import type { ReactNode } from 'react';

export type TabOrientation = 'horizontal' | 'vertical';

export interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  /** Override automatic orientation detection */
  orientation?: TabOrientation;
  className?: string;
}

export interface TabProps {
  id: string;
  icon?: ReactNode;
  children: ReactNode;
  disabled?: boolean;
}

interface TabsContextValue {
  value: string;
  onChange: (value: string) => void;
  orientation: TabOrientation;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tab must be used within a Tabs component');
  }
  return context;
}

/**
 * Individual tab button. Must be used within a Tabs component.
 */
export function Tab({ id, icon, children, disabled = false }: TabProps) {
  const { value, onChange, orientation } = useTabsContext();
  const isActive = value === id;

  const handleClick = () => {
    if (!disabled) {
      onChange(id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  if (orientation === 'vertical') {
    return (
      <button
        type="button"
        role="tab"
        aria-selected={isActive}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        data-focus="none"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          w-full flex items-center space-x-2 px-4 py-2.5 text-left transition-colors
          border-l-4 focus:outline-none focus:bg-accent
          disabled:opacity-50 disabled:cursor-not-allowed
          ${
            isActive
              ? 'border-l-secondary-foreground bg-muted text-card-foreground'
              : 'border-l-transparent text-secondary-foreground hover:bg-muted hover:text-accent-foreground'
          }
        `}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span>{children}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      data-focus="none"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-2 py-2.5 text-sm font-medium transition-colors
        rounded-t focus:outline-none focus:bg-accent border-b-2 -mb-px
        disabled:opacity-50 disabled:cursor-not-allowed
        ${
          isActive
            ? 'border-secondary-foreground bg-muted text-card-foreground'
            : 'border-transparent text-secondary-foreground hover:bg-muted hover:text-accent-foreground hover:border-border'
        }
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}

/**
 * Tab container that renders tabs with automatic orientation.
 * Uses horizontal layout for 2 tabs, vertical for 3+.
 */
export function Tabs({ value, onChange, children, orientation, className = '' }: TabsProps) {
  const tabCount = Children.count(children);
  const resolvedOrientation = orientation ?? (tabCount <= 2 ? 'horizontal' : 'vertical');

  const contextValue = useMemo(
    () => ({ value, onChange, orientation: resolvedOrientation }),
    [value, onChange, resolvedOrientation]
  );

  const containerClass =
    resolvedOrientation === 'vertical'
      ? `space-y-1 ${className}`
      : `flex items-center gap-6 px-4 ${className}`;

  return (
    <TabsContext.Provider value={contextValue}>
      <div role="tablist" aria-orientation={resolvedOrientation} className={containerClass}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}
