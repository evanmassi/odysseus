import { useState } from 'react';

import { useFocusLeave } from '../../../../hooks/useFocusLeave';
import { isUnreadableAmount } from '../../../../utils/formulas/quantities';

import { VALUE_HEAD_CELL } from './valueTableStyles';
import { WorkbenchValueAmountField } from './WorkbenchValueAmountField';

interface WorkbenchValueColumnFillCellProps {
  count: number;
  unit: string;
  onFill: (value: string, unit: string) => void;
  onClose: () => void;
}

export function WorkbenchValueColumnFillCell({
  count,
  unit: startingUnit,
  onFill,
  onClose,
}: WorkbenchValueColumnFillCellProps) {
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState(startingUnit);
  const leave = useFocusLeave(onClose);
  const isInvalid = !!value.trim() && isUnreadableAmount(value, unit);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (value.trim() && !isInvalid) onFill(value.trim(), unit);
      else onClose();
    }
  };

  return (
    <th
      className={VALUE_HEAD_CELL}
      onKeyDown={handleKeyDown}
      onBlur={leave.onBlur}
      onFocus={leave.onFocus}
    >
      <span className="inline-flex items-center gap-2 normal-case tracking-normal">
        <span className="font-sans text-label-xs font-normal text-muted-foreground">
          Fill {count} empty
        </span>
        <WorkbenchValueAmountField
          value={value}
          unit={unit}
          placeholder="0"
          isFocusedOnMount
          isInvalid={isInvalid}
          onValueChange={setValue}
          onUnitChange={setUnit}
        />
      </span>
    </th>
  );
}
