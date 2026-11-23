import { memo, type RefObject } from 'react';

import { Plus } from 'lucide-react';

import { ADD_ICON } from '../../board/addIconClass';
import { capsKeepingGreek } from '../../board/capsKeepingGreek';

import {
  MATERIAL_HEAD_CELL,
  MATERIAL_HEAD_CELL_RIGHT,
  MATERIAL_HEAD_ROW,
} from './materialTableStyles';
import { WorkbenchMaterialHideColumnButton } from './WorkbenchMaterialHideColumnButton';

import type { FieldDefinition } from '@odysseus/shared-schemas';

export interface MaterialSectionActions {
  hideColumn: (group: string, fieldKey: string) => void;
  toggleFieldMenu: (group: string) => void;
}

interface WorkbenchMaterialHeaderRowProps {
  group: string;
  columns: readonly FieldDefinition[];
  labels: readonly string[];
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
  a.columns.every((column, index) => column === b.columns[index]) &&
  a.labels.every((label, index) => label === b.labels[index]);

export const WorkbenchMaterialHeaderRow = memo(function WorkbenchMaterialHeaderRow({
  group,
  columns,
  labels,
  isFieldMenuOpen,
  fieldButtonRef,
  actions,
}: WorkbenchMaterialHeaderRowProps) {
  return (
    <thead>
      <tr className={MATERIAL_HEAD_ROW}>
        <th className={MATERIAL_HEAD_CELL}>Name</th>
        <th className={MATERIAL_HEAD_CELL}>Type</th>
        {columns.map((column, index) => {
          const isNumber = column.kind === 'number';
          const hideButton = (
            <WorkbenchMaterialHideColumnButton
              label={labels[index]}
              isBeforeLabel={isNumber}
              onHide={() => actions.hideColumn(group, column.key)}
            />
          );
          return (
            <th
              key={column.key}
              className={isNumber ? MATERIAL_HEAD_CELL_RIGHT : MATERIAL_HEAD_CELL}
            >
              {isNumber && hideButton}
              {capsKeepingGreek(labels[index])}
              {!isNumber && hideButton}
            </th>
          );
        })}
        <th className={MATERIAL_HEAD_CELL}>Used in</th>
        <th className={`${MATERIAL_HEAD_CELL_RIGHT} w-px`}>
          <button
            ref={fieldButtonRef}
            type="button"
            className={`inline-flex items-center gap-1 type-label transition-colors hover:text-foreground ${
              isFieldMenuOpen ? 'text-foreground' : 'text-foreground/55'
            }`}
            aria-expanded={isFieldMenuOpen}
            onClick={() => actions.toggleFieldMenu(group)}
          >
            <Plus aria-hidden className={ADD_ICON} />
            Add field
          </button>
        </th>
      </tr>
    </thead>
  );
}, isSameHeader);
