import { Button } from '@shared/ui';

import { focusOnMount } from '../../../../utils/dom/focusOnMount';
import { displayValue, PAIR_NOTATION, quantityOf } from '../../../../utils/formulas/quantities';

import { WorkbenchValueAmountField } from './WorkbenchValueAmountField';

export type ValueCell = 'name' | 'value';

export interface ValueRowData {
  id: string;
  label: string;
  fullName: string;
  value: string;
  unit: string;
  units: readonly string[] | undefined;
  isLinked: boolean;
  isDuplicate: boolean;
  usage: string;
}

interface WorkbenchValueRowProps {
  row: ValueRowData;
  editingCell: ValueCell | undefined;
  onEdit: (cell: ValueCell | undefined) => void;
  onMoveEdit: (cell: ValueCell, step: 1 | -1) => void;
  onRename: (name: string) => void;
  onValueChange: (value: string) => void;
  onUnitChange: (unit: string) => void;
  onRemove: () => void;
}

const CELL = 'px-2 py-1.5 align-middle';

const isUnreadable = (value: string, unit: string) =>
  !!value.trim() && quantityOf(value, unit === PAIR_NOTATION ? unit : '') === undefined;

export function WorkbenchValueRow({
  row,
  editingCell,
  onEdit,
  onMoveEdit,
  onRename,
  onValueChange,
  onUnitChange,
  onRemove,
}: WorkbenchValueRowProps) {
  const isInvalid = isUnreadable(row.value, row.unit);
  const title = row.usage
    ? `${row.fullName}: used in ${row.usage}`
    : `${row.fullName}: not used in any step or formula`;

  const handleKeyDown = (cell: ValueCell) => (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === 'Escape') {
      event.preventDefault();
      onEdit(undefined);
    } else if (event.key === 'Tab' && (event.target as HTMLElement).tagName === 'INPUT') {
      const inputs = [...(event.currentTarget as HTMLElement).querySelectorAll('input')];
      const at = inputs.indexOf(event.target as HTMLInputElement);
      const isEdge = event.shiftKey ? at <= 0 : at >= inputs.length - 1;
      if (!isEdge) return;
      event.preventDefault();
      onMoveEdit(cell, event.shiftKey ? -1 : 1);
    }
  };

  const handleBlur = (event: React.FocusEvent) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onEdit(undefined);
  };

  return (
    <tr
      title={title}
      className={`group even:bg-foreground/[0.025] ${row.isDuplicate || isInvalid ? 'text-danger-text' : ''}`}
    >
      <td className={CELL} onKeyDown={handleKeyDown('name')} onBlur={handleBlur}>
        {editingCell === 'name' ? (
          <input
            ref={focusOnMount}
            defaultValue={row.label}
            placeholder="Name"
            aria-label="Value name"
            spellCheck={false}
            className="w-full border-b border-line-soft bg-transparent text-body-sm text-foreground outline-none focus:border-primary"
            onChange={event => onRename(event.target.value)}
          />
        ) : (
          <button
            type="button"
            className="w-full text-left text-body-sm text-foreground"
            onClick={() => onEdit('name')}
          >
            {row.label || <span className="text-muted-foreground">Unnamed</span>}
            {row.isLinked && (
              <span className="ml-2 text-label-xs text-muted-foreground">in Materials</span>
            )}
            {!row.usage && (
              <span className="ml-2 text-label-xs text-muted-foreground/70">unused</span>
            )}
          </button>
        )}
      </td>
      <td className={`${CELL} text-right`} onKeyDown={handleKeyDown('value')} onBlur={handleBlur}>
        {editingCell === 'value' ? (
          <WorkbenchValueAmountField
            value={row.value}
            unit={row.unit}
            units={row.units}
            isInvalid={isInvalid}
            onValueChange={onValueChange}
            onUnitChange={onUnitChange}
          />
        ) : (
          <button
            type="button"
            className="w-full text-right font-mono text-data-sm"
            onClick={() => onEdit('value')}
          >
            {row.value.trim() ? (
              displayValue(row.value, row.unit)
            ) : (
              <span className="font-sans text-label-xs text-muted-foreground">to fill in</span>
            )}
          </button>
        )}
      </td>
      <td className="w-px px-1 text-right">
        <Button
          variant="ghost-danger"
          size="xs"
          className="opacity-0 group-hover:opacity-100"
          onClick={onRemove}
        >
          Remove
        </Button>
      </td>
    </tr>
  );
}
