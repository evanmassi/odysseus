import { useState } from 'react';

import { Input, Select } from '@shared/ui';

import { readNumber } from '../../../../utils/formulas/quantities';
import { CONCENTRATION_UNITS, MOLAR_MASS_UNITS } from '../../../../utils/materials/materialCatalog';
import { unitChoices } from '../../../../utils/values/valueUnits';

import type { StockReading } from '../../../../utils/dilutions/dilutionStock';

interface WorkbenchDilutionStockFieldProps {
  ask: Extract<StockReading, { kind: 'ask' }>;
  onSave: (value: string, unit: string) => void;
}

export function WorkbenchDilutionStockField({ ask, onSave }: WorkbenchDilutionStockFieldProps) {
  const units = ask.need === 'weight' ? MOLAR_MASS_UNITS : CONCENTRATION_UNITS;
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState(units.includes(ask.unit) ? ask.unit : units[0]);
  const save = () => {
    const number = readNumber(value);
    if (number !== undefined && number > 0) onSave(String(number), unit);
  };

  return (
    <div className="my-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 border border-dashed border-warning-text/60 px-2.5 py-2 text-body-sm text-warning-text">
      <span>{ask.issue}</span>
      <span className="flex items-center gap-1.5 text-foreground">
        {ask.need === 'weight' ? 'Molecular weight' : 'Stock'}
        <span className="w-20">
          <Input
            size="xs"
            fullWidth
            value={value}
            placeholder={ask.need === 'weight' ? '150' : '10'}
            aria-label={ask.need === 'weight' ? 'Molecular weight' : 'Stock concentration'}
            inputClassName="text-right font-mono"
            onValueChange={setValue}
            onBlur={save}
            onKeyDown={event => {
              if (event.key === 'Enter') save();
            }}
          />
        </span>
        <Select
          size="xs"
          options={unitChoices(units)}
          value={unit}
          aria-label="Unit"
          onChange={next => setUnit(String(next ?? units[0]))}
          className="w-24"
        />
      </span>
      <span className="text-caption text-muted-foreground">saved to Materials</span>
    </div>
  );
}
