/**
 * Data Table
 *
 * Sortable, selectable data grid with status-edge rows and zebra body.
 */

import React, { createContext, useContext } from 'react';

import { cva } from 'class-variance-authority';

import { ConsolePanel } from '../console-panel/ConsolePanel';

import { defaultTableProps } from './types';

import type { RowTone, TableColumn, TableRowBase, TableProps, TableContextValue } from './types';

const CHECKBOX_TONE: Record<
  RowTone,
  {
    bracket: string;
    fill: string;
    icon: string;
    iconShadow: string;
    glow: string;
    bar: string;
    barShadow: string;
  }
> = {
  primary: {
    bracket: 'border-primary',
    fill: 'bg-action-light',
    icon: 'text-primary',
    iconShadow: 'drop-shadow(0 0 2px hsl(var(--primary) / var(--alpha-checkbox-shadow)))',
    glow: 'shadow-[0_0_6px_1px_hsl(var(--primary)/var(--alpha-checkbox-glow-inner)),0_0_16px_2px_hsl(var(--primary)/var(--alpha-checkbox-glow-outer))]',
    bar: 'bg-primary',
    barShadow: 'shadow-[0_0_4px_hsl(var(--primary)/var(--alpha-checkbox-shadow))]',
  },
  success: {
    bracket: 'border-success-bg',
    fill: 'bg-success-light',
    icon: 'text-success-text',
    iconShadow: 'drop-shadow(0 0 2px hsl(var(--color-success-bg) / var(--alpha-checkbox-shadow)))',
    glow: 'shadow-[0_0_6px_1px_hsl(var(--color-success-bg)/var(--alpha-checkbox-glow-inner)),0_0_16px_2px_hsl(var(--color-success-bg)/var(--alpha-checkbox-glow-outer))]',
    bar: 'bg-success-bg',
    barShadow: 'shadow-[0_0_4px_hsl(var(--color-success-bg)/var(--alpha-checkbox-shadow))]',
  },
};

