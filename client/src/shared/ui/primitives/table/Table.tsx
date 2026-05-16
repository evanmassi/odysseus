/**
 * Table
 *
 * Flat data table — mono uppercase headers, hairline rows, lit selected row.
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
    'font-mono uppercase tracking-[0.22em] text-[10px] font-normal',
    'text-left text-foreground/80',
    'border-b border-foreground/10 bg-surface-elev bg-scanlines',
    'px-5',
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
  ['px-5 text-sm text-muted-foreground align-middle', 'border-b border-foreground/[0.06]'],
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
      true: 'hover:bg-foreground/[0.015] cursor-pointer',
      false: '',
    },
    selectable: {
      true: 'cursor-pointer',
      false: '',
    },
    selected: {
      true: 'shadow-[inset_3px_0_0_0_hsl(var(--primary))]',
      false: '',
    },
  },
  defaultVariants: {
    hoverable: false,
    selectable: false,
    selected: false,
  },
});

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
      className="w-4 h-4 appearance-none cursor-pointer border border-border bg-input transition-colors checked:bg-action checked:border-action focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
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
        const isLast = index === data.length - 1;

        return (
          <tr
            key={row.id}
            className={`${rowVariants({
              hoverable: hoverable || Boolean(onRowClick),
              selectable,
              selected: isSelected,
            })} ${isLast ? '[&>td]:border-b-0' : ''} ${extra}`}
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
