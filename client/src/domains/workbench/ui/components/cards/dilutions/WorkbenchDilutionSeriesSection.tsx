import { Button, Tooltip, type AutocompleteOption } from '@shared/ui';

import { SHARED_PREP_VALUES } from '../../../../utils/dilutions/dilutionCalculations';
import { ROUND_TO, WORKING_STRENGTH } from '../../../../utils/terms/termList';
import { META_LABEL } from '../../board/metaLabelClass';
import { WorkbenchIndicatorSwatch } from '../plateMap/WorkbenchIndicatorSwatch';

import { WorkbenchDilutionDiluentField } from './WorkbenchDilutionDiluentField';
import { WorkbenchDilutionSeriesRow } from './WorkbenchDilutionSeriesRow';
import {
  WorkbenchDilutionSetting,
  WorkbenchDilutionSettingInput,
  WorkbenchDilutionSettingLabel,
} from './WorkbenchDilutionSetting';
import { WorkbenchDilutionStockField } from './WorkbenchDilutionStockField';
import { WorkbenchDilutionStripPreview } from './WorkbenchDilutionStripPreview';

import type { SharedPrepKey } from '../../../../utils/dilutions/dilutionCalculations';
import type { DilutionPrep, SharedPrepField } from '../../../../utils/dilutions/dilutionPrep';
import type { SeriesField, SeriesRowView } from '../../../../utils/dilutions/seriesNumbers';
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
  seriesRow: SeriesRowView;
  plateNames: readonly string[];
  isPainted: boolean;
  onSeriesChange: (field: SeriesField, value: string) => void;
  onTopUnitChange: (unit: string) => void;
  onRemove: () => void;
  onPutOnPlate: (() => void) | undefined;
}

const NO_EXTRA = 'none';

export const PLAIN_RAIL = 'hsl(var(--muted-foreground))';

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
  seriesRow,
  plateNames,
  isPainted,
  onSeriesChange,
  onTopUnitChange,
  onRemove,
  onPutOnPlate,
}: WorkbenchDilutionSeriesSectionProps) {
  const rail = color ?? PLAIN_RAIL;

  const sharedField = (key: SharedPrepKey) => {
    const field = prep.shared[key];
    const label = SHARED_PREP_VALUES[key].term.word;
    const control =
      field.edit.kind === 'readOnly' ? (
        <Tooltip content={field.edit.hint}>
          <span className="font-mono text-data text-foreground">{field.value}</span>
        </Tooltip>
      ) : (
        <WorkbenchDilutionSettingInput
          label={label}
          value={field.value}
          placeholder={key === 'extra' ? NO_EXTRA : undefined}
          onChange={value => onSharedChange(field, value)}
        />
      );
    return (
      <WorkbenchDilutionSetting key={key} label={label} unit={field.unit}>
        {field.isAssaySetup ? (
          <Tooltip content={`Shared by every dilution, kept in ${assaySetupTitle} in Values`}>
            <span className="inline-flex">{control}</span>
          </Tooltip>
        ) : (
          control
        )}
      </WorkbenchDilutionSetting>
    );
  };

  return (
    <section
      className="group/series flex flex-col gap-2 border-l-[3px] pb-1 pl-3"
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
        {!isPainted && <span className="text-body-sm text-muted-foreground">not on a plate</span>}
        {!isPainted && onPutOnPlate && (
          <Tooltip content="Then select wells, open Dilution and use this one">
            <Button
              variant="ghost-primary"
              size="xs"
              className="self-center"
              onClick={onPutOnPlate}
            >
              Put on a plate…
            </Button>
          </Tooltip>
        )}
        <Button
          variant="ghost-danger"
          size="xs"
          className="ml-auto self-center opacity-0 focus-visible:opacity-100 group-hover/series:opacity-100"
          onClick={onRemove}
        >
          Remove
        </Button>
      </div>
      <WorkbenchDilutionSeriesRow
        view={seriesRow}
        places={plateNames}
        onChange={onSeriesChange}
        onTopUnitChange={onTopUnitChange}
      />
      <div className="flex flex-wrap gap-x-7 gap-y-2">
        {sharedField('totalWellVolume')}
        {sharedField('volumePerWell')}
        <div className="flex flex-col gap-1">
          <WorkbenchDilutionSettingLabel label={WORKING_STRENGTH.word} />
          <b className="flex h-7 items-center font-mono text-data text-primary">
            {prep.kind === 'ready' ? prep.strength : '—'}
          </b>
        </div>
        {sharedField('extra')}
        <WorkbenchDilutionSetting label={ROUND_TO.word} unit="µL">
          <WorkbenchDilutionSettingInput
            label={ROUND_TO.word}
            value={prep.settings.roundTo}
            onChange={onRoundToChange}
          />
        </WorkbenchDilutionSetting>
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
