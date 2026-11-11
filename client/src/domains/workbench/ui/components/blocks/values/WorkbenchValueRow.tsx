import { memo } from 'react';

import { Button, Tooltip } from '@shared/ui';
import { ROW_HOVER_GLOW } from '@shared/ui/primitives/table/rowGlow';

import { useFocusLeave } from '../../../../hooks/useFocusLeave';
import { focusOnMount } from '../../../../utils/dom/focusOnMount';
import { usageTitle } from '../../../../utils/formulas/nameUsage';
import { displayValue, isUnreadableAmount } from '../../../../utils/formulas/quantities';
import { withGreekLetters } from '../../../../utils/materials/greekLetters';

import { WorkbenchValueAmountField } from './WorkbenchValueAmountField';

export type ValueCell = 'name' | 'value';

export interface ValueRowData {
  id: string;
  label: string;
  fullName: string;
  value: string;
  unit: string;
  isDuplicate: boolean;
  usage: string;
}

export interface GeneralValueActions {
  onEdit: (itemId: string, cell: ValueCell | undefined) => void;
  onMoveEdit: (itemId: string, cell: ValueCell, step: 1 | -1) => void;
  onRename: (itemId: string, name: string) => void;
  onValueChange: (itemId: string, value: string) => void;
  onUnitChange: (itemId: string, unit: string) => void;
  onRemove: (itemId: string) => void;
}

interface WorkbenchValueRowProps {
  row: ValueRowData;
  editingCell: ValueCell | undefined;
  actions: GeneralValueActions;
}

const CELL = 'px-2 py-1.5 align-middle';

export const WorkbenchValueRow = memo(function WorkbenchValueRow({
  row,
  editingCell,
  actions,
}: WorkbenchValueRowProps) {
  const isInvalid = isUnreadableAmount(row.value, row.unit);
  const title = usageTitle(row.fullName, row.usage);

  const handleKeyDown = (cell: ValueCell) => (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === 'Escape') {
      event.preventDefault();
      actions.onEdit(row.id, undefined);
    } else if (event.key === 'Tab' && (event.target as HTMLElement).tagName === 'INPUT') {
      const inputs = [...(event.currentTarget as HTMLElement).querySelectorAll('input')];
      const at = inputs.indexOf(event.target as HTMLInputElement);
      const isEdge = event.shiftKey ? at <= 0 : at >= inputs.length - 1;
      if (!isEdge) return;
      event.preventDefault();
      actions.onMoveEdit(row.id, cell, event.shiftKey ? -1 : 1);
    }
  };

  const leave = useFocusLeave(() => actions.onEdit(row.id, undefined));

  return (
    <Tooltip content={title}>
      <tr
        className={`group ${ROW_HOVER_GLOW.primary} even:bg-[hsl(var(--foreground)/var(--alpha-zebra))] ${row.isDuplicate || isInvalid ? 'text-danger-text' : ''}`}
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
              className="inline-edit-field text-body-sm text-foreground"
              onChange={event => actions.onRename(row.id, event.target.value)}
              onBlur={event => {
                const converted = withGreekLetters(event.target.value);
                if (converted !== event.target.value) actions.onRename(row.id, converted);
              }}
            />
          ) : (
            <button
              type="button"
              className="inline-edit text-left text-body-sm text-foreground"
              onClick={() => actions.onEdit(row.id, 'name')}
            >
              {row.label || <span className="text-muted-foreground">Unnamed</span>}
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
              isInvalid={isInvalid}
              onValueChange={value => actions.onValueChange(row.id, value)}
              onUnitChange={unit => actions.onUnitChange(row.id, unit)}
            />
          ) : (
            <button
              type="button"
              data-align="end"
              className="inline-edit font-mono text-data-sm"
              onClick={() => actions.onEdit(row.id, 'value')}
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
            onClick={() => actions.onRemove(row.id)}
          >
            Remove
          </Button>
        </td>
      </tr>
    </Tooltip>
  );
});
