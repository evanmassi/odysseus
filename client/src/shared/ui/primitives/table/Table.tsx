import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import { cva } from 'class-variance-authority';

import { Checkbox } from '../checkbox/Checkbox';
import { PanelEmptyState } from '../panel-empty-state/PanelEmptyState';

import { ROW_HOVER_GLOW } from './rowHoverGlow';
import { defaultTableProps } from './types';

import type { RowState, TableColumn, TableRowBase, TableProps, TableContextValue } from './types';

type GlowTone = 'primary' | 'success' | 'warning' | 'danger';

const stateToGlowTone = (state: RowState): GlowTone =>
  state === 'success' || state === 'warning' || state === 'danger' ? state : 'primary';

const GLOW_BASE = [
  '[background-image:linear-gradient(0deg,hsl(var(--row-tone)/0.1),hsl(var(--row-tone)/0.1))]',
  'dark:[background-image:var(--scanline-layer),linear-gradient(90deg,hsl(var(--row-tone)/0.12)_0%,hsl(var(--row-tone)/0.05)_55%,transparent_100%)]',
  'shadow-[inset_3px_0_0_0_hsl(var(--row-tone))]',
  '[&>td]:!bg-transparent',
  '[&>td]:font-semibold',
].join(' ');

const ROW_GLOW: Record<GlowTone, string> = {
  primary: `[--row-tone:var(--primary)] ${GLOW_BASE}`,
  success: `[--row-tone:var(--color-success-bg)] ${GLOW_BASE}`,
  warning: `[--row-tone:var(--color-warning-bg)] ${GLOW_BASE}`,
  danger: `[--row-tone:var(--color-danger-bg)] ${GLOW_BASE}`,
};

const CHECKBOX_CELL_OVERRIDE = '!px-3 text-center w-10';

const HEADER_BAND =
  '[background:linear-gradient(0deg,hsl(var(--primary)/0.07),hsl(var(--primary)/0.07)),color-mix(in_srgb,hsl(var(--card))_96%,black)] dark:[background:color-mix(in_srgb,hsl(var(--card))_72%,black)]';

const HEADER_RULE =
  "after:absolute after:inset-x-0 after:bottom-0 after:h-px after:content-[''] after:[background:linear-gradient(90deg,transparent_0%,hsl(var(--foreground)/0.22)_12%,hsl(var(--foreground)/0.22)_88%,transparent_100%)]";

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
    'type-label text-label-2xs font-semibold',
    'text-left text-primary/80 dark:text-foreground/80',
    'px-4 first:pl-5 last:pr-5',
  ],
  {
    variants: {
      sortable: {
        true: 'cursor-pointer hover:text-primary dark:hover:text-foreground select-none',
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
      align: 'left',
      density: 'default',
    },
  }
);

