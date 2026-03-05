/**
 * Table Component
 *
 * Accessible table primitive with sorting, selection, and responsive design.
 */

import React, { createContext, useContext } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { defaultTableProps } from './types';

import type {
  TableColumn,
  TableRow,
  TableRowBase,
  TableProps,
  TableContextValue,
  TableRounded,
} from './types';

// Re-export types
export type {
  TableColumn,
  TableRow,
  TableRowBase,
  TableProps,
  TableRef,
  TableVariant,
  TableSize,
  TableState,
  TableRounded,
  SortConfig,
  SortDirection,
  TablePagination,
} from './types';

// Table context
const TableContext = createContext<TableContextValue | null>(null);

const useTableContext = () => {
  const context = useContext(TableContext);
  if (!context) {
    throw new Error('Table components must be used within a Table');
  }
  return context;
};

// Table styling with semantic tokens
const tableVariants = cva(['w-full border-collapse'], {
  variants: {
    variant: {
      default: 'border border-border',
      bordered: 'border-2 border-border',
      borderless: '',
    },
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    },
    state: {
      default: '',
      error: 'border-danger-border',
      warning: 'border-warning-border',
      success: 'border-success-border',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
    state: 'default',
  },
});

// Header styling with semantic tokens
const headerVariants = cva(
  ['px-4 py-3 text-left font-semibold text-foreground', 'border-b border-border bg-muted'],
  {
    variants: {
      sortable: {
        true: 'cursor-pointer hover:bg-accent select-none',
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
    },
    defaultVariants: {
      sortable: false,
      sticky: false,
      align: 'left',
    },
  }
);

// Cell styling with semantic tokens
const cellVariants = cva(['px-4 py-3 border-b border-border'], {
  variants: {
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    },
  },
  defaultVariants: {
    align: 'left',
  },
});

// Row styling with semantic tokens
const rowVariants = cva([''], {
  variants: {
    striped: {
      true: 'even:bg-muted',
      false: '',
    },
    hoverable: {
      true: 'hover:bg-muted/35 cursor-pointer',
      false: '',
    },
    selectable: {
      true: 'cursor-pointer',
      false: '',
    },
    selected: {
      true: 'bg-accent',
      false: '',
    },
  },
  defaultVariants: {
    striped: false,
    hoverable: false,
    selectable: false,
    selected: false,
  },
});

// Sort indicator component
interface SortIndicatorProps {
  direction?: 'asc' | 'desc';
  className?: string;
}

const SortIndicator: React.FC<SortIndicatorProps> = ({ direction, className = '' }) => (
  <span className={`ml-2 inline-block ${className}`}>
    {!direction ? (
      <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8.71 12.29L12 8.99l3.29 3.3c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L12.7 6.88c-.39-.39-1.02-.39-1.41 0L7.29 10.88c-.39.39-.39 1.02 0 1.41.39.39 1.03.39 1.42 0zM8.71 15.71L12 19.01l3.29-3.3c.39-.39 1.02-.39 1.41 0 .39.39.39 1.02 0 1.41l-4 4c-.39.39-1.02.39-1.41 0l-4-4c-.39-.39-.39-1.02 0-1.41.39-.39 1.03-.39 1.42 0z" />
      </svg>
    ) : direction === 'asc' ? (
      <svg className="w-4 h-4 text-action" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8.71 12.29L12 8.99l3.29 3.3c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L12.7 6.88c-.39-.39-1.02-.39-1.41 0L7.29 10.88c-.39.39-.39 1.02 0 1.41.39.39 1.03.39 1.42 0z" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-action" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.29 11.71L12 15.01 8.71 11.7c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41l4 4c.39.39 1.02.39 1.41 0l4-4c.39.39.39 1.02 0 1.41-.39.39-1.03.39-1.42 0z" />
      </svg>
    )}
  </span>
);

// Checkbox component for selection
interface TableCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  'aria-label'?: string;
}

const checkmarkSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12 5L6.5 10.5L4 8' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`;
const indeterminateSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 8h8' stroke='white' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E")`;