// Each block is one literal string per tone — Tailwind JIT won't see interpolated classes.
const ROW_GLOW: Record<RowTone, string> = {
  primary: [
    '[background-image:repeating-linear-gradient(to_bottom,rgba(0,0,0,0.12)_0,rgba(0,0,0,0.12)_1px,transparent_1px,transparent_3px),linear-gradient(180deg,hsl(var(--primary)/var(--alpha-glow-tint)),hsl(var(--primary)/var(--alpha-glow-tint))),linear-gradient(90deg,hsl(var(--primary)/var(--alpha-glow-wash-1))_0%,hsl(var(--primary)/var(--alpha-glow-wash-2))_18%,hsl(var(--primary)/var(--alpha-glow-wash-3))_48%,hsl(var(--primary)/var(--alpha-glow-wash-4))_78%,hsl(var(--primary)/0)_100%)]',
    'shadow-[inset_3px_0_0_0_hsl(var(--primary)),inset_14px_0_36px_-10px_hsl(var(--primary)/var(--alpha-glow-edge-inner)),inset_0_1px_0_hsl(var(--primary)/var(--alpha-glow-edge-rim)),inset_0_-1px_0_hsl(var(--primary)/var(--alpha-glow-edge-rim)),inset_0_10px_16px_-8px_hsl(var(--primary)/var(--alpha-glow-edge-bloom)),inset_0_-10px_16px_-8px_hsl(var(--primary)/var(--alpha-glow-edge-bloom)),0_0_32px_-4px_hsl(var(--primary)/var(--alpha-glow-outer-near)),0_0_80px_4px_hsl(var(--primary)/var(--alpha-glow-outer-far))]',
    '[&>td]:!bg-transparent',
    '[&>td:first-child]:relative',
    '[&>td:first-child]:before:content-[""] [&>td:first-child]:before:absolute [&>td:first-child]:before:left-0 [&>td:first-child]:before:top-0 [&>td:first-child]:before:bottom-0 [&>td:first-child]:before:w-[3px] [&>td:first-child]:before:bg-primary [&>td:first-child]:before:pointer-events-none',
    '[&>td:first-child]:before:shadow-[0_0_6px_0_hsl(var(--primary)/var(--alpha-glow-bar-strong)),0_0_24px_3px_hsl(var(--primary)/var(--alpha-glow-bar-mid)),0_0_72px_10px_hsl(var(--primary)/var(--alpha-glow-bar-far))]',
    '[&>td]:font-semibold',
    '[&>td]:[text-shadow:0_0_5px_color-mix(in_srgb,currentColor_35%,transparent)]',
  ].join(' '),
  success: [
    '[background-image:repeating-linear-gradient(to_bottom,rgba(0,0,0,0.12)_0,rgba(0,0,0,0.12)_1px,transparent_1px,transparent_3px),linear-gradient(180deg,hsl(var(--color-success-bg)/var(--alpha-glow-tint)),hsl(var(--color-success-bg)/var(--alpha-glow-tint))),linear-gradient(90deg,hsl(var(--color-success-bg)/var(--alpha-glow-wash-1))_0%,hsl(var(--color-success-bg)/var(--alpha-glow-wash-2))_18%,hsl(var(--color-success-bg)/var(--alpha-glow-wash-3))_48%,hsl(var(--color-success-bg)/var(--alpha-glow-wash-4))_78%,hsl(var(--color-success-bg)/0)_100%)]',
    'shadow-[inset_3px_0_0_0_hsl(var(--color-success-bg)),inset_14px_0_36px_-10px_hsl(var(--color-success-bg)/var(--alpha-glow-edge-inner)),inset_0_1px_0_hsl(var(--color-success-bg)/var(--alpha-glow-edge-rim)),inset_0_-1px_0_hsl(var(--color-success-bg)/var(--alpha-glow-edge-rim)),inset_0_10px_16px_-8px_hsl(var(--color-success-bg)/var(--alpha-glow-edge-bloom)),inset_0_-10px_16px_-8px_hsl(var(--color-success-bg)/var(--alpha-glow-edge-bloom)),0_0_32px_-4px_hsl(var(--color-success-bg)/var(--alpha-glow-outer-near)),0_0_80px_4px_hsl(var(--color-success-bg)/var(--alpha-glow-outer-far))]',
    '[&>td]:!bg-transparent',
    '[&>td:first-child]:relative',
    '[&>td:first-child]:before:content-[""] [&>td:first-child]:before:absolute [&>td:first-child]:before:left-0 [&>td:first-child]:before:top-0 [&>td:first-child]:before:bottom-0 [&>td:first-child]:before:w-[3px] [&>td:first-child]:before:bg-success-bg [&>td:first-child]:before:pointer-events-none',
    '[&>td:first-child]:before:shadow-[0_0_6px_0_hsl(var(--color-success-bg)/var(--alpha-glow-bar-strong)),0_0_24px_3px_hsl(var(--color-success-bg)/var(--alpha-glow-bar-mid)),0_0_72px_10px_hsl(var(--color-success-bg)/var(--alpha-glow-bar-far))]',
    '[&>td]:font-semibold',
    '[&>td]:[text-shadow:0_0_5px_color-mix(in_srgb,currentColor_35%,transparent)]',
  ].join(' '),
};

const CHECKBOX_CELL_OVERRIDE = '!px-3 !shadow-none text-center w-10';

const TableContext = createContext<TableContextValue | null>(null);

const useTableContext = () => {
  const context = useContext(TableContext);
  if (!context) {
    throw new Error('Table components must be used within a Table');
  }
  return context;
};

const headerVariants = cva(
  [
    'font-mono uppercase tracking-[0.22em] text-[9.5px] font-normal',
    'text-left text-foreground/60',
    'bg-[hsl(var(--bg-header-band))] shadow-[inset_0_1px_0_hsl(var(--foreground)/var(--alpha-header-rim))]',
    'py-3.5 pr-[18px] pl-0 first:pl-[14px]',
  ],
  {
    variants: {
      sortable: {
        true: 'cursor-pointer hover:text-foreground select-none',
        false: '',
      },
      sticky: {
        true: 'sticky top-0 z-10',
        false: '',
      },
      align: {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
      },
      density: {
        compact: 'py-2',
        default: 'py-3',
      },
    },
    defaultVariants: {
      sortable: false,
      sticky: false,
      align: 'left',
      density: 'default',
    },
  }
);

