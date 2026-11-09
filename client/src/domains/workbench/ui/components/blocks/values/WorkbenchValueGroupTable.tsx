import { useState, type ReactNode } from 'react';

import { ScrollArea, Tooltip } from '@shared/ui';
import {
  TABLE_HEADER_BAND,
  TABLE_HEADER_RULE,
} from '@shared/ui/primitives/table/tableHeaderStyles';

import { focusOnMount } from '../../../../utils/dom/focusOnMount';
import { BLOCK_ICONS } from '../../board/blockIcons';
import { HORIZONTAL_SCROLL } from '../materials/materialTableStyles';
import { WorkbenchMaterialSection } from '../materials/WorkbenchMaterialSection';

import { EDITABLE_HOVER, VALUE_HEAD_CELL, VALUE_NAME_CELL } from './valueTableStyles';
import { WorkbenchValueTableRow, type ValueRowActions } from './WorkbenchValueTableRow';

import type {
  ValueOrigin,
  ValueTableColumn,
  ValueTableGroup,
  ValueTableRow,
} from '../../../../utils/values/valueTable';

interface WorkbenchValueGroupTableProps {
  group: ValueTableGroup;
  editingCellId: string | undefined;
  editingNameRowId: string | undefined;
  editingColumnKey: string | undefined;
  addingRowId: string | undefined;
  actions: ValueRowActions;
  renderAdder: (row: ValueTableRow) => ReactNode;
  onEditColumn: (column: ValueTableColumn | undefined) => void;
  onRenameColumn: (name: string) => void;
}

const ORIGIN_MARK: Partial<Record<ValueOrigin, { icon: typeof BLOCK_ICONS.plate; note: string }>> =
  {
    plate: { icon: BLOCK_ICONS.plate, note: 'Read from the plate map' },
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
  if (column.origin === 'worked') return <span>{column.label}</span>;
  if (isEditing) {
    return (
      <input
        ref={focusOnMount}
        defaultValue={column.label}
        aria-label="Column name"
        spellCheck={false}
        className="w-32 border-b border-line-soft bg-transparent text-right outline-none focus:border-primary"
        onChange={event => event.target.value.trim() && onRename(event.target.value)}
        onBlur={() => onEdit(undefined)}
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
          {column.label}
        </span>
      </Tooltip>
    );
  }
  return (
    <Tooltip content="Rename this value on every row">
      <button
        type="button"
        className={`type-label ${EDITABLE_HOVER}`}
        onClick={() => onEdit(column)}
      >
        {column.label}
      </button>
    </Tooltip>
  );
}

export function WorkbenchValueGroupTable({
  group,
  editingCellId,
  editingNameRowId,
  editingColumnKey,
  addingRowId,
  actions,
  renderAdder,
  onEditColumn,
  onRenameColumn,
}: WorkbenchValueGroupTableProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const mainRowCount = group.rows.filter(row => !row.isSubRow).length;
  const span = group.columns.length + 2;

  return (
    <WorkbenchMaterialSection title={group.label} count={mainRowCount}>
      <ScrollArea
        options={HORIZONTAL_SCROLL}
        events={{
          scroll: instance => setIsScrolled(instance.elements().viewport.scrollLeft > 0),
        }}
      >
        <table className="border-collapse">
          <thead>
            <tr className={`relative ${TABLE_HEADER_BAND} ${TABLE_HEADER_RULE} after:z-[2]`}>
              <th
                className={`${VALUE_NAME_CELL} ${TABLE_HEADER_BAND} pl-5 type-label text-label-2xs font-semibold text-primary/80 dark:text-foreground/80`}
              >
                Name
              </th>
              {group.columns.map(column => (
                <th key={column.key} className={VALUE_HEAD_CELL}>
                  <ColumnHeading
                    column={column}
                    isEditing={editingColumnKey === column.key}
                    onEdit={onEditColumn}
                    onRename={onRenameColumn}
                  />
                </th>
              ))}
              <th className="w-px" />
            </tr>
          </thead>
          <tbody>
            {group.rows.flatMap((row, index) => [
              <WorkbenchValueTableRow
                key={row.id}
                row={row}
                columns={group.columns}
                isZebra={index % 2 === 1}
                isNameCovering={isScrolled}
                editingCellId={editingCellId}
                isEditingName={editingNameRowId === row.id}
                isAdding={addingRowId === row.id}
                actions={actions}
              />,
              ...(addingRowId === row.id
                ? [
                    <tr key={`${row.id}:add`}>
                      <td colSpan={span} className="pb-2 pl-5 pr-3">
                        {renderAdder(row)}
                      </td>
                    </tr>,
                  ]
                : []),
            ])}
          </tbody>
        </table>
      </ScrollArea>
    </WorkbenchMaterialSection>
  );
}
