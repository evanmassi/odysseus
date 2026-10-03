import type { ReactNode } from 'react';

import { ChevronDown, ChevronRight } from 'lucide-react';

import { ROW_HOVER_GLOW } from '../../primitives/table/rowHoverGlow';

interface FilterSectionProps {
  title: string;
  icon: ReactNode;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function FilterSection({
  title,
  icon,
  count,
  isOpen,
  onToggle,
  children,
}: FilterSectionProps) {
  const Chevron = isOpen ? ChevronDown : ChevronRight;
  return (
    <div className="border-b border-line-faint last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`group flex w-full items-center justify-between px-4 py-2.5 transition-[background,box-shadow] duration-150 ${ROW_HOVER_GLOW.primary}`}
      >
        <div className="flex items-center gap-2.5">
          <Chevron className="h-3.5 w-3.5 text-foreground/40 transition-colors group-hover:text-primary" />
          <span className="flex items-center text-foreground/55 transition-colors group-hover:text-foreground/80">
            {icon}
          </span>
          <span className="type-label text-label-xs tracking-label-wide text-foreground/80 transition-colors group-hover:text-foreground">
            {title}
          </span>
        </div>
        {count > 0 && (
          <span className="font-mono text-data-sm tabular-nums text-primary/90">{count}</span>
        )}
      </button>
      {isOpen && <div className="px-4 pb-3 pt-0.5">{children}</div>}
    </div>
  );
}
