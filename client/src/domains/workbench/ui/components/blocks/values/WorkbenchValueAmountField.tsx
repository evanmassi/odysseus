import { Select } from '@shared/ui';

import { focusOnMount } from '../../../../utils/dom/focusOnMount';
import { PAIR_NOTATION, showsOneToPrefix } from '../../../../utils/formulas/quantities';
import { unitChoices, VALUE_UNIT_OPTIONS } from '../../../../utils/values/valueUnits';

const AMOUNT_INPUT = 'text-right font-mono text-data-sm text-foreground';

interface WorkbenchValueAmountFieldProps {
  value: string;
  unit: string;
  units: readonly string[] | undefined;
  isInvalid: boolean;
  placeholder: string;
  isFocusedOnMount: boolean;
  onValueChange: (value: string) => void;
  onUnitChange: (unit: string) => void;
}

export function WorkbenchValueAmountField({
  value,
  unit,
  units,
  isInvalid,
  placeholder,
  isFocusedOnMount,
  onValueChange,
  onUnitChange,
}: WorkbenchValueAmountFieldProps) {
  const invalidClass = isInvalid ? ' text-danger-text' : '';
  const [first, second = ''] = value.split(':');
  const unitOptions = units ? unitChoices(units) : [...VALUE_UNIT_OPTIONS];
  const focusRef = isFocusedOnMount ? focusOnMount : undefined;
  const hasOneToPrefix = showsOneToPrefix(unit);

  return (
    <span className="inline-edit inline-flex items-center">
      {unit === PAIR_NOTATION ? (
        <>
          <input
            ref={focusRef}
            value={first}
            placeholder="10"
            aria-label="Ratio, first part"
            className={AMOUNT_INPUT + invalidClass}
            onChange={event => onValueChange(`${event.target.value}:${second}`)}
          />
          <span className="mx-0.5 font-mono text-data-sm text-muted-foreground">:</span>
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
          {hasOneToPrefix && (
            <span className="mr-0.5 font-mono text-data-sm text-muted-foreground">1:</span>
          )}
          <input
            ref={focusRef}
            value={value}
            placeholder={placeholder}
            aria-label="Value"
            className={AMOUNT_INPUT + invalidClass}
            onFocus={event => event.currentTarget.select()}
            onChange={event => onValueChange(event.target.value)}
          />
        </>
      )}
      {unitOptions.length > 0 ? (
        <span className="-mr-[9px]">
          <Select
            size="inline"
            isQuiet
            options={unitOptions}
            value={unit}
            aria-label="Unit"
            onChange={next => onUnitChange(String(next ?? ''))}
          />
        </span>
      ) : (
        unit &&
        !hasOneToPrefix && (
          <span className="ml-2 font-mono text-data-sm text-muted-foreground">{unit}</span>
        )
      )}
    </span>
  );
}
