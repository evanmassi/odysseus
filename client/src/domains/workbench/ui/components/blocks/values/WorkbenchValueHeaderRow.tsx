import { memo } from 'react';

import { withGreekLetters } from '@odysseus/shared-schemas';
import { PaintBucket } from 'lucide-react';

import { Tooltip } from '@shared/ui';
import {
  TABLE_HEADER_BAND,
  TABLE_HEADER_RULE,
} from '@shared/ui/primitives/table/tableHeaderStyles';

import { focusOnMount } from '../../../../utils/dom/focusOnMount';
import { BLOCK_ICONS } from '../../board/blockIcons';
import { capsKeepingGreek } from '../../board/capsKeepingGreek';

import { VALUE_HEAD_CELL, VALUE_NAME_CELL } from './valueTableStyles';
import { WorkbenchValueColumnFillCell } from './WorkbenchValueColumnFillCell';

import type { ValueOrigin, ValueTableColumn } from '../../../../utils/values/valueTable';

export interface ValueColumnActions {
  onEditColumn: (groupKey: string, column: ValueTableColumn | undefined) => void;
  onRenameColumn: (name: string) => void;
  onStartFill: (groupKey: string, column: ValueTableColumn | undefined) => void;
  onFillBlanks: (groupKey: string, column: ValueTableColumn, value: string, unit: string) => void;
}

interface ColumnFillInfo {
  count: number;
  unit: string;
}

interface WorkbenchValueHeaderRowProps {
  groupKey: string;
  columns: readonly ValueTableColumn[];
  columnFills: Readonly<Record<string, ColumnFillInfo>>;
  editingColumnKey: string | undefined;
  fillingColumnKey: string | undefined;
  actions: ValueColumnActions;
}

const ORIGIN_MARK: Partial<Record<ValueOrigin, { icon: typeof BLOCK_ICONS.plate; note: string }>> =
  {
    plate: { icon: BLOCK_ICONS.plate, note: 'Read from the labware' },
    materials: { icon: BLOCK_ICONS.materials, note: 'Read from Materials' },
  };

function ColumnHeading({
  column,
  isEditing,
  onEdit,
  onRename,
}: {
  column: ValueTableColumn;
  isEditing: boolean;
  onEdit: (column: ValueTableColumn | undefined) => void;
  onRename: (name: string) => void;
}) {
  const mark = ORIGIN_MARK[column.origin];
  if (column.origin === 'worked') return <span>{capsKeepingGreek(column.label)}</span>;
  if (isEditing) {
    return (
      <input
        ref={focusOnMount}
        defaultValue={column.label}
        aria-label="Column name"
        spellCheck={false}
        className="inline-edit-field text-right"
        onChange={event => event.target.value.trim() && onRename(event.target.value)}
        onBlur={event => {
          const converted = withGreekLetters(event.target.value);
          if (converted.trim() && converted !== event.target.value) onRename(converted);
          onEdit(undefined);
        }}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === 'Escape') onEdit(undefined);
        }}
      />
    );
  }
  if (mark) {
    const Icon = mark.icon;
    return (
      <Tooltip content={mark.note}>
        <span className="inline-flex items-center gap-1.5">
          <Icon aria-hidden className="h-3 w-3 text-muted-foreground" />
          {capsKeepingGreek(column.label)}
        </span>
      </Tooltip>
    );
  }
  return (
    <Tooltip content="Rename this value on every row">
      <button
        type="button"
        data-align="end"
        className="inline-edit type-label"
        onClick={() => onEdit(column)}
      >
        {capsKeepingGreek(column.label)}
      </button>
    </Tooltip>
  );
}

function ColumnFillButton({
  column,
  count,
  onStart,
}: {
  column: ValueTableColumn;
  count: number;
  onStart: () => void;
}) {
  return (
    <Tooltip content={`Fill the ${count} empty with one value`}>
      <button
        type="button"
        aria-label={`Fill the empty ${column.label}`}
        className="text-muted-foreground opacity-0 transition-opacity hover:text-primary focus-visible:opacity-100 group-hover/head:opacity-100"
        onClick={onStart}
      >
        <PaintBucket aria-hidden className="h-3 w-3" />
      </button>
    </Tooltip>
  );
}

export const WorkbenchValueHeaderRow = memo(function WorkbenchValueHeaderRow({
  groupKey,
  columns,
  columnFills,
  editingColumnKey,
  fillingColumnKey,
  actions,
}: WorkbenchValueHeaderRowProps) {
  return (
    <tr className={`relative ${TABLE_HEADER_BAND} ${TABLE_HEADER_RULE} after:z-[2]`}>
      <th
        className={`${VALUE_NAME_CELL} ${TABLE_HEADER_BAND} pl-5 type-label text-label-2xs font-semibold text-primary/80 dark:text-foreground/80`}
      >
        Name
      </th>
      {columns.map(column => {
        const fill = columnFills[column.key];
        const canFill = column.origin !== 'worked' && fill && fill.count > 0;
        if (canFill && fillingColumnKey === column.key) {
          return (
            <WorkbenchValueColumnFillCell
              key={column.key}
              count={fill.count}
              unit={fill.unit}
              onFill={(value, unit) => actions.onFillBlanks(groupKey, column, value, unit)}
              onClose={() => actions.onStartFill(groupKey, undefined)}
            />
          );
        }
        return (
          <th key={column.key} className={`group/head ${VALUE_HEAD_CELL}`}>
            <span className="inline-flex items-center gap-1.5">
              {canFill && (
                <ColumnFillButton
                  column={column}
                  count={fill.count}
                  onStart={() => actions.onStartFill(groupKey, column)}
                />
              )}
              <ColumnHeading
                column={column}
                isEditing={editingColumnKey === column.key}
                onEdit={next => actions.onEditColumn(groupKey, next)}
                onRename={actions.onRenameColumn}
              />
            </span>
          </th>
        );
      })}
      <th className="w-px" />
    </tr>
  );
});
