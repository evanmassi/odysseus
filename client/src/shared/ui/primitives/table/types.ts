/**
 * Table Component Types
 *
 * Type definitions for the accessible Table primitive component.
 */

import type { ReactNode } from 'react';

// Table variant types
export type TableVariant =
  | 'default' // Standard bordered table
  | 'bordered' // Heavy border
  | 'borderless'; // No borders

// Table size types
export type TableSize =
  | 'sm' // Compact (text-sm, py-2)
  | 'md' // Standard (text-base, py-3)
  | 'lg'; // Large (text-lg, py-4)

// Table state types (for validation feedback)
export type TableState = 'default' | 'error' | 'warning' | 'success';

// Table rounded corner types
export type TableRounded =
  | 'none'
  | 'sm' // rounded-sm
  | 'md' // rounded-md
  | 'lg'; // rounded-lg

// Sort direction
export type SortDirection = 'asc' | 'desc';

// Sort configuration
export interface SortConfig {
  columnId: string;
  direction: SortDirection;
}

// Table column definition
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

// Base constraint for table data — just needs an id for selection/keying
export type TableRowBase = { id: string | number };

// Default table row type for unparameterized usage
export interface TableRow extends TableRowBase {
  [key: string]: unknown;
}

// Pagination configuration
export interface TablePagination {
  page: number;
  pageSize: number;
  total: number;
}

// Table component props
export interface TableProps<T extends TableRowBase = TableRow> {
  // Data
  columns: TableColumn<T>[];
  data: T[];

  // Features
  sortable?: boolean;
  selectable?: boolean;
  multiSelect?: boolean;
  striped?: boolean;
  hoverable?: boolean;

  // State
  selectedRows?: (string | number)[];
  sortConfig?: SortConfig;
  loading?: boolean;

  // Appearance
  variant?: TableVariant;
  size?: TableSize;
  state?: TableState;
  stickyHeader?: boolean;
  rounded?: TableRounded;

  // Pagination
  pagination?: TablePagination;

  // Event handlers
  onSort?: (config: SortConfig) => void;
  onSelectionChange?: (selectedIds: (string | number)[]) => void;
  onRowClick?: (row: T, index: number) => void;

  // Empty state
  emptyMessage?: string;
  loadingMessage?: string;

  // Accessibility
  'aria-label'?: string;

  // Styling
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  rowClassName?: string | ((row: T, index: number) => string);

  // Advanced
  maxHeight?: string | number;
  virtualized?: boolean;
}

// Table ref type
export type TableRef = HTMLTableElement;

// Table context value (internal)
export interface TableContextValue {
  selectable: boolean;
  multiSelect: boolean;
  selectedRows: (string | number)[];
  onSelectionChange: (selectedIds: (string | number)[]) => void;
  sortConfig?: SortConfig;
  onSort?: (config: SortConfig) => void;
}

// Default props
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

// Type guards
export const isTableVariant = (value: string): value is TableVariant => {
  return ['default', 'bordered', 'borderless'].includes(value);
};

export const isTableSize = (value: string): value is TableSize => {
  return ['sm', 'md', 'lg'].includes(value);
};

export const isTableState = (value: string): value is TableState => {
  return ['default', 'error', 'warning', 'success'].includes(value);
};

export const isSortDirection = (value: string): value is SortDirection => {
  return ['asc', 'desc'].includes(value);
};

export const isTableRounded = (value: string): value is TableRounded => {
  return ['none', 'sm', 'md', 'lg'].includes(value);
};
