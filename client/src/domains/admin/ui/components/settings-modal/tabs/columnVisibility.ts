/**
 * Settings Table Column Visibility
 *
 * Read-only settings tabs omit the row-actions column, identified by the `'actions'` id.
 */
import type { TableColumn } from '@shared/ui';

export function visibleColumns<T>(columns: TableColumn<T>[], readOnly: boolean): TableColumn<T>[] {
  return readOnly ? columns.filter(column => column.id !== 'actions') : columns;
}
