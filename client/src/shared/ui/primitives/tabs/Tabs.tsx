/**
 * Tabs
 *
 * Recessive tab navigation — mono uppercase chrome, active state lit via phosphor glow + thin indicator bar.
 */
import { createContext, useContext, Children, useMemo, useState, useCallback } from 'react';
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

const BASE =
  'font-mono uppercase tracking-[0.18em] text-xs font-medium ' +
  'transition-colors duration-150 focus:outline-none cursor-pointer';

const ACTIVE_STATE =
  'text-foreground border-primary phosphor-text ' +
  '[border-image:linear-gradient(90deg,transparent_0%,hsl(var(--primary)/0.85)_20%,hsl(var(--primary))_50%,hsl(var(--primary)/0.85)_80%,transparent_100%)_1]';

const INACTIVE_STATE =
  'text-muted-foreground border-transparent ' +
  'hover:text-foreground hover:[text-shadow:0_0_8px_rgb(255_255_255/0.7)]';

export function Tab({ id, icon, children }: TabProps) {
  const { value, onChange, orientation } = useTabsContext();
  const isActive = value === id;

  // Icon-pop is a vertical-only hover micro-affordance, replacing the larger
  // bg/border affordances horizontal tabs already get from the underline.
  const [isAnimating, setIsAnimating] = useState(false);
  const handleMouseEnter = useCallback(() => {
    if (orientation === 'vertical') {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 350);
    }
  }, [orientation]);

  const handleClick = () => onChange(id);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const orientationClasses =
    orientation === 'vertical'
      ? 'w-full flex items-center gap-2 px-4 py-2.5 text-left border-l-2'
      : 'flex items-center gap-2 px-4 py-2.5 border-b-2 -mb-px';

  const className = `${BASE} ${orientationClasses} ${isActive ? ACTIVE_STATE : INACTIVE_STATE}`;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      className={className}
    >
      {icon && (
        <span className={`flex-shrink-0 ${isAnimating ? 'animate-icon-pop' : ''}`}>{icon}</span>
      )}
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
    resolvedOrientation === 'vertical' ? 'space-y-1' : 'flex items-center gap-6 px-4';

  return (
    <TabsContext.Provider value={contextValue}>
      <div
        role="tablist"
        aria-orientation={resolvedOrientation}
        className={`${containerClass} ${className}`}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}
