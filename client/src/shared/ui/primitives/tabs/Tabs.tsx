import {
  createContext,
  useContext,
  Children,
  useMemo,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';
import type { ReactNode, CSSProperties } from 'react';

import { useIconPop } from '@shared/hooks';

export type TabOrientation = 'horizontal' | 'vertical';

export type TabSize = 'md' | 'sm';

interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  orientation?: TabOrientation;
  size?: TabSize;
  className?: string;
}

interface TabProps {
  id: string;
  icon?: ReactNode;
  children: ReactNode;
}

interface TabGroupProps {
  label: string;
  children: ReactNode;
}

interface TabsContextValue {
  value: string;
  onChange: (value: string) => void;
  orientation: TabOrientation;
  size: TabSize;
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
  'type-label font-medium relative z-10 ' +
  'transition-colors duration-150 focus:outline-none cursor-pointer';

const SIZE_TEXT: Record<TabSize, string> = {
  md: 'text-label-lg',
  sm: 'text-label-sm',
};

const ACTIVE_STATE = 'text-foreground phosphor-text';

const INACTIVE_STATE =
  'text-muted-foreground ' +
  'hover:text-foreground dark:hover:[text-shadow:0_0_8px_hsl(var(--sheen)/0.7)]';

const TILE_HORIZONTAL =
  'bg-[linear-gradient(0deg,hsl(var(--primary)/0.1),hsl(var(--primary)/0.1))] ' +
  'shadow-[inset_0_-2px_0_0_hsl(var(--primary))] ' +
  'dark:bg-[linear-gradient(0deg,hsl(var(--primary)/var(--alpha-glow-wash-1))_0%,hsl(var(--primary)/var(--alpha-glow-wash-2))_18%,hsl(var(--primary)/var(--alpha-glow-wash-3))_48%,hsl(var(--primary)/var(--alpha-glow-wash-4))_78%,hsl(var(--primary)/0)_100%)] ' +
  'dark:shadow-[inset_0_-2px_0_0_hsl(var(--primary)),inset_0_-14px_36px_-10px_hsl(var(--primary)/var(--alpha-glow-edge-inner)),inset_1px_0_0_hsl(var(--primary)/var(--alpha-glow-edge-rim)),inset_-1px_0_0_hsl(var(--primary)/var(--alpha-glow-edge-rim)),0_0_20px_-4px_hsl(var(--primary)/var(--alpha-glow-outer-near)),0_0_48px_2px_hsl(var(--primary)/var(--alpha-glow-outer-far))]';

const TILE_VERTICAL =
  'bg-[linear-gradient(0deg,hsl(var(--primary)/0.1),hsl(var(--primary)/0.1))] ' +
  'shadow-[inset_2px_0_0_0_hsl(var(--primary))] ' +
  'dark:bg-[linear-gradient(90deg,hsl(var(--primary)/var(--alpha-glow-wash-1))_0%,hsl(var(--primary)/var(--alpha-glow-wash-2))_18%,hsl(var(--primary)/var(--alpha-glow-wash-3))_48%,hsl(var(--primary)/var(--alpha-glow-wash-4))_78%,hsl(var(--primary)/0)_100%)] ' +
  'dark:shadow-[inset_2px_0_0_0_hsl(var(--primary)),inset_14px_0_36px_-10px_hsl(var(--primary)/var(--alpha-glow-edge-inner)),inset_0_1px_0_hsl(var(--primary)/var(--alpha-glow-edge-rim)),inset_0_-1px_0_hsl(var(--primary)/var(--alpha-glow-edge-rim)),0_0_20px_-4px_hsl(var(--primary)/var(--alpha-glow-outer-near)),0_0_48px_2px_hsl(var(--primary)/var(--alpha-glow-outer-far))]';

const INDICATOR_TRANSITION =
  'transition-[transform,width,height] duration-[280ms] ease-[cubic-bezier(0.32,0.72,0,1)]';

export function Tab({ id, icon, children }: TabProps) {
  const { value, onChange, orientation, size } = useTabsContext();
  const isActive = value === id;
  const isVertical = orientation === 'vertical';

  const { isAnimating, trigger } = useIconPop();
  const handleMouseEnter = () => {
    if (isVertical) trigger();
  };

  const handleClick = () => onChange(id);

  const padding = size === 'sm' ? 'px-3 py-2' : 'px-4 py-2.5';
  const orientationClasses = isVertical
    ? `w-full flex items-center gap-2 ${padding} text-left min-w-0`
    : `flex items-center gap-2 ${padding}`;

  const className = `${BASE} ${SIZE_TEXT[size]} ${orientationClasses} ${
    isActive ? ACTIVE_STATE : INACTIVE_STATE
  }`;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      tabIndex={0}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      className={className}
    >
      {icon && (
        <span className={`flex-shrink-0 ${isAnimating ? 'animate-icon-pop' : ''}`}>{icon}</span>
      )}
      <span className={isVertical ? 'min-w-0 flex-1 break-words' : 'whitespace-nowrap'}>
        {children}
      </span>
    </button>
  );
}

// PITFALL: the group heading is decorative because a `tablist` may only own `tab` elements.
export function TabGroup({ label, children }: TabGroupProps) {
  return (
    <>
      <div
        aria-hidden
        className="px-3 pb-0.5 pt-2 type-label text-label-2xs tracking-label-wide text-foreground/40 first:pt-1"
      >
        {label}
      </div>
      {children}
    </>
  );
}

export function Tabs({
  value,
  onChange,
  children,
  orientation,
  size = 'md',
  className = '',
}: TabsProps) {
  const tabCount = Children.count(children);
  const resolvedOrientation = orientation ?? (tabCount <= 2 ? 'horizontal' : 'vertical');

  const contextValue = useMemo(
    () => ({ value, onChange, orientation: resolvedOrientation, size }),
    [value, onChange, resolvedOrientation, size]
  );

  const listRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<CSSProperties>({});
  const [hasMeasured, setHasMeasured] = useState(false);

  const recomputeIndicator = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (!active) return;
    setIndicatorStyle({
      transform: `translate(${active.offsetLeft}px, ${active.offsetTop}px)`,
      width: active.offsetWidth,
      height: active.offsetHeight,
    });
    setHasMeasured(true);
  }, []);

  useLayoutEffect(() => {
    recomputeIndicator();
  }, [recomputeIndicator, value]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const observer = new ResizeObserver(recomputeIndicator);
    observer.observe(list);
    return () => observer.disconnect();
  }, [recomputeIndicator]);

  const containerClass =
    resolvedOrientation === 'vertical'
      ? 'relative flex flex-col gap-1'
      : 'relative flex items-center gap-6 px-4';

  const indicatorClass = `pointer-events-none absolute top-0 left-0 before:content-[''] before:absolute before:inset-0 dark:before:bg-scanlines ${
    resolvedOrientation === 'horizontal' ? TILE_HORIZONTAL : TILE_VERTICAL
  } ${hasMeasured ? INDICATOR_TRANSITION : ''}`;

  return (
    <TabsContext.Provider value={contextValue}>
      <div
        ref={listRef}
        role="tablist"
        aria-orientation={resolvedOrientation}
        className={`${containerClass} ${className}`}
      >
        {children}
        <span aria-hidden className={indicatorClass} style={indicatorStyle} />
      </div>
    </TabsContext.Provider>
  );
}