const TableCheckbox: React.FC<TableCheckboxProps> = ({
  checked,
  indeterminate,
  onChange,
  'aria-label': ariaLabel,
}) => {
  const isActive = checked || Boolean(indeterminate);
  return (
    <input
      type="checkbox"
      checked={checked}
      ref={input => {
        if (input) input.indeterminate = Boolean(indeterminate);
      }}
      onChange={e => onChange(e.target.checked)}
      className="w-4 h-4 appearance-none rounded cursor-pointer border border-border bg-input transition-colors checked:bg-action checked:border-action focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
      aria-label={ariaLabel}
      style={
        isActive
          ? {
              backgroundImage: indeterminate ? indeterminateSvg : checkmarkSvg,
              backgroundSize: '100%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }
          : undefined
      }
    />
  );
};

// Table Header component
export const TableHeader = <T,>({
  columns,
  className = '',
}: {
  columns: TableColumn<T>[];
  className?: string;
}) => {
  const { selectable, multiSelect, selectedRows, onSelectionChange, sortConfig, onSort } =
    useTableContext();

  const handleSelectAll = (checked: boolean) => {
    // Simplified - in real implementation would need access to all row IDs
    onSelectionChange(checked ? [] : []);
  };

  const handleSort = (columnId: string) => {
    if (!onSort) return;

    const newDirection =
      sortConfig?.columnId === columnId && sortConfig.direction === 'asc' ? 'desc' : 'asc';

    onSort({ columnId, direction: newDirection });
  };

  return (
    <thead className={className}>
      <tr>
        {selectable && (
          <th className={headerVariants({})}>
            {multiSelect && (
              <TableCheckbox
                checked={selectedRows.length > 0}
                indeterminate={selectedRows.length > 0 && selectedRows.length < 100}
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
                sticky: column.sticky,
                align: column.align,
              })}
              style={{
                width: column.width,
                minWidth: column.minWidth,
              }}
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

// Table Body component
export const TableBody = <T extends TableRowBase>({
  columns,
  data,
  striped = false,
  hoverable = false,
  rowClassName,
  onRowClick,
  className = '',
}: {
  columns: TableColumn<T>[];
  data: T[];
  striped?: boolean;
  hoverable?: boolean;
  rowClassName?: string | ((row: T, index: number) => string);
  onRowClick?: (row: T, index: number) => void;
  className?: string;
}) => {
  const { selectable, selectedRows, onSelectionChange } = useTableContext();

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
    <tbody className={className}>
      {data.map((row, index) => {
        const isSelected = selectedRows.includes(row.id);
        const finalRowClassName =
          typeof rowClassName === 'function' ? rowClassName(row, index) : (rowClassName ?? '');

        return (
          <tr
            key={row.id}
            className={rowVariants({
              striped,
              hoverable: hoverable || Boolean(onRowClick),
              selectable,
              selected: isSelected,
              className: finalRowClassName,
            })}
            onClick={onRowClick ? () => onRowClick(row, index) : undefined}
          >
            {selectable && (
              <td className={cellVariants({})}>
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
                className={cellVariants({ align: column.align })}
                style={{
                  width: column.width,
                  minWidth: column.minWidth,
                }}
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

// Main Table component
// Rounded container classes mapping
const roundedClasses: Record<TableRounded, string> = {
  none: '',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
};

export function Table<T extends TableRowBase = TableRow>({
  columns,
  data,
  sortable = defaultTableProps.sortable,
  selectable = defaultTableProps.selectable,
  multiSelect = defaultTableProps.multiSelect,
  striped = defaultTableProps.striped,
  hoverable = defaultTableProps.hoverable,
  selectedRows = defaultTableProps.selectedRows,
  sortConfig,
  loading = defaultTableProps.loading,
  variant = defaultTableProps.variant,
  size = defaultTableProps.size,
  state = defaultTableProps.state,
  stickyHeader = defaultTableProps.stickyHeader,
  rounded = defaultTableProps.rounded,
  pagination: _pagination,
  onSort,
  onSelectionChange = () => {},
  onRowClick,
  emptyMessage = defaultTableProps.emptyMessage,
  loadingMessage = defaultTableProps.loadingMessage,
  'aria-label': ariaLabel,
  className,
  headerClassName,
  bodyClassName,
  rowClassName,
  maxHeight,
  virtualized: _virtualized = defaultTableProps.virtualized,
  ...props
}: TableProps<T>) {
  // When rounded, border moves to wrapper - use borderless for table
  const needsRoundedWrapper = rounded && rounded !== 'none';
  const effectiveVariant = needsRoundedWrapper ? 'borderless' : variant;

  // Table classes
  const tableClasses = tableVariants({ variant: effectiveVariant, size, state, className });

  // Context value
  const contextValue: TableContextValue = {
    selectable: selectable!,
    multiSelect: multiSelect!,
    selectedRows: selectedRows!,
    onSelectionChange,
    sortConfig,
    onSort: sortable ? onSort : undefined,
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">{loadingMessage}</div>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">{emptyMessage}</div>
      </div>
    );
  }

  const tableContent = (
    <TableContext.Provider value={contextValue}>
      <table className={tableClasses} role="table" aria-label={ariaLabel} {...props}>
        <TableHeader columns={columns} className={headerClassName} />
        <TableBody
          columns={columns}
          data={data}
          striped={striped}
          hoverable={hoverable}
          rowClassName={rowClassName}
          onRowClick={onRowClick}
          className={bodyClassName}
        />
      </table>
    </TableContext.Provider>
  );

  // Determine if we need a wrapper container
  const needsScrollWrapper = maxHeight ?? stickyHeader;

  // When rounded, move border from table to wrapper for proper corner rendering
  const borderClassForWrapper =
    needsRoundedWrapper && variant === 'default'
      ? 'border border-border'
      : needsRoundedWrapper && variant === 'bordered'
        ? 'border-2 border-border'
        : '';

  // Build wrapper classes
  const wrapperClasses = [
    needsRoundedWrapper
      ? `overflow-hidden ${roundedClasses[rounded!]} ${borderClassForWrapper}`
      : '',
    needsScrollWrapper ? 'overflow-auto' : '',
    stickyHeader ? 'relative' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Wrap if needed for rounded corners, max height, or sticky header
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR, not null coalescing
  if (needsRoundedWrapper || needsScrollWrapper) {
    return (
      <div className={wrapperClasses} style={maxHeight ? { maxHeight } : undefined} tabIndex={-1}>
        {tableContent}
      </div>
    );
  }

  return tableContent;
}

export type TableVariantsProps = VariantProps<typeof tableVariants>;
