/**
 * Tabs Primitive
 *
 * Tab navigation with automatic orientation based on tab count.
 */
import { createContext, useContext, Children, useMemo, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

import './tabs.css';

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

export function Tab({ id, icon, children, disabled = false }: TabProps) {
  const { value, onChange, orientation } = useTabsContext();
  const isActive = value === id;

  // Hover animation state for vertical tabs
  const [isAnimating, setIsAnimating] = useState(false);

  const handleMouseEnter = useCallback(() => {
    if (orientation === 'vertical') {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 350);
    }
  }, [orientation]);

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
        onMouseEnter={handleMouseEnter}
        disabled={disabled}
        className="tab-button tab-button--vertical w-full flex items-center space-x-2 px-4 py-2.5 text-left transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {icon && (
          <span className={`flex-shrink-0 ${isAnimating ? 'animate-icon-pop' : ''}`}>{icon}</span>
        )}
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
      className="tab-button tab-button--horizontal flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}

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
