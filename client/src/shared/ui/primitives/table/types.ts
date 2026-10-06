import type { ReactNode } from 'react';

import type { LucideIcon } from 'lucide-react';

type TableDensity = 'compact' | 'default';

export type RowState = 'success' | 'warning' | 'danger' | 'muted' | 'default';

type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  columnId: string;
  direction: SortDirection;
}

export interface TableColumn<T = Record<string, unknown>> {
  id: string;
  header: string;
  accessor?: keyof T | ((row: T) => ReactNode);
  width?: string | number;
  truncates?: boolean;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T, index: number) => ReactNode;
}

export type TableRowBase = { id: string | number };

interface TableRowMap extends TableRowBase {
  [key: string]: unknown;
}

interface TableToolbar {
  left?: ReactNode;
  right?: ReactNode;
}

export interface TableProps<T extends TableRowBase = TableRowMap> {
  columns: TableColumn<T>[];
  data: T[];
  sortable?: boolean;
  selectable?: boolean;
  multiSelect?: boolean;
  hoverable?: boolean;
  selectedRows?: (string | number)[];
  sortConfig?: SortConfig;
  loading?: boolean;
  density?: TableDensity;
  onSort?: (config: SortConfig) => void;
  onSelectionChange?: (selectedIds: (string | number)[]) => void;
  onRowClick?: (row: T, index: number) => void;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
  loadingMessage?: string;
  'aria-label'?: string;
  className?: string;
  rowState?: (row: T, index: number) => RowState;
  selectedRowGlow?: boolean;
  toolbar?: TableToolbar;
}

export interface TableContextValue {
  selectable: boolean;
  multiSelect: boolean;
  selectedRows: (string | number)[];
  allRowIds: (string | number)[];
  onSelectionChange: (selectedIds: (string | number)[]) => void;
  sortConfig?: SortConfig;
  onSort?: (config: SortConfig) => void;
  density: TableDensity;
}

export const defaultTableProps = {
  density: 'default',
  sortable: false,
  selectable: false,
  multiSelect: false,
  hoverable: true,
  loading: false,
  selectedRows: [],
  emptyMessage: 'No data available',
  loadingMessage: 'Loading...',
} satisfies Partial<TableProps>;
