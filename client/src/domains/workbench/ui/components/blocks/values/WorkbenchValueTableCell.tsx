import { X } from 'lucide-react';

import { Tooltip } from '@shared/ui';

import { useFocusLeave } from '../../../../hooks/useFocusLeave';
import { displayValue, isUnreadableAmount } from '../../../../utils/formulas/quantities';
import { withPerVessel } from '../../../../utils/terms/termLookup';
import { wellTooltipContent } from '../vessels/wellTooltipContent';

import { NEEDED_TEXT, VALUE_CELL } from './valueTableStyles';
import { WorkbenchValueAmountField } from './WorkbenchValueAmountField';

export interface ValueCellView {
  name: string;
  value: string;
  unit: string;
  units: readonly string[] | undefined;
  hoverLines: readonly string[];
  isEditable: boolean;
  canRemove: boolean;
  isDuplicate: boolean;
  isUsed: boolean;
  isWorked: boolean;
  isNeeded: boolean;
  workedValue: string;
  isClashing: boolean;
}

interface WorkbenchValueTableCellProps {
  view: ValueCellView;
  isEditing: boolean;
  fillCount: number;
  onEdit: (isEditing: boolean) => void;
  onFillOthers: () => void;
  onMoveEdit: (step: 1 | -1) => void;
  onValueChange: (value: string) => void;
  onUnitChange: (unit: string) => void;
  onRemove: () => void;
}

export function WorkbenchValueTableCell({
  view,
  isEditing,
  fillCount,
  onEdit,
  onFillOthers,
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
      : view.isClashing
        ? ' text-warning-text'
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
            placeholder={view.workedValue || '0'}
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
        <span className="inline-flex items-center justify-end gap-2">
          {fillCount > 0 && (
            <button
              type="button"
              className="whitespace-nowrap font-sans text-label-xs text-primary hover:underline"
              onClick={onFillOthers}
            >
              Same for {fillCount === 1 ? '1 other' : `${fillCount} others`}
            </button>
          )}
          <Tooltip content={wellTooltipContent(view.hoverLines)}>
            <button
              type="button"
              disabled={!view.isEditable}
              data-align="end"
              className="inline-edit font-mono text-data-sm"
              onClick={() => onEdit(true)}
            >
              {view.value.trim() ? (
                withPerVessel(displayValue(view.value, view.unit), view.name)
              ) : view.workedValue ? (
                <span className="italic text-muted-foreground">
                  {displayValue(view.workedValue, view.unit)}
                </span>
              ) : view.isNeeded ? (
                <span className={NEEDED_TEXT}>needed</span>
              ) : view.isEditable ? (
                <span className="font-sans text-label-xs text-muted-foreground">to fill in</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </button>
          </Tooltip>
        </span>
      )}
    </td>
  );
}
