import { memo, type RefObject } from 'react';

import { X } from 'lucide-react';

import { Tooltip } from '@shared/ui';

import { MATERIAL_HEAD_CELL, MATERIAL_HEAD_ROW } from './materialTableStyles';

import type { FieldDefinition } from '@odysseus/shared-schemas';

export interface MaterialSectionActions {
  hideColumn: (group: string, fieldKey: string) => void;
  toggleFieldMenu: (group: string) => void;
}

interface WorkbenchMaterialHeaderRowProps {
  group: string;
  columns: readonly FieldDefinition[];
  isFieldMenuOpen: boolean;
  fieldButtonRef: RefObject<HTMLButtonElement>;
  actions: MaterialSectionActions;
}

const isSameHeader = (a: WorkbenchMaterialHeaderRowProps, b: WorkbenchMaterialHeaderRowProps) =>
  a.group === b.group &&
  a.isFieldMenuOpen === b.isFieldMenuOpen &&
  a.fieldButtonRef === b.fieldButtonRef &&
  a.actions === b.actions &&
  a.columns.length === b.columns.length &&
  a.columns.every((column, index) => column === b.columns[index]);

export const WorkbenchMaterialHeaderRow = memo(function WorkbenchMaterialHeaderRow({
  group,
  columns,
  isFieldMenuOpen,
  fieldButtonRef,
  actions,
}: WorkbenchMaterialHeaderRowProps) {
  return (
    <thead>
      <tr className={MATERIAL_HEAD_ROW}>
        <th className={MATERIAL_HEAD_CELL}>Name</th>
        <th className={MATERIAL_HEAD_CELL}>Type</th>
        {columns.map(column => (
          <th key={column.key} className={MATERIAL_HEAD_CELL}>
            {column.label}
            <Tooltip content="Hide this column">
              <button
                type="button"
                className="ml-1.5 inline-flex align-middle text-muted-foreground opacity-0 transition-opacity hover:text-danger-text focus-visible:opacity-100 group-hover/head:opacity-100"
                aria-label={`Hide ${column.label}`}
                onClick={() => actions.hideColumn(group, column.key)}
              >
                <X aria-hidden className="h-3 w-3" />
              </button>
            </Tooltip>
          </th>
        ))}
        <th className={MATERIAL_HEAD_CELL}>Used in</th>
        <th className={`${MATERIAL_HEAD_CELL} w-px text-right`}>
          <button
            ref={fieldButtonRef}
            type="button"
            className={`type-label transition-colors hover:text-foreground ${
              isFieldMenuOpen ? 'text-foreground' : 'text-foreground/55'
            }`}
            aria-expanded={isFieldMenuOpen}
            onClick={() => actions.toggleFieldMenu(group)}
          >
            + Field
          </button>
        </th>
      </tr>
    </thead>
  );
}, isSameHeader);
