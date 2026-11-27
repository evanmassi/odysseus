import { useState } from 'react';

import { RotateCcw } from 'lucide-react';

import { Tooltip } from '@shared/ui';

import { isUnreadableAmount } from '../../../../utils/formulas/quantities';
import { DILUTION_FACTOR, POINTS, REPLICATES } from '../../../../utils/terms/termList';
import { CARD_ICONS } from '../../board/cardIcons';
import { WorkbenchValueAmountField } from '../values/WorkbenchValueAmountField';

import {
  WorkbenchDilutionSetting,
  WorkbenchDilutionSettingInput,
} from './WorkbenchDilutionSetting';

import type {
  CountField,
  SeriesCountView,
  SeriesField,
  SeriesRowView,
} from '../../../../utils/dilutions/seriesNumbers';

interface WorkbenchDilutionSeriesRowProps {
  view: SeriesRowView;
  places: readonly string[];
  onChange: (field: SeriesField, value: string) => void;
  onTopUnitChange: (unit: string) => void;
}

interface CountSettingProps {
  label: string;
  unit?: string;
  count: SeriesCountView;
  places: readonly string[];
  onChange: (value: string) => void;
}

const PlateCountIcon = CARD_ICONS.plateMap;

function CountSetting({ label, unit, count, places, onChange }: CountSettingProps) {
  const [isTypingOver, setIsTypingOver] = useState(false);
  const { counted, isTyped } = count;
  const where = places.join(', ') || 'the plate';

  if (counted !== undefined && !isTyped && !isTypingOver) {
    return (
      <WorkbenchDilutionSetting label={label} unit={unit}>
        <Tooltip content={`Counted from ${where} · click to type over it`}>
          <button
            type="button"
            className="inline-edit flex h-7 items-center gap-1.5 font-mono text-data text-info-text"
            onClick={() => setIsTypingOver(true)}
          >
            <PlateCountIcon aria-hidden className="h-3.5 w-3.5" />
            {counted}
          </button>
        </Tooltip>
      </WorkbenchDilutionSetting>
    );
  }

  return (
    <WorkbenchDilutionSetting label={label} unit={unit}>
      <WorkbenchDilutionSettingInput
        label={label}
        value={isTyped || !isTypingOver ? count.value : String(counted ?? '')}
        placeholder={counted === undefined ? 'needed' : String(counted)}
        onChange={onChange}
      />
      {counted !== undefined && (
        <Tooltip content={`Typed in · ${where} counts ${counted} · use that`}>
          <button
            type="button"
            aria-label={`Use the ${label.toLowerCase()} counted from ${where}`}
            className="text-info-text hover:text-foreground"
            onClick={() => {
              setIsTypingOver(false);
              onChange('');
            }}
          >
            <RotateCcw aria-hidden className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      )}
    </WorkbenchDilutionSetting>
  );
}

export function WorkbenchDilutionSeriesRow({
  view,
  places,
  onChange,
  onTopUnitChange,
}: WorkbenchDilutionSeriesRowProps) {
  const countSetting = (field: CountField, label: string, unit?: string) => (
    <CountSetting
      label={label}
      unit={unit}
      count={view.counts[field]}
      places={places}
      onChange={value => onChange(field, value)}
    />
  );
  return (
    <div className="flex flex-wrap gap-x-7 gap-y-2">
      <WorkbenchDilutionSetting label={view.topWord}>
        <WorkbenchValueAmountField
          value={view.top}
          unit={view.unit}
          placeholder="0"
          isFocusedOnMount={false}
          isInvalid={isUnreadableAmount(view.top, view.unit)}
          onValueChange={value => onChange('top', value)}
          onUnitChange={onTopUnitChange}
        />
      </WorkbenchDilutionSetting>
      <WorkbenchDilutionSetting label={DILUTION_FACTOR.word}>
        1:
        <WorkbenchDilutionSettingInput
          label={DILUTION_FACTOR.word}
          value={view.dilutionFactor}
          onChange={value => onChange('dilutionFactor', value)}
        />
      </WorkbenchDilutionSetting>
      {countSetting('points', POINTS.word)}
      {countSetting('replicates', REPLICATES.word, 'per point')}
    </div>
  );
}
