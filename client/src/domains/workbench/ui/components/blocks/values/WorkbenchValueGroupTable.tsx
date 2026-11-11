import { useState, type ReactNode } from 'react';

import { ScrollArea } from '@shared/ui';

import { HORIZONTAL_SCROLL } from '../materials/materialTableStyles';
import { WorkbenchMaterialSection } from '../materials/WorkbenchMaterialSection';

import { WorkbenchValueHeaderRow, type ValueColumnActions } from './WorkbenchValueHeaderRow';
import { WorkbenchValueTableRow, type ValueRowActions } from './WorkbenchValueTableRow';

import type { ValueCellView } from './WorkbenchValueTableCell';
import type { ValueTableGroup, ValueTableRow } from '../../../../utils/values/valueTable';

interface WorkbenchValueGroupTableProps {
  group: ValueTableGroup;
  viewsByRow: Readonly<Record<string, Readonly<Record<string, ValueCellView>>>>;
  editingCellId: string | undefined;
  editingNameRowId: string | undefined;
  editingColumnKey: string | undefined;
  addingRowId: string | undefined;
  actions: ValueRowActions;
  columnActions: ValueColumnActions;
  renderAdder: (row: ValueTableRow) => ReactNode;
}

export function WorkbenchValueGroupTable({
  group,
  viewsByRow,
  editingCellId,
  editingNameRowId,
  editingColumnKey,
  addingRowId,
  actions,
  columnActions,
  renderAdder,
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
            <WorkbenchValueHeaderRow
              groupKey={group.key}
              columns={group.columns}
              editingColumnKey={editingColumnKey}
              actions={columnActions}
            />
          </thead>
          <tbody>
            {group.rows.flatMap((row, index) => [
              <WorkbenchValueTableRow
                key={row.id}
                row={row}
                columns={group.columns}
                views={viewsByRow[row.id]}
                isZebra={index % 2 === 1}
                isNameCovering={isScrolled}
                editingCellId={
                  row.cells.some(cell => cell.id === editingCellId) ? editingCellId : undefined
                }
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
