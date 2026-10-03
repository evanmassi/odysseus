import { useState, useMemo, useEffect, type ReactNode } from 'react';

import { ChevronRight } from 'lucide-react';

import { Divider, Table } from '../../primitives';

import type { TableColumn, SortConfig } from '../../primitives/table/types';

export type AlertTone = 'danger' | 'warning';

export interface AlertCount {
  count: number;
  tone: AlertTone;
  label: string;
}

interface AlertPanelProps<T extends { id: string }> {
  label: string;
  counts: AlertCount[];
  columns: TableColumn<T>[];
  rows: T[];
  defaultSort: SortConfig;
  rowTone: (row: T) => AlertTone;
  onSelectItem: (id: string) => void;
  ariaLabel: string;
  selectedItemId?: string;
  footer?: ReactNode;
}

const TONE_TEXT: Record<AlertTone, string> = {
  danger: 'text-danger-text',
  warning: 'text-warning-text',
};

const TONE_STRIPE: Record<AlertTone, string> = {
  danger: 'bg-danger-bg dark:shadow-[0_0_6px_-1px_hsl(var(--color-danger-bg)/0.6)]',
  warning: 'bg-warning-bg dark:shadow-[0_0_6px_-1px_hsl(var(--color-warning-bg)/0.6)]',
};

function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

export function AlertPanel<T extends { id: string }>({
  label,
  counts,
  columns,
  rows,
  defaultSort,
  rowTone,
  onSelectItem,
  ariaLabel,
  selectedItemId,
  footer,
}: AlertPanelProps<T>) {
  const totalAlerts = rows.length;
  const [isExpanded, setIsExpanded] = useState(totalAlerts > 0);
  const [manuallyCollapsed, setManuallyCollapsed] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>(defaultSort);

  useEffect(() => {
    if (totalAlerts > 0 && !manuallyCollapsed) {
      setIsExpanded(true);
    }
  }, [totalAlerts, manuallyCollapsed]);

  const sortedRows = useMemo(() => {
    const { columnId, direction } = sortConfig;
    const multiplier = direction === 'asc' ? 1 : -1;
    return [...rows].sort(
      (a, b) => compareValues(a[columnId as keyof T], b[columnId as keyof T]) * multiplier
    );
  }, [rows, sortConfig]);

  if (totalAlerts === 0) return null;

  const toggleExpanded = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    setManuallyCollapsed(!next);
  };

  const visibleCounts = counts.filter(c => c.count > 0);
  const tone: AlertTone = visibleCounts.some(c => c.tone === 'danger') ? 'danger' : 'warning';

  return (
    <div className="mb-2 flex-shrink-0 overflow-hidden border border-line-faint">
      <div
        className="relative flex items-center gap-2 bg-[hsl(var(--primary)/0.07)] dark:bg-shade/35 px-3 py-2 cursor-pointer transition-[background-color,filter] hover:brightness-[0.97] dark:hover:brightness-100 dark:hover:bg-shade/45"
        onClick={toggleExpanded}
        onKeyDown={e => {
          if (e.key === 'Enter') toggleExpanded();
        }}
        role="button"
        tabIndex={0}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-foreground/[0.05]"
        />
        <ChevronRight
          size={11}
          className={`flex-shrink-0 text-foreground/40 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
        />
        <span aria-hidden className={`h-[11px] w-0.5 flex-shrink-0 ${TONE_STRIPE[tone]}`} />
        <span className={`type-label text-label-2xs tracking-label-wide ${TONE_TEXT[tone]}`}>
          {label}
        </span>
        <span aria-hidden className="font-mono text-data-sm text-foreground/30">
          {'//'}
        </span>
        <span className="flex items-center gap-2 font-mono text-data-sm tracking-[0.04em]">
          {visibleCounts.map((entry, index) => (
            <span key={entry.label} className="flex items-center gap-2">
              {index > 0 && <span className="text-foreground/25">·</span>}
              <span className={TONE_TEXT[entry.tone]}>
                {entry.count} {entry.label}
              </span>
            </span>
          ))}
        </span>
        <Divider tone={tone} className="absolute inset-x-0 -bottom-px" />
      </div>

      {isExpanded && (
        <>
          <Table
            columns={columns}
            data={sortedRows}
            hoverable
            sortable
            sortConfig={sortConfig}
            onSort={setSortConfig}
            onRowClick={row => onSelectItem(row.id)}
            selectedRows={selectedItemId ? [selectedItemId] : []}
            selectedRowGlow
            rowState={rowTone}
            density="compact"
            className="text-data"
            aria-label={ariaLabel}
          />
          {footer}
        </>
      )}
    </div>
  );
}