const cellVariants = cva(
  [
    'pr-[18px] pl-0 text-sm font-mono text-foreground align-middle',
    'first:pl-[14px] first:shadow-[inset_3px_0_0_0_hsl(var(--foreground)/var(--alpha-cell-rim))]',
    'group-hover:bg-[hsl(var(--foreground)/var(--alpha-hover))]',
    'group-hover:[text-shadow:0_0_5px_color-mix(in_srgb,currentColor_30%,transparent)]',
  ],
  {
    variants: {
      align: {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
      },
      density: {
        compact: 'py-2',
        default: 'py-3',
      },
    },
    defaultVariants: {
      align: 'left',
      density: 'default',
    },
  }
);

const rowVariants = cva([''], {
  variants: {
    hoverable: {
      true: 'group',
      false: '',
    },
    clickable: {
      true: 'cursor-pointer',
      false: '',
    },
    selected: {
      true: '[&>td:first-child]:shadow-[inset_3px_0_0_0_hsl(var(--primary))]',
      false: '',
    },
  },
  defaultVariants: {
    hoverable: false,
    clickable: false,
    selected: false,
  },
});

// Class strings must be literal (no interpolation) so Tailwind JIT picks them up.
const ROW_STRIPE_CLASSES = {
  primary: '[&>td:first-child]:shadow-[inset_3px_0_0_0_hsl(var(--primary))]',
  success: '[&>td:first-child]:shadow-[inset_3px_0_0_0_hsl(var(--color-success-bg))]',
  warning: '[&>td:first-child]:shadow-[inset_3px_0_0_0_hsl(var(--color-warning-bg))]',
  danger: '[&>td:first-child]:shadow-[inset_3px_0_0_0_hsl(var(--color-danger-bg))]',
  muted:
    '[&>td:first-child]:shadow-[inset_3px_0_0_0_hsl(var(--foreground)/var(--alpha-stripe-muted))]',
} as const;

export type RowStripeTone = keyof typeof ROW_STRIPE_CLASSES;

export function rowStripe(tone: RowStripeTone): string {
  return ROW_STRIPE_CLASSES[tone];
}

interface SortIndicatorProps {
  direction?: 'asc' | 'desc';
}

const SortIndicator: React.FC<SortIndicatorProps> = ({ direction }) => (
  <svg
    className="ml-2 w-3.5 h-3.5 shrink-0 inline-block"
    viewBox="0 0 14 14"
    fill="none"
    strokeWidth="1.5"
  >
    <path
      d="M5 4.5L7 2.5l2 2"
      stroke="currentColor"
      className={
        direction === 'asc' ? 'text-primary' : direction === 'desc' ? 'opacity-20' : 'opacity-40'
      }
    />
    <path
      d="M5 9.5L7 11.5l2-2"
      stroke="currentColor"
      className={
        direction === 'desc' ? 'text-primary' : direction === 'asc' ? 'opacity-20' : 'opacity-40'
      }
    />
  </svg>
);

interface TableCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  'aria-label'?: string;
  tone?: RowTone;
}

const TableCheckbox: React.FC<TableCheckboxProps> = ({
  checked,
  indeterminate,
  onChange,
  'aria-label': ariaLabel,
  tone = 'primary',
}) => {
  const isLit = checked || Boolean(indeterminate);
  const t = CHECKBOX_TONE[tone];
  const bracketColor = isLit ? t.bracket : 'border-line-strong';
  const boxGlow = isLit ? t.glow : '';
  return (
    <label className="relative inline-flex h-3.5 w-3.5 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        checked={checked}
        ref={input => {
          if (input) input.indeterminate = Boolean(indeterminate);
        }}
        onChange={e => onChange(e.target.checked)}
        aria-label={ariaLabel}
        className="sr-only"
      />
      <span
        aria-hidden
        className={`absolute inset-0 ${isLit ? t.fill : 'bg-surface-void/30'} ${boxGlow}`}
      />
      <span
        aria-hidden
        className={`absolute -top-px -left-px h-1 w-1 border-t border-l ${bracketColor}`}
      />
      <span
        aria-hidden
        className={`absolute -right-px -bottom-px h-1 w-1 border-b border-r ${bracketColor}`}
      />
      {checked && !indeterminate && (
        <svg
          aria-hidden
          className={`absolute inset-0 ${t.icon}`}
          style={{ filter: t.iconShadow }}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5L6.5 10.5L4 8" />
        </svg>
      )}
      {indeterminate && (
        <span
          aria-hidden
          className={`absolute top-1/2 right-[3px] left-[3px] h-0.5 -translate-y-1/2 ${t.bar} ${t.barShadow}`}
        />
      )}
    </label>
  );
};

