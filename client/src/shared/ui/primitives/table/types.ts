/**
 * Table Component Types
 *
 * Type definitions for the Table primitive component.
 */

import type { ReactNode } from 'react';

export type TableVariant = 'default' | 'bordered' | 'borderless';

export type TableSize = 'sm' | 'md' | 'lg';

export type TableState = 'default' | 'error' | 'warning' | 'success';

export type TableRounded = 'none' | 'sm' | 'md' | 'lg';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  columnId: string;
  direction: SortDirection;
}

export interface TableColumn<T = Record<string, unknown>> {
  id: string;
  header: string;
  accessor?: keyof T | ((row: T) => ReactNode);
  width?: string | number;
  minWidth?: string | number;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  sticky?: boolean;
  render?: (value: unknown, row: T, index: number) => ReactNode;
}

// Just needs an id for selection/keying
export type TableRowBase = { id: string | number };

// For unparameterized usage
export interface TableRow extends TableRowBase {
  [key: string]: unknown;
}

export interface TablePagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface TableProps<T extends TableRowBase = TableRow> {
  columns: TableColumn<T>[];
  data: T[];
  sortable?: boolean;
  selectable?: boolean;
  multiSelect?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  selectedRows?: (string | number)[];
  sortConfig?: SortConfig;
  loading?: boolean;
  variant?: TableVariant;
  size?: TableSize;
  state?: TableState;
  stickyHeader?: boolean;
  rounded?: TableRounded;
  pagination?: TablePagination;
  onSort?: (config: SortConfig) => void;
  onSelectionChange?: (selectedIds: (string | number)[]) => void;
  onRowClick?: (row: T, index: number) => void;
  emptyMessage?: string;
  loadingMessage?: string;
  'aria-label'?: string;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  rowClassName?: string | ((row: T, index: number) => string);
  maxHeight?: string | number;
  virtualized?: boolean;
}

export type TableRef = HTMLTableElement;

// Internal
export interface TableContextValue {
  selectable: boolean;
  multiSelect: boolean;
  selectedRows: (string | number)[];
  onSelectionChange: (selectedIds: (string | number)[]) => void;
  sortConfig?: SortConfig;
  onSort?: (config: SortConfig) => void;
}

export const defaultTableProps: Partial<TableProps> = {
  variant: 'default',
  size: 'md',
  state: 'default',
  rounded: 'none',
  sortable: false,
  selectable: false,
  multiSelect: false,
  striped: false,
  hoverable: true,
  loading: false,
  stickyHeader: false,
  virtualized: false,
  selectedRows: [],
  emptyMessage: 'No data available',
  loadingMessage: 'Loading...',
};
