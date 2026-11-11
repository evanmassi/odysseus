import { memo } from 'react';

import { Plus } from 'lucide-react';

import { Button, Tooltip } from '@shared/ui';
import { ROW_HOVER_GLOW } from '@shared/ui/primitives/table/rowGlow';

import { focusOnMount } from '../../../../utils/dom/focusOnMount';
import { withGreekLetters } from '../../../../utils/materials/greekLetters';

import { stickyBackground, VALUE_CELL, VALUE_NAME_CELL } from './valueTableStyles';
import { WorkbenchValueTableCell, type ValueCellView } from './WorkbenchValueTableCell';

import type {
  ValueRowRail,
  ValueTableCell,
  ValueTableColumn,
  ValueTableRow,
} from '../../../../utils/values/valueTable';

export interface ValueRowActions {
  onEditCell: (cellId: string | undefined) => void;
  onEditName: (rowId: string | undefined) => void;
  onRename: (row: ValueTableRow, name: string) => void;
  onToggleAdd: (rowId: string) => void;
  onFillColumn: (row: ValueTableRow, column: ValueTableColumn) => void;
  onValueChange: (cell: ValueTableCell, value: string) => void;
  onUnitChange: (cell: ValueTableCell, unit: string) => void;
  onRemoveCell: (cell: ValueTableCell) => void;
  onRemoveRow: (row: ValueTableRow) => void;
}

interface WorkbenchValueTableRowProps {
  row: ValueTableRow;
  columns: readonly ValueTableColumn[];
  views: Readonly<Record<string, ValueCellView>>;
  isZebra: boolean;
  isNameCovering: boolean;
  editingCellId: string | undefined;
  isEditingName: boolean;
  isAdding: boolean;
  actions: ValueRowActions;
}

const STATUS_NOTE = { current: '', dropped: 'dropped', missing: 'no longer in Materials' };
const RAIL_X = 'left-[25px]';
const NEUTRAL_RAIL = 'hsl(var(--muted-foreground) / 0.5)';

function RailMark({ rail }: { rail: ValueRowRail }) {
  if (rail.place === 'none') return null;
  const color = rail.color ?? NEUTRAL_RAIL;
  const run =
    rail.place === 'start'
      ? 'top-[calc(50%+8px)] bottom-0'
      : rail.place === 'middle'
        ? 'inset-y-0'
        : 'top-0 h-1/2';
  return (
    <>
      <span
        aria-hidden
        className={`absolute ${RAIL_X} ${run} w-0.5 opacity-70`}
        style={{ backgroundColor: color }}
      />
      {rail.place !== 'start' && (
        <span
          aria-hidden
          className={`absolute ${RAIL_X} top-1/2 h-0.5 w-2.5 opacity-70`}
          style={{ backgroundColor: color }}
        />
      )}
    </>
  );
}

