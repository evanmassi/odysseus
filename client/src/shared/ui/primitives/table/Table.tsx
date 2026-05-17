/**
 * Data Table
 *
 * Sortable, selectable data grid with status-edge rows and zebra body.
 */

import React, { createContext, useContext } from 'react';

import { cva } from 'class-variance-authority';

import { defaultTableProps } from './types';

import type { TableColumn, TableRowBase, TableProps, TableContextValue } from './types';

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
    'bg-surface-panel-2',
    'border-b border-line-mid',
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
    'pr-[18px] pl-0 text-sm text-foreground align-middle',
    'first:pl-[14px] first:shadow-[inset_3px_0_0_0_hsl(var(--foreground)/0.12)]',
    'group-hover:bg-primary/[0.05]',
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
  muted: '[&>td:first-child]:shadow-[inset_3px_0_0_0_hsl(var(--foreground)/0.30)]',
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
}

const TableCheckbox: React.FC<TableCheckboxProps> = ({
  checked,
  indeterminate,
  onChange,
  'aria-label': ariaLabel,
}) => {
  const isLit = checked || Boolean(indeterminate);
  const bracketColor = isLit ? 'border-primary' : 'border-line-strong';
  const boxGlow = isLit ? 'shadow-[0_0_4px_hsl(var(--primary)/0.3)]' : '';
  return (
    <label className="relative inline-flex h-4 w-4 cursor-pointer items-center justify-center">
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
        className={`absolute inset-0 ${isLit ? 'bg-action-light' : 'bg-surface-void/30'} ${boxGlow}`}
      />
      <span
        aria-hidden
        className={`absolute -top-px -left-px h-1 w-1 border-t border-l ${bracketColor}`}
      />
      <span
        aria-hidden
        className={`absolute -top-px -right-px h-1 w-1 border-t border-r ${bracketColor}`}
      />
      <span
        aria-hidden
        className={`absolute -bottom-px -left-px h-1 w-1 border-b border-l ${bracketColor}`}
      />
      <span
        aria-hidden
        className={`absolute -right-px -bottom-px h-1 w-1 border-b border-r ${bracketColor}`}
      />
      {checked && !indeterminate && (
        <svg
          aria-hidden
          className="absolute inset-0 text-primary"
          style={{ filter: 'drop-shadow(0 0 2px hsl(var(--primary) / 0.6))' }}
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
          className="absolute top-1/2 right-[3px] left-[3px] h-0.5 -translate-y-1/2 bg-primary shadow-[0_0_4px_hsl(var(--primary)/0.6)]"
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
      <tr>
        {selectable && (
          <th className={headerVariants({ density })}>
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
}: {
  columns: TableColumn<T>[];
  data: T[];
  hoverable: boolean;
  rowClassName?: string | ((row: T, index: number) => string);
  onRowClick?: (row: T, index: number) => void;
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
        const zebra = index % 2 === 0 ? '[&>td]:bg-foreground/[0.022]' : '';

        return (
          <tr
            key={row.id}
            className={`${rowVariants({
              hoverable,
              clickable: Boolean(onRowClick),
              selected: isSelected,
            })} ${zebra} ${extra}`}
            onClick={onRowClick ? () => onRowClick(row, index) : undefined}
          >
            {selectable && (
              <td className={cellVariants({ density })}>
                <TableCheckbox
                  checked={isSelected}
                  onChange={checked => handleRowSelect(row.id, checked)}
                  aria-label={`Select row ${index + 1}`}
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">{loadingMessage}</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">{emptyMessage}</div>
      </div>
    );
  }

  const tableEl = (
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
        />
      </table>
    </TableContext.Provider>
  );

  // Sticky-header consumers need a scrollable wrapper; otherwise the table
  // renders flat into whatever container the consumer provides.
  if (stickyHeader) {
    return <div className="overflow-auto relative">{tableEl}</div>;
  }

  return tableEl;
}
