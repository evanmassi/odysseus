import type { ReactNode } from 'react';

import { Input, Tooltip, type AutocompleteOption } from '@shared/ui';

import { SHARED_PREP_VALUES } from '../../../../utils/dilutions/dilutionCalculations';
import { ROUND_TO, WORKING_STRENGTH } from '../../../../utils/terms/termList';
import { termMeaning } from '../../../../utils/terms/termLookup';
import { META_LABEL } from '../../board/metaLabelClass';
import { WorkbenchIndicatorSwatch } from '../plateMap/WorkbenchIndicatorSwatch';

import { WorkbenchDilutionDiluentField } from './WorkbenchDilutionDiluentField';
import { WorkbenchDilutionStockField } from './WorkbenchDilutionStockField';
import { WorkbenchDilutionStripPreview } from './WorkbenchDilutionStripPreview';

import type { SharedPrepKey } from '../../../../utils/dilutions/dilutionCalculations';
import type { DilutionPrep, SharedPrepField } from '../../../../utils/dilutions/dilutionPrep';
import type { PlateSwatch } from '../../../../utils/plateMap/plateSwatches';

interface WorkbenchDilutionSeriesSectionProps {
  id: string;
  subject: string;
  places: readonly string[];
  color: string | undefined;
  swatch: PlateSwatch;
  prep: DilutionPrep;
  assaySetupTitle: string;
  diluent: string;
  diluentPlaceholder: string;
  diluentChoices: readonly AutocompleteOption[];
  onSharedChange: (field: SharedPrepField, value: string) => void;
  onRoundToChange: (value: string) => void;
  onDiluentChange: (diluent: string) => void;
  onDiluentDone: () => void;
  onStockSave: (value: string, unit: string) => void;
}

const NO_EXTRA = 'none';

export const PLAIN_RAIL = 'hsl(var(--muted-foreground))';

function settingLabel(label: string) {
  const meaning = termMeaning(label);
  const text = <span className={META_LABEL}>{label}</span>;
  return meaning ? <Tooltip content={meaning}>{text}</Tooltip> : text;
}

export function WorkbenchDilutionSeriesSection({
  id,
  subject,
  places,
  color,
  swatch,
  prep,
  assaySetupTitle,
  diluent,
  diluentPlaceholder,
  diluentChoices,
  onSharedChange,
  onRoundToChange,
  onDiluentChange,
  onDiluentDone,
  onStockSave,
}: WorkbenchDilutionSeriesSectionProps) {
  const rail = color ?? PLAIN_RAIL;

  const settingBox = (label: string, control: ReactNode, unit: string, tag?: string) => (
    <div key={label} className="flex flex-col gap-1">
      <span className="flex items-baseline gap-1.5">
        {settingLabel(label)}
        {tag && <span className="text-label-xs text-muted-foreground">{tag}</span>}
      </span>
      <span className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
        {control}
        {unit}
      </span>
    </div>
  );

  const settingInput = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    placeholder?: string
  ) => (
    <span className="w-16">
      <Input
        size="xs"
        fullWidth
        value={value}
        placeholder={placeholder}
        aria-label={label}
        inputClassName="text-right font-mono"
        onValueChange={onChange}
      />
    </span>
  );

  const sharedField = (key: SharedPrepKey) => {
    const field = prep.shared[key];
    const label = SHARED_PREP_VALUES[key].term.word;
    const control =
      field.edit.kind === 'readOnly' ? (
        <Tooltip content={field.edit.hint}>
          <span className="font-mono text-data text-foreground">{field.value}</span>
        </Tooltip>
      ) : (
        settingInput(
          label,
          field.value,
          value => onSharedChange(field, value),
          key === 'extra' ? NO_EXTRA : undefined
        )
      );
    return settingBox(label, control, field.unit, field.isAssaySetup ? assaySetupTitle : undefined);
  };

  return (
    <section
      className="flex flex-col gap-2 border-l-[3px] pb-1 pl-3"
      style={{ borderLeftColor: rail }}
    >
      <div
        className="-ml-3 flex items-baseline gap-3 py-1 pl-3"
        style={{
          backgroundImage: `linear-gradient(90deg, color-mix(in srgb, ${rail} 15%, transparent), transparent 70%)`,
        }}
      >
        <span className="flex self-center">
          <WorkbenchIndicatorSwatch swatch={swatch} />
        </span>
        <span className="text-label-lg font-semibold text-foreground">
          {subject || 'Unnamed treatment'}
        </span>
        <span className="font-mono text-data-sm text-muted-foreground">{prep.summary}</span>
        {places.length > 0 && (
          <span className="text-body-sm text-muted-foreground">for {places.join(', ')}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-x-7 gap-y-2">
        {sharedField('totalWellVolume')}
        {sharedField('volumePerWell')}
        <div className="flex flex-col gap-1">
          {settingLabel(WORKING_STRENGTH.word)}
          <b className="flex h-7 items-center font-mono text-data text-primary">
            {prep.kind === 'ready' ? prep.strength : '—'}
          </b>
        </div>
        {sharedField('extra')}
        {settingBox(
          ROUND_TO.word,
          settingInput(ROUND_TO.word, prep.settings.roundTo, onRoundToChange),
          'µL'
        )}
        <WorkbenchDilutionDiluentField
          value={diluent}
          placeholder={diluentPlaceholder}
          choices={diluentChoices}
          onChange={onDiluentChange}
          onDone={onDiluentDone}
        />
      </div>
      {prep.kind === 'problem' ? (
        <p className="text-body-sm text-muted-foreground">{prep.problem}</p>
      ) : (
        <>
          {prep.stock.kind === 'ask' && (
            <WorkbenchDilutionStockField ask={prep.stock} onSave={onStockSave} />
          )}
          {prep.stock.kind === 'problem' && (
            <p className="text-body-sm text-warning-text">{prep.stock.issue}</p>
          )}
          <WorkbenchDilutionStripPreview prep={prep} svgId={`dilution-strip-${id}`} color={color} />
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-body-sm text-foreground">
            {prep.notes.map(([label, value]) => (
              <span key={label}>
                <span className={`${META_LABEL} mr-1`}>{label}</span> {value}
              </span>
            ))}
          </div>
          {prep.warnings.map(warning => (
            <p key={warning.text} className="text-body-sm text-warning-text">
              {warning.text}
            </p>
          ))}
        </>
      )}
    </section>
  );
}
