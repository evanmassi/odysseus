import {
  WorkbenchValueItem,
  type GeneralValueActions,
  type ValueItemField,
  type ValueMoveTarget,
  type ValueRowData,
} from './WorkbenchValueItem';

interface WorkbenchValueUnsortedListProps {
  rows: readonly ValueRowData[];
  editing: { itemId: string; cell: ValueItemField } | undefined;
  actions: GeneralValueActions;
  moveTargets: readonly ValueMoveTarget[];
}

export function WorkbenchValueUnsortedList({
  rows,
  editing,
  actions,
  moveTargets,
}: WorkbenchValueUnsortedListProps) {
  return (
    <table className="mt-2 w-full max-w-md border-collapse">
      <tbody>
        {rows.map(row => (
          <WorkbenchValueItem
            key={row.id}
            row={row}
            editingCell={editing?.itemId === row.id ? editing.cell : undefined}
            actions={actions}
            moveTargets={moveTargets}
          />
        ))}
      </tbody>
    </table>
  );
}