export const WorkbenchValueTableRow = memo(function WorkbenchValueTableRow({
  row,
  columns,
  views,
  isZebra,
  isNameCovering,
  editingCellId,
  isEditingName,
  isAdding,
  actions,
}: WorkbenchValueTableRowProps) {
  const cellByColumn = new Map(row.cells.map(cell => [cell.columnKey, cell]));
  const editableIds = columns.flatMap(column => {
    const cell = cellByColumn.get(column.key);
    return cell && views[cell.id].isEditable ? [cell.id] : [];
  });
  const moveEdit = (cellId: string, step: 1 | -1) =>
    actions.onEditCell(editableIds[editableIds.indexOf(cellId) + step]);
  const canAdd = !row.isSubRow && (row.section !== undefined || row.material !== undefined);
  const isNameEditable = row.section !== undefined && row.status !== 'missing';
  const note = STATUS_NOTE[row.status];

  const nameContent = (
    <span className="flex items-center gap-2">
      {row.swatch && (
        <span
          aria-hidden
          className={`h-3 w-3 flex-none border ${row.swatch.isOutline ? 'border-2' : 'border-line-soft'}`}
          style={
            row.swatch.isOutline
              ? {
                  borderColor: row.swatch.color,
                  backgroundColor: `color-mix(in srgb, ${row.swatch.color} 14%, transparent)`,
                }
              : { backgroundColor: row.swatch.color }
          }
        />
      )}
      {isEditingName ? (
        <input
          ref={focusOnMount}
          defaultValue={row.name}
          placeholder={row.material ? 'Name' : 'Name this mix'}
          aria-label="Row name"
          spellCheck={false}
          className="inline-edit-field font-semibold text-foreground"
          onChange={event => actions.onRename(row, event.target.value)}
          onBlur={event => {
            const converted = withGreekLetters(event.target.value);
            if (converted !== event.target.value) actions.onRename(row, converted);
            actions.onEditName(undefined);
          }}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === 'Escape') actions.onEditName(undefined);
          }}
        />
      ) : isNameEditable ? (
        <Tooltip content={row.material ? 'Renames it in Materials too' : undefined}>
          <button
            type="button"
            className="inline-edit text-left font-semibold text-foreground"
            onClick={() => actions.onEditName(row.id)}
          >
            {row.name || <span className="font-normal text-muted-foreground">Name this mix</span>}
          </button>
        </Tooltip>
      ) : (
        <span className={row.isSubRow ? 'text-muted-foreground' : 'font-semibold text-foreground'}>
          {row.name}
        </span>
      )}
      {note && <span className="text-label-xs text-muted-foreground">{note}</span>}
    </span>
  );

  return (
    <tr
      className={`group ${ROW_HOVER_GLOW.primary} ${isZebra ? 'bg-[hsl(var(--foreground)/var(--alpha-zebra))]' : ''}`}
    >
      <td
        className={`${VALUE_NAME_CELL} ${row.isSubRow ? 'pl-10' : 'pl-5'}`}
        style={isNameCovering ? { background: stickyBackground(isZebra) } : undefined}
      >
        <RailMark rail={row.rail} />
        {nameContent}
      </td>
      {columns.map(column => {
        const cell = cellByColumn.get(column.key);
        if (cell) {
          return (
            <WorkbenchValueTableCell
              key={column.key}
              view={views[cell.id]}
              isEditing={editingCellId === cell.id}
              onEdit={isEditing => actions.onEditCell(isEditing ? cell.id : undefined)}
              onMoveEdit={step => moveEdit(cell.id, step)}
              onValueChange={value => actions.onValueChange(cell, value)}
              onUnitChange={unit => actions.onUnitChange(cell, unit)}
              onRemove={() => actions.onRemoveCell(cell)}
            />
          );
        }
        const canFill = canAdd && column.origin === 'typed';
        return (
          <td key={column.key} className={`${VALUE_CELL} text-muted-foreground/40`}>
            {canFill ? (
              <Tooltip content={`Add ${column.label} for ${row.name}`}>
                <button
                  type="button"
                  aria-label={`Add ${column.label} for ${row.name}`}
                  className="font-mono text-data-sm hover:text-primary"
                  onClick={() => actions.onFillColumn(row, column)}
                >
                  ·
                </button>
              </Tooltip>
            ) : (
              <span className="font-mono text-data-sm">·</span>
            )}
          </td>
        );
      })}
      <td className="w-px whitespace-nowrap px-2 text-right">
        <span className="inline-flex items-center gap-1">
          {canAdd && (
            <Tooltip content={`Add a value to ${row.name || 'this mix'}`}>
              <button
                type="button"
                aria-label={`Add a value to ${row.name || 'this mix'}`}
                aria-expanded={isAdding}
                className={`p-1 text-muted-foreground hover:text-primary ${
                  isAdding
                    ? 'text-primary'
                    : 'opacity-0 focus-visible:opacity-100 group-hover:opacity-100'
                }`}
                onClick={() => actions.onToggleAdd(row.id)}
              >
                <Plus aria-hidden className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}
          {row.section && (
            <Button
              variant="ghost-danger"
              size="xs"
              className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
              onClick={() => actions.onRemoveRow(row)}
            >
              Remove
            </Button>
          )}
        </span>
      </td>
    </tr>
  );
});
