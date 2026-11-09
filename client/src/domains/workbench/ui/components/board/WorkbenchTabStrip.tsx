import { useEffect, useRef, type ReactNode } from 'react';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button, Tabs, Tooltip } from '@shared/ui';

interface WorkbenchTabStripProps {
  value: string;
  ids: readonly string[];
  onChange: (id: string) => void;
  children: ReactNode;
}

const DRAG_THRESHOLD = 4;
const SCROLL_MARGIN = 8;

export function WorkbenchTabStrip({ value, ids, onChange, children }: WorkbenchTabStripProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; hasMoved: boolean }>();

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const handleWheel = (event: WheelEvent) => {
      const isSideways = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      if (strip.scrollWidth <= strip.clientWidth || isSideways) return;
      event.preventDefault();
      strip.scrollLeft += event.deltaY;
    };
    strip.addEventListener('wheel', handleWheel, { passive: false });
    return () => strip.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    const strip = stripRef.current;
    const active = strip?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (!strip || !active) return;
    const isHidden =
      active.offsetLeft < strip.scrollLeft ||
      active.offsetLeft + active.offsetWidth > strip.scrollLeft + strip.clientWidth;
    if (isHidden) strip.scrollLeft = active.offsetLeft - SCROLL_MARGIN;
  }, [value]);

  const step = (direction: 1 | -1) => {
    const at = Math.max(0, ids.indexOf(value));
    onChange(ids[(at + direction + ids.length) % ids.length]);
  };

  const canStep = ids.length > 1;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <div
        ref={stripRef}
        className="min-w-0 flex-1 cursor-grab select-none overflow-x-auto [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
        onPointerDown={event => {
          drag.current = {
            x: event.clientX,
            left: event.currentTarget.scrollLeft,
            hasMoved: false,
          };
        }}
        onPointerMove={event => {
          const current = drag.current;
          if (!current || event.buttons !== 1) return;
          const dx = event.clientX - current.x;
          if (Math.abs(dx) > DRAG_THRESHOLD) current.hasMoved = true;
          if (current.hasMoved) event.currentTarget.scrollLeft = current.left - dx;
        }}
        onPointerUp={() => {
          setTimeout(() => (drag.current = undefined));
        }}
        onClickCapture={event => {
          if (!drag.current?.hasMoved) return;
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <Tabs value={value} onChange={onChange} size="sm" orientation="horizontal">
          {children}
        </Tabs>
      </div>
      {canStep && (
        <span className="flex flex-none items-center">
          <Tooltip content="Previous tab">
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Previous tab"
              onClick={() => step(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Tooltip>
          <Tooltip content="Next tab">
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Next tab"
              onClick={() => step(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Tooltip>
        </span>
      )}
    </div>
  );
}