const cellVariants = cva(
  [
    'px-4 first:pl-5 last:pr-5 align-middle',
    'font-display text-body-sm tabular-nums text-foreground',
    'group-hover:bg-[hsl(var(--foreground)/var(--alpha-hover))]',
  ],
  {
    variants: {
      align: {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
      },
      density: {
        compact: 'py-2.5',
        default: 'py-3.5',
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
  },
  defaultVariants: {
    hoverable: false,
    clickable: false,
  },
});

const STATE_TEXT: Record<RowState, string> = {
  default: '',
  success: 'text-success-text',
  warning: 'text-warning-text',
  danger: 'text-danger-text',
  muted: 'text-foreground/60',
};

const STATE_STRIPE: Record<RowState, string> = {
  default: '[&>td:first-child]:shadow-[inset_3px_0_0_0_hsl(var(--primary))]',
  success: '[&>td:first-child]:shadow-[inset_3px_0_0_0_hsl(var(--color-success-bg))]',
  warning: '[&>td:first-child]:shadow-[inset_3px_0_0_0_hsl(var(--color-warning-bg))]',
  danger: '[&>td:first-child]:shadow-[inset_3px_0_0_0_hsl(var(--color-danger-bg))]',
  muted:
    '[&>td:first-child]:shadow-[inset_3px_0_0_0_hsl(var(--foreground)/var(--alpha-stripe-muted))]',
};

interface SortIndicatorProps {
  direction?: 'asc' | 'desc';
}

const SortIndicator = ({ direction }: SortIndicatorProps) => (
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
      <tr className={`relative z-10 ${HEADER_BAND} ${HEADER_RULE}`}>
        {selectable && (
          <th className={`${headerVariants({ density })} ${CHECKBOX_CELL_OVERRIDE}`}>
            {multiSelect && (
              <Checkbox
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
  onRowClick,
  rowState,
  selectedRowGlow,
}: {
  columns: TableColumn<T>[];
  data: T[];
  hoverable: boolean;
  onRowClick?: (row: T, index: number) => void;
  rowState?: (row: T, index: number) => RowState;
  selectedRowGlow?: boolean;
}) => {
  const { selectable, selectedRows, onSelectionChange, density } = useTableContext();

  const handleRowSelect = (rowId: string | number, checked: boolean) => {
    const newSelection = checked
      ? [...selectedRows, rowId]
      : selectedRows.filter(id => id !== rowId);
    onSelectionChange(newSelection);
  };

  const getCellValue = (column: TableColumn<T>, row: T, index: number): ReactNode => {
    const resolved = column.accessor
      ? typeof column.accessor === 'function'
        ? column.accessor(row)
        : row[column.accessor]
      : undefined;

    if (column.render) return column.render(resolved, row, index);
    if (column.accessor) return resolved as ReactNode;
    return null;
  };

  return (
    <tbody>
      {data.map((row, index) => {
        const isSelected = selectedRows.includes(row.id);
        const state = rowState?.(row, index) ?? 'default';
        const zebra = index % 2 === 1 ? 'bg-[hsl(var(--foreground)/var(--alpha-zebra))]' : '';
        const glow = selectedRowGlow && isSelected ? ROW_GLOW[stateToGlowTone(state)] : '';
        const stripe = !glow && (isSelected || state !== 'default') ? STATE_STRIPE[state] : '';
        const text = STATE_TEXT[state];
        const hover =
          hoverable && !isSelected && state !== 'muted'
            ? `${ROW_HOVER_GLOW[stateToGlowTone(state)]} [&:hover>td]:!bg-transparent`
            : '';

        return (
          <tr
            key={row.id}
            className={`${rowVariants({
              hoverable,
              clickable: Boolean(onRowClick),
            })} ${zebra} ${stripe} ${text} ${glow} ${hover}`}
            onClick={onRowClick ? () => onRowClick(row, index) : undefined}
          >
            {selectable && (
              <td className={`${cellVariants({ density })} ${CHECKBOX_CELL_OVERRIDE}`}>
                <Checkbox
                  checked={isSelected}
                  onChange={checked => handleRowSelect(row.id, checked)}
                  aria-label={`Select row ${index + 1}`}
                  tone={state === 'success' ? 'success' : 'primary'}
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
  onSort,
  onSelectionChange = () => {},
  onRowClick,
  emptyMessage = defaultTableProps.emptyMessage,
  emptyIcon,
  loadingMessage = defaultTableProps.loadingMessage,
  'aria-label': ariaLabel,
  className,
  rowState,
  selectedRowGlow,
  toolbar,
}: TableProps<T>) {
  const contextValue: TableContextValue = {
    selectable,
    multiSelect,
    selectedRows,
    allRowIds: data.map(row => row.id),
    onSelectionChange,
    sortConfig,
    onSort: sortable ? onSort : undefined,
    density,
  };

  const body = loading ? (
    <div className="flex items-center justify-center py-8">
      <div className="text-muted-foreground">{loadingMessage}</div>
    </div>
  ) : data.length === 0 ? (
    emptyIcon ? (
      <PanelEmptyState icon={emptyIcon} message={emptyMessage} />
    ) : (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">{emptyMessage}</div>
      </div>
    )
  ) : (
    <TableContext.Provider value={contextValue}>
      <table className={`w-full border-collapse ${className ?? ''}`} aria-label={ariaLabel}>
        <TableHeader columns={columns} />
        <TableBody
          columns={columns}
          data={data}
          hoverable={hoverable}
          onRowClick={onRowClick}
          rowState={rowState}
          selectedRowGlow={selectedRowGlow}
        />
      </table>
    </TableContext.Provider>
  );

  if (!toolbar) {
    return body;
  }

  return (
    <div>
      <div className="flex items-center gap-3 px-5 py-3.5">
        {toolbar.left}
        <div className="flex-1" />
        {toolbar.right}
      </div>
      {body}
    </div>
  );
}