const TableHeader = <T,>({ columns }: { columns: TableColumn<T>[] }) => {
  const {
    selectable,
    multiSelect,
    selectedRows,
    allRowIds,
    onSelectionChange,
    sortConfig,
    onSort,
    density,
  } = useTableContext();

  const handleSelectAll = (checked: boolean) => {
    onSelectionChange(checked ? allRowIds : []);
  };

  const handleSort = (columnId: string) => {
    if (!onSort) return;
    const newDirection =
      sortConfig?.columnId === columnId && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    onSort({ columnId, direction: newDirection });
  };

  return (
    <thead>
      <tr className="relative after:absolute after:inset-x-0 after:bottom-0 after:h-px after:content-[''] after:[background:linear-gradient(90deg,transparent_0%,hsl(var(--foreground)/var(--alpha-header-rule))_10%,hsl(var(--foreground)/var(--alpha-header-rule))_90%,transparent_100%)]">
        {selectable && (
          <th className={`${headerVariants({ density })} ${CHECKBOX_CELL_OVERRIDE}`}>
            {multiSelect && (
              <TableCheckbox
                checked={selectedRows.length > 0}
                indeterminate={selectedRows.length > 0 && selectedRows.length < allRowIds.length}
                onChange={handleSelectAll}
                aria-label="Select all rows"
              />
            )}
          </th>
        )}

        {columns.map(column => {
          const isSorted = sortConfig?.columnId === column.id;
          const sortDirection = isSorted ? sortConfig.direction : undefined;

          return (
            <th
              key={column.id}
              className={headerVariants({
                sortable: column.sortable,
                align: column.align,
                density,
              })}
              style={{ width: column.width }}
              onClick={column.sortable ? () => handleSort(column.id) : undefined}
              role={column.sortable ? 'columnheader button' : 'columnheader'}
              aria-sort={
                isSorted
                  ? sortDirection === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : column.sortable
                    ? 'none'
                    : undefined
              }
            >
              <div className="flex items-center">
                {column.header}
                {column.sortable && <SortIndicator direction={sortDirection} />}
              </div>
            </th>
          );
        })}
      </tr>
    </thead>
  );
};

