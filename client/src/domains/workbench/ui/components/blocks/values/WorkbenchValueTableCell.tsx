import { X } from 'lucide-react';

import { Tooltip } from '@shared/ui';

import { useFocusLeave } from '../../../../hooks/useFocusLeave';
import { displayValue, isUnreadableAmount } from '../../../../utils/formulas/quantities';
import { wellTooltipContent } from '../vessels/wellTooltipContent';

import { VALUE_CELL } from './valueTableStyles';
import { WorkbenchValueAmountField } from './WorkbenchValueAmountField';

export interface ValueCellView {
  value: string;
  unit: string;
  units: readonly string[] | undefined;
  hoverLines: readonly string[];
  isEditable: boolean;
  canRemove: boolean;
  isDuplicate: boolean;
  isUsed: boolean;
  isWorked: boolean;
}

interface WorkbenchValueTableCellProps {
  view: ValueCellView;
  isEditing: boolean;
  onEdit: (isEditing: boolean) => void;
  onMoveEdit: (step: 1 | -1) => void;
  onValueChange: (value: string) => void;
  onUnitChange: (unit: string) => void;
  onRemove: () => void;
}

export function WorkbenchValueTableCell({
  view,
  isEditing,
  onEdit,
  onMoveEdit,
  onValueChange,
  onUnitChange,
  onRemove,
}: WorkbenchValueTableCellProps) {
  const leave = useFocusLeave(() => onEdit(false));
  const isInvalid = view.isEditable && isUnreadableAmount(view.value, view.unit);
  const tone =
    view.isDuplicate || isInvalid
      ? ' text-danger-text'
      : view.isWorked
        ? ' text-primary'
        : view.isUsed
          ? ' text-foreground'
          : ' text-foreground/60';

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === 'Escape') {
      event.preventDefault();
      onEdit(false);
    } else if (event.key === 'Tab' && (event.target as HTMLElement).tagName === 'INPUT') {
      event.preventDefault();
      onMoveEdit(event.shiftKey ? -1 : 1);
    }
  };

  return (
    <td
      className={`${VALUE_CELL}${tone}`}
      onKeyDown={handleKeyDown}
      onBlur={isEditing ? leave.onBlur : undefined}
      onFocus={leave.onFocus}
    >
      {isEditing ? (
        <span className="flex items-center justify-end gap-1">
          <WorkbenchValueAmountField
            value={view.value}
            unit={view.unit}
            placeholder="0"
            isFocusedOnMount
            units={view.units}
            isInvalid={isInvalid}
            onValueChange={onValueChange}
            onUnitChange={onUnitChange}
          />
          {view.canRemove && (
            <Tooltip content="Remove">
              <button
                type="button"
                aria-label="Remove this value"
                className="text-muted-foreground hover:text-danger-text"
                onMouseDown={event => event.preventDefault()}
                onClick={onRemove}
              >
                <X aria-hidden className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}
        </span>
      ) : (
        <Tooltip content={wellTooltipContent(view.hoverLines)}>
          <button
            type="button"
            disabled={!view.isEditable}
            data-align="end"
            className="inline-edit font-mono text-data-sm"
            onClick={() => onEdit(true)}
          >
            {view.value.trim() ? (
              displayValue(view.value, view.unit)
            ) : view.isEditable ? (
              <span className="font-sans text-label-xs text-muted-foreground">to fill in</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </button>
        </Tooltip>
      )}
    </td>
  );
}
