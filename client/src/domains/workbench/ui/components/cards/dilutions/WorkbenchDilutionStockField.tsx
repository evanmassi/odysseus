import { useState } from 'react';

import { Button, Input, Select } from '@shared/ui';
import { CONCENTRATION_UNIT_IDS } from '@shared/utils/unitOptions';

import { readNumber } from '../../../../utils/formulas/quantities';
import { MOLAR_MASS_UNITS } from '../../../../utils/materials/materialCatalog';
import { MOLECULAR_WEIGHT, STOCK_CONCENTRATION } from '../../../../utils/terms/termList';
import { unitChoices } from '../../../../utils/values/valueUnits';

import type { StockReading } from '../../../../utils/dilutions/dilutionStock';

interface WorkbenchDilutionStockFieldProps {
  ask: Extract<StockReading, { kind: 'ask' }>;
  onSave: (value: string, unit: string) => void;
}

export function WorkbenchDilutionStockField({ ask, onSave }: WorkbenchDilutionStockFieldProps) {
  const units = ask.need === 'weight' ? MOLAR_MASS_UNITS : CONCENTRATION_UNIT_IDS;
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState(units.includes(ask.unit) ? ask.unit : units[0]);
  const number = readNumber(value);
  const isReady = number !== undefined && number > 0;
  const save = (withUnit: string) => {
    if (isReady) onSave(String(number), withUnit);
  };

  return (
    <div className="my-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 border border-dashed border-warning-text/60 px-2.5 py-2 text-body-sm text-warning-text">
      <span>{ask.issue}</span>
      <span className="flex items-center gap-1.5 text-foreground">
        {ask.need === 'weight' ? MOLECULAR_WEIGHT.word : 'Stock'}
        <span className="w-20">
          <Input
            size="xs"
            fullWidth
            value={value}
            placeholder={ask.need === 'weight' ? '150' : '10'}
            aria-label={ask.need === 'weight' ? MOLECULAR_WEIGHT.word : STOCK_CONCENTRATION.word}
            inputClassName="text-right font-mono"
            onValueChange={setValue}
            onKeyDown={event => {
              if (event.key === 'Enter') save(unit);
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
      <Button variant="ghost-primary" size="xs" disabled={!isReady} onClick={() => save(unit)}>
        Save to Materials
      </Button>
    </div>
  );
}
