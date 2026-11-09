import { Button, Tooltip } from '@shared/ui';

import { useFocusLeave } from '../../../../hooks/useFocusLeave';
import { focusOnMount } from '../../../../utils/dom/focusOnMount';
import { usageTitle } from '../../../../utils/formulas/nameUsage';
import { displayValue, isUnreadableAmount } from '../../../../utils/formulas/quantities';

import { EDITABLE_HOVER } from './valueTableStyles';
import { WorkbenchValueAmountField } from './WorkbenchValueAmountField';

export type ValueCell = 'name' | 'value';

export interface ValueRowData {
  id: string;
  label: string;
  fullName: string;
  value: string;
  unit: string;
  units: readonly string[] | undefined;
  tag: string | undefined;
  isValueEditable: boolean;
  canRemove: boolean;
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
  const isInvalid = isUnreadableAmount(row.value, row.unit);
  const title = usageTitle(row.fullName, row.usage);

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

  const leave = useFocusLeave(() => onEdit(undefined));

  return (
    <Tooltip content={title}>
      <tr
        className={`group even:bg-foreground/[0.025] ${row.isDuplicate || isInvalid ? 'text-danger-text' : ''}`}
      >
        <td
          className={CELL}
          onKeyDown={handleKeyDown('name')}
          onBlur={leave.onBlur}
          onFocus={leave.onFocus}
        >
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
              className={`w-full text-left text-body-sm text-foreground ${EDITABLE_HOVER}`}
              onClick={() => onEdit('name')}
            >
              {row.label || <span className="text-muted-foreground">Unnamed</span>}
              {row.tag && (
                <span className="ml-2 text-label-xs text-muted-foreground">{row.tag}</span>
              )}
              {!row.usage && (
                <span className="ml-2 text-label-xs text-muted-foreground/70">unused</span>
              )}
            </button>
          )}
        </td>
        <td
          className={`${CELL} text-right`}
          onKeyDown={handleKeyDown('value')}
          onBlur={leave.onBlur}
          onFocus={leave.onFocus}
        >
          {editingCell === 'value' ? (
            <WorkbenchValueAmountField
              value={row.value}
              unit={row.unit}
              placeholder="0"
              isFocusedOnMount
              units={row.units}
              isInvalid={isInvalid}
              onValueChange={onValueChange}
              onUnitChange={onUnitChange}
            />
          ) : (
            <button
              type="button"
              disabled={!row.isValueEditable}
              className={`w-full text-right font-mono text-data-sm disabled:cursor-default ${EDITABLE_HOVER}`}
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
          {row.canRemove && (
            <Button
              variant="ghost-danger"
              size="xs"
              className="opacity-0 group-hover:opacity-100"
              onClick={onRemove}
            >
              Remove
            </Button>
          )}
        </td>
      </tr>
    </Tooltip>
  );
}
