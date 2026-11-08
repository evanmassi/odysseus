import { Input } from '@shared/ui';

import { WorkbenchDilutionStockField } from './WorkbenchDilutionStockField';
import { WorkbenchDilutionStripPreview } from './WorkbenchDilutionStripPreview';

import type { DilutionPrep, PrepSettings } from '../../../../utils/dilutions/dilutionPrep';

interface WorkbenchDilutionSeriesSectionProps {
  id: string;
  subject: string;
  prep: DilutionPrep;
  onSettingChange: (key: keyof PrepSettings, value: string) => void;
  onStockSave: (value: string, unit: string) => void;
}

const LABEL = 'font-mono text-label-2xs uppercase tracking-meta text-muted-foreground';
const SETTINGS: ReadonlyArray<[keyof PrepSettings, string, string]> = [
  ['wellVolume', 'Well volume', 'µL'],
  ['volumeAdded', 'Volume added', 'µL'],
  ['extraPercent', 'Extra (dead vol.)', '%'],
  ['roundTo', 'Round to', 'µL'],
];

export function WorkbenchDilutionSeriesSection({
  id,
  subject,
  prep,
  onSettingChange,
  onStockSave,
}: WorkbenchDilutionSeriesSectionProps) {
  const settingField = ([key, label, unit]: (typeof SETTINGS)[number]) => (
    <div key={key} className="flex flex-col gap-1">
      <span className={LABEL}>{label}</span>
      <span className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
        <span className="w-16">
          <Input
            size="xs"
            fullWidth
            value={prep.settings[key]}
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
    <section className="flex flex-col gap-2 border-b border-foreground/10 pb-4 pt-3 last:border-b-0">
      <div className="flex items-baseline gap-3">
        <span className="text-label-lg font-semibold text-foreground">
          {subject || 'Unnamed treatment'}
        </span>
        <span className="font-mono text-data-sm text-muted-foreground">{prep.summary}</span>
      </div>
      <div className="flex flex-wrap gap-x-7 gap-y-2">
        {SETTINGS.slice(0, 2).map(settingField)}
        <div className="flex flex-col gap-1">
          <span className={LABEL}>Factor</span>
          <b className="flex h-7 items-center font-mono text-data text-primary">
            {prep.kind === 'ready' ? prep.strength : '–'}
          </b>
        </div>
        {SETTINGS.slice(2).map(settingField)}
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
          <WorkbenchDilutionStripPreview prep={prep} markerId={`dilution-arrow-${id}`} />
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-body-sm text-foreground">
            {prep.notes.map(([label, value]) => (
              <span key={label}>
                <span className={`${LABEL} mr-1`}>{label}</span> {value}
              </span>
            ))}
          </div>
          {prep.warnings.map(warning => (
            <p key={warning} className="text-body-sm text-warning-text">
              {warning}
            </p>
          ))}
        </>
      )}
    </section>
  );
}
