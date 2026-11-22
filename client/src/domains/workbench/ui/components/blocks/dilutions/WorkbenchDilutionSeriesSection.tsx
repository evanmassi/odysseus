import { Input, type AutocompleteOption } from '@shared/ui';

import { EXTRA, TOTAL_WELL_VOLUME, WORKING_STRENGTH } from '../../../../utils/terms/termList';
import { META_LABEL } from '../../board/metaLabelClass';

import { WorkbenchDilutionDiluentField } from './WorkbenchDilutionDiluentField';
import { WorkbenchDilutionStockField } from './WorkbenchDilutionStockField';
import { WorkbenchDilutionStripPreview } from './WorkbenchDilutionStripPreview';

import type { PrepSettings } from '../../../../utils/dilutions/dilutionFormulas';
import type { DilutionPrep } from '../../../../utils/dilutions/dilutionPrep';

interface WorkbenchDilutionSeriesSectionProps {
  id: string;
  subject: string;
  places: readonly string[];
  color: string | undefined;
  prep: DilutionPrep;
  diluent: string;
  diluentPlaceholder: string;
  diluentChoices: readonly AutocompleteOption[];
  onSettingChange: (key: keyof PrepSettings, value: string) => void;
  onDiluentChange: (diluent: string) => void;
  onDiluentDone: () => void;
  onStockSave: (value: string, unit: string) => void;
}

const SETTINGS: ReadonlyArray<[keyof PrepSettings, string, string]> = [
  ['wellVolume', TOTAL_WELL_VOLUME.word, 'µL'],
  ['volumeAdded', 'Volume added', 'µL'],
  ['extraPercent', EXTRA.word, '%'],
  ['roundTo', 'Round to', 'µL'],
];
const PLAIN_RAIL = 'hsl(var(--muted-foreground))';

export function WorkbenchDilutionSeriesSection({
  id,
  subject,
  places,
  color,
  prep,
  diluent,
  diluentPlaceholder,
  diluentChoices,
  onSettingChange,
  onDiluentChange,
  onDiluentDone,
  onStockSave,
}: WorkbenchDilutionSeriesSectionProps) {
  const rail = color ?? PLAIN_RAIL;

  const settingField = ([key, label, unit]: (typeof SETTINGS)[number]) => (
    <div key={key} className="flex flex-col gap-1">
      <span className={META_LABEL}>{label}</span>
      <span className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
        <span className="w-16">
          <Input
            size="xs"
            fullWidth
            value={prep.settings[key]}
            placeholder={key === 'wellVolume' ? prep.inheritedWellVolume : undefined}
            aria-label={label}
            inputClassName="text-right font-mono"
            onValueChange={value => onSettingChange(key, value)}
          />
        </span>
        {unit}
      </span>
    </div>
  );

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
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 flex-none self-center"
          style={{ backgroundColor: rail }}
        />
        <span className="text-label-lg font-semibold text-foreground">
          {subject || 'Unnamed treatment'}
        </span>
        <span className="font-mono text-data-sm text-muted-foreground">{prep.summary}</span>
        {places.length > 0 && (
          <span className="text-body-sm text-muted-foreground">for {places.join(', ')}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-x-7 gap-y-2">
        {SETTINGS.slice(0, 2).map(settingField)}
        <div className="flex flex-col gap-1">
          <span className={META_LABEL}>{WORKING_STRENGTH.word}</span>
          <b className="flex h-7 items-center font-mono text-data text-primary">
            {prep.kind === 'ready' ? prep.strength : '–'}
          </b>
        </div>
        {SETTINGS.slice(2).map(settingField)}
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
          <WorkbenchDilutionStripPreview
            prep={prep}
            markerId={`dilution-arrow-${id}`}
            color={color}
          />
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
