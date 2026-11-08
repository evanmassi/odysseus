import { Select } from '@shared/ui';

import { focusOnMount } from '../../../../utils/dom/focusOnMount';
import { PAIR_NOTATION, RATIO_NOTATION } from '../../../../utils/formulas/quantities';
import { unitChoices, VALUE_UNIT_OPTIONS } from '../../../../utils/values/valueUnits';

const AMOUNT_INPUT =
  'w-20 min-w-0 border-b border-line-soft bg-transparent px-1 py-0.5 text-right font-mono text-data-sm text-foreground outline-none focus:border-primary';

interface WorkbenchValueAmountFieldProps {
  value: string;
  unit: string;
  units: readonly string[] | undefined;
  isInvalid: boolean;
  onValueChange: (value: string) => void;
  onUnitChange: (unit: string) => void;
}

export function WorkbenchValueAmountField({
  value,
  unit,
  units,
  isInvalid,
  onValueChange,
  onUnitChange,
}: WorkbenchValueAmountFieldProps) {
  const invalidClass = isInvalid ? ' text-danger-text' : '';
  const [first, second = ''] = value.split(':');
  const unitOptions = units ? unitChoices(units) : [...VALUE_UNIT_OPTIONS];

  return (
    <span className="flex items-center justify-end gap-1">
      {unit === PAIR_NOTATION ? (
        <>
          <input
            ref={focusOnMount}
            value={first}
            placeholder="10"
            aria-label="Ratio, first part"
            className={AMOUNT_INPUT + invalidClass}
            onChange={event => onValueChange(`${event.target.value}:${second}`)}
          />
          <span className="font-mono text-data-sm text-muted-foreground">:</span>
          <input
            value={second}
            placeholder="1"
            aria-label="Ratio, second part"
            className={AMOUNT_INPUT + invalidClass}
            onChange={event => onValueChange(`${first}:${event.target.value}`)}
          />
        </>
      ) : (
        <>
          {unit === RATIO_NOTATION && (
            <span className="font-mono text-data-sm text-muted-foreground">1:</span>
          )}
          <input
            ref={focusOnMount}
            value={value}
            placeholder="0"
            aria-label="Value"
            className={AMOUNT_INPUT + invalidClass}
            onFocus={event => event.currentTarget.select()}
            onChange={event => onValueChange(event.target.value)}
          />
        </>
      )}
      {unitOptions.length > 0 ? (
        <Select
          size="xs"
          isQuiet
          options={unitOptions}
          value={unit}
          aria-label="Unit"
          onChange={next => onUnitChange(String(next ?? ''))}
          className="w-28"
        />
      ) : (
        unit && <span className="font-mono text-data-sm text-muted-foreground">{unit}</span>
      )}
    </span>
  );
}
