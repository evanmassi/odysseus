import {
  Autocomplete,
  DatePicker,
  INPUT_WELL_BASE,
  INPUT_WELL_BORDER_DEFAULT,
  Input,
  Select,
} from '@shared/ui';

import { RATIO_NOTATION } from '../../../../utils/formulas/quantities';
import { UNIT_PER_ITEM, fieldUnit } from '../../../../utils/materials/materialCatalog';

import { choiceOptions, unitOptions } from './materialSelectOptions';

import type { FieldDefinition, MaterialItem } from '@odysseus/shared-schemas';

interface WorkbenchMaterialCellFieldProps {
  item: MaterialItem;
  definition: FieldDefinition;
  isExpired: boolean;
  suggestions: (typed: string) => string[];
  onValueChange: (value: string) => void;
  onUnitChange: (unit: string) => void;
}

const TEXT_FIELD = `h-7 w-full min-w-32 px-2 text-body-sm ${INPUT_WELL_BASE} ${INPUT_WELL_BORDER_DEFAULT}`;
const SHORT_UNITS: Readonly<Record<string, string>> = { X: '×', [RATIO_NOTATION]: '' };

const shortUnit = (unit: string) => SHORT_UNITS[unit] ?? unit;

export function WorkbenchMaterialCellField({
  item,
  definition,
  isExpired,
  suggestions,
  onValueChange,
  onUnitChange,
}: WorkbenchMaterialCellFieldProps) {
  const value = item.values[definition.key] ?? '';
  const label = definition.label;

  if (definition.kind === 'choice') {
    return (
      <Select
        size="xs"
        options={choiceOptions(definition.options)}
        value={value}
        aria-label={label}
        className="min-w-32"
        onChange={choice => onValueChange(String(choice ?? ''))}
      />
    );
  }

  if (definition.kind === 'date') {
    return (
      <DatePicker
        size="xs"
        value={value}
        state={isExpired ? 'error' : 'default'}
        clearable
        aria-label={label}
        onChange={onValueChange}
      />
    );
  }

  if (definition.kind === 'number') {
    const unit = fieldUnit(item, definition);
    return (
      <span className="flex items-center gap-1">
        {unit === RATIO_NOTATION && <span className="font-mono text-data-sm">1:</span>}
        <span className="w-[4.5rem] flex-none">
          <Input
            size="xs"
            fullWidth
            value={value}
            aria-label={label}
            spellCheck={false}
            inputClassName="text-right font-mono"
            onValueChange={onValueChange}
          />
        </span>
        {definition.unit === UNIT_PER_ITEM ? (
          <Select
            size="xs"
            options={unitOptions(definition.units ?? [])}
            value={unit}
            aria-label={`${label} unit`}
            onChange={choice => onUnitChange(String(choice ?? ''))}
          />
        ) : (
          <span className="text-body-sm text-muted-foreground">{shortUnit(unit)}</span>
        )}
      </span>
    );
  }

  return (
    <Autocomplete
      value={value}
      options={suggestions(value).map(suggestion => ({ value: suggestion, label: suggestion }))}
      aria-label={label}
      inputClassName={TEXT_FIELD}
      onChange={onValueChange}
    />
  );
}