const TableBody = <T extends TableRowBase>({
  columns,
  data,
  hoverable,
  rowClassName,
  onRowClick,
  rowTone,
  selectedRowGlow,
}: {
  columns: TableColumn<T>[];
  data: T[];
  hoverable: boolean;
  rowClassName?: string | ((row: T, index: number) => string);
  onRowClick?: (row: T, index: number) => void;
  rowTone?: (row: T) => RowTone;
  selectedRowGlow?: boolean;
}) => {
  const { selectable, selectedRows, onSelectionChange, density } = useTableContext();

  const handleRowSelect = (rowId: string | number, checked: boolean) => {
    const newSelection = checked
      ? [...selectedRows, rowId]
      : selectedRows.filter(id => id !== rowId);
    onSelectionChange(newSelection);
  };

  const getCellValue = (column: TableColumn<T>, row: T, index: number): React.ReactNode => {
    if (column.render) {
      return column.render(
        column.accessor
          ? typeof column.accessor === 'function'
            ? column.accessor(row)
            : row[column.accessor]
          : undefined,
        row,
        index
      );
    }

    if (column.accessor) {
      const value =
        typeof column.accessor === 'function' ? column.accessor(row) : row[column.accessor];
      return value as React.ReactNode;
    }

    return null;
  };

  return (
    <tbody>
      {data.map((row, index) => {
        const isSelected = selectedRows.includes(row.id);
        const extra =
          typeof rowClassName === 'function' ? rowClassName(row, index) : (rowClassName ?? '');
        const zebra =
          index % 2 === 0 ? '[&>td]:bg-[hsl(var(--foreground)/var(--alpha-zebra))]' : '';
        const glow = selectedRowGlow && isSelected ? ROW_GLOW[rowTone?.(row) ?? 'primary'] : '';

        return (
          <tr
            key={row.id}
            className={`${rowVariants({
              hoverable,
              clickable: Boolean(onRowClick),
              selected: isSelected && !selectedRowGlow,
            })} ${zebra} ${extra} ${glow}`}
            onClick={onRowClick ? () => onRowClick(row, index) : undefined}
          >
            {selectable && (
              <td className={`${cellVariants({ density })} ${CHECKBOX_CELL_OVERRIDE}`}>
                <TableCheckbox
                  checked={isSelected}
                  onChange={checked => handleRowSelect(row.id, checked)}
                  aria-label={`Select row ${index + 1}`}
                  tone={rowTone?.(row)}
                />
              </td>
            )}

            {columns.map(column => (
              <td
                key={column.id}
                className={cellVariants({ align: column.align, density })}
                style={{ width: column.width }}
              >
                {getCellValue(column, row, index)}
              </td>
            ))}
          </tr>
        );
      })}
    </tbody>
  );
};

export function Table<T extends TableRowBase>({
  columns,
  data,
  sortable = defaultTableProps.sortable,
  selectable = defaultTableProps.selectable,
  multiSelect = defaultTableProps.multiSelect,
  hoverable = defaultTableProps.hoverable,
  selectedRows = defaultTableProps.selectedRows,
  sortConfig,
  loading = defaultTableProps.loading,
  density = defaultTableProps.density,
  stickyHeader = defaultTableProps.stickyHeader,
  onSort,
  onSelectionChange = () => {},
  onRowClick,
  emptyMessage = defaultTableProps.emptyMessage,
  loadingMessage = defaultTableProps.loadingMessage,
  'aria-label': ariaLabel,
  className,
  rowClassName,
  rowTone,
  selectedRowGlow,
  toolbar,
  chassis = defaultTableProps.chassis,
}: TableProps<T>) {
  const contextValue: TableContextValue = {
    selectable: selectable!,
    multiSelect: multiSelect!,
    selectedRows: selectedRows!,
    allRowIds: data.map(row => row.id),
    onSelectionChange,
    sortConfig,
    onSort: sortable ? onSort : undefined,
    density: density!,
  };

  const body = loading ? (
    <div className="flex items-center justify-center py-8">
      <div className="text-muted-foreground">{loadingMessage}</div>
    </div>
  ) : data.length === 0 ? (
    <div className="flex items-center justify-center py-8">
      <div className="text-muted-foreground">{emptyMessage}</div>
    </div>
  ) : (
    <TableContext.Provider value={contextValue}>
      <table
        className={`w-full border-collapse ${className ?? ''}`}
        role="table"
        aria-label={ariaLabel}
      >
        <TableHeader columns={columns} />
        <TableBody
          columns={columns}
          data={data}
          hoverable={hoverable!}
          rowClassName={rowClassName}
          onRowClick={onRowClick}
          rowTone={rowTone}
          selectedRowGlow={selectedRowGlow}
        />
      </table>
    </TableContext.Provider>
  );

  // Sticky-header consumers need a scrollable wrapper.
  const framedBody = stickyHeader ? <div className="relative overflow-auto">{body}</div> : body;

  if (!chassis) {
    return framedBody;
  }

  return (
    <ConsolePanel>
      {toolbar && (
        <div className="flex items-center gap-3 border-b border-line-soft bg-[hsl(var(--bg-header-band))] px-4 py-3">
          {toolbar.left}
          <div className="flex-1" />
          {toolbar.right}
        </div>
      )}
      {framedBody}
    </ConsolePanel>
  );
}
