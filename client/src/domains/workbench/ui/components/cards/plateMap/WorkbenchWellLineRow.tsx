import { useState } from 'react';
import type { Ref } from 'react';

import { type PlateLine, withGreekLetters } from '@odysseus/shared-schemas';
import { X } from 'lucide-react';

import { Input, Select, Tooltip } from '@shared/ui';

import { wellValueSuggestions } from '../../../../utils/plateMap/wellValueSuggestions';
import { WorkbenchValueAmountField } from '../values/WorkbenchValueAmountField';

import { WorkbenchColorSwatchList } from './WorkbenchColorSwatchList';
import { WorkbenchPlateNameField } from './WorkbenchPlateNameField';
import { WorkbenchPlateSuggestionList } from './WorkbenchPlateSuggestionList';

import type { RatioRow } from '../../../../utils/plateMap/cellRatios';
import type { LabwareWords } from '../../../../utils/plateMap/labwareCatalog';
import type { ShownRole } from '../../../../utils/plateMap/plateLayers';
import type { NameElsewhere, WellRow } from '../../../../utils/plateMap/wellEdits';
import type { KnownName } from '../../../../utils/plateMap/wellValueSuggestions';

interface WorkbenchWellLineRowProps {
  knownNames: readonly KnownName[];
  row: WellRow;
  lineName: string;
  lineOffers: readonly string[];
  textPlaceholder: string;
  seriesText: string | undefined;
  autoRole: ShownRole | undefined;
  showsRole: boolean;
  canRemove: boolean;
  inputRef: Ref<HTMLInputElement> | undefined;
  sharedName: NameElsewhere | undefined;
  words: LabwareWords;
  ratio: RatioRow | undefined;
  onTextChange: (text: string) => void;
  onRenameEverywhere: () => void;
  onRenameLine: (name: string) => void;
  onPartnerChange: (lineId: string) => void;
  onAmountChange: (amount: string) => void;
  onUnitChange: (unit: string) => void;
  onRoleChange: (role: PlateLine['role']) => void;
  onToggleIndicatorPart: (part: IndicatorPart) => void;
  onRemove: () => void;
  onOpenSeries: () => void;
  onPickColor: (color: string) => void;
}

type IndicatorPart = NonNullable<PlateLine['hiddenIndicators']>[number];

const INDICATOR_PARTS: ReadonlyArray<{ part: IndicatorPart; label: string }> = [
  { part: 'outline', label: 'Outline' },
  { part: 'bracket', label: 'Bracket' },
];

const hasIndicatorParts = (role: ShownRole | PlateLine['role'] | undefined) =>
  role === 'band' || role === 'stripe';

const ROLE_LABELS: Readonly<Record<PlateLine['role'], string>> = {
  auto: 'Auto',
  fill: 'Fill',
  band: 'Band',
  stripe: 'Stripe',
  tag: 'Tag',
  caption: 'Caption',
  hover: 'Hover only',
};

export function WorkbenchWellLineRow({
  knownNames,
  row,
  lineName,
  lineOffers,
  textPlaceholder,
  seriesText,
  autoRole,
  showsRole,
  canRemove,
  inputRef,
  sharedName,
  words,
  ratio,
  onTextChange,
  onRenameEverywhere,
  onRenameLine,
  onPartnerChange,
  onAmountChange,
  onUnitChange,
  onRoleChange,
  onToggleIndicatorPart,
  onRemove,
  onOpenSeries,
  onPickColor,
}: WorkbenchWellLineRowProps) {
  const [isPickingColor, setIsPickingColor] = useState(false);
  const suggestions = wellValueSuggestions(row.text, row.line?.values ?? [], knownNames);
  const roleOptions = Object.entries(ROLE_LABELS).map(([value, label]) => ({
    value,
    label: value === 'auto' && autoRole ? `Auto: ${ROLE_LABELS[autoRole].toLowerCase()}` : label,
  }));

  return (
    <div className="flex flex-col gap-1">
      <span className="pl-6">
        <WorkbenchPlateNameField
          name={lineName}
          shown={lineName || <span className="italic">Name this line</span>}
          label="Line name"
          placeholder="Name this line"
          className="text-label-xs text-muted-foreground"
          offers={lineOffers}
          offersLabel={`Put these ${words.plural} on`}
          onRename={onRenameLine}
        />
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!row.value}
          aria-label={
            row.value ? `Change the color of ${row.value.text}` : 'Name it to pick a color'
          }
          aria-expanded={isPickingColor}
          className="h-4 w-4 flex-none border border-foreground/30 disabled:opacity-30"
          style={{ backgroundColor: row.value?.color }}
          onClick={() => setIsPickingColor(!isPickingColor)}
        />
        <span className="min-w-0 flex-1">
          <Input
            ref={inputRef}
            size="sm"
            fullWidth
            value={row.text}
            placeholder={row.isTextMixed ? 'Mixed. Typing replaces all' : textPlaceholder}
            aria-label={`What is in these ${words.plural}`}
            spellCheck={false}
            autoComplete="off"
            onValueChange={onTextChange}
            onBlur={event => {
              const typed = event.currentTarget.value;
              const converted = withGreekLetters(typed);
              if (converted !== typed) onTextChange(converted);
            }}
          />
        </span>
        {seriesText ? (
          <Tooltip content="Change this dilution">
            <button
              type="button"
              className="whitespace-nowrap border border-line-soft px-2 py-1 font-mono text-data-sm text-foreground hover:border-primary/60"
              onClick={onOpenSeries}
            >
              {seriesText}
            </button>
          </Tooltip>
        ) : (
          <>
            <WorkbenchValueAmountField
              value={row.amount}
              unit={row.unit}
              units={undefined}
              isInvalid={false}
              placeholder={row.isAmountMixed ? 'Mixed' : 'Amount'}
              isFocusedOnMount={false}
              onValueChange={onAmountChange}
              onUnitChange={onUnitChange}
            />
            <Tooltip content={`Fill these ${words.plural} with a dilution or any stepped series`}>
              <button
                type="button"
                className="text-caption text-primary hover:underline"
                onClick={onOpenSeries}
              >
                Dilution
              </button>
            </Tooltip>
          </>
        )}
        {showsRole && row.line && (
          <Tooltip
            content={`Show ${lineName || 'this line'} as… (every ${words.noun} on that line)`}
          >
            <span className="inline-flex">
              <Select
                size="xs"
                isQuiet
                options={roleOptions}
                value={row.line.role}
                aria-label={`Show ${lineName || 'this line'} as`}
                onChange={next => onRoleChange(String(next) as PlateLine['role'])}
                className="w-32"
              />
            </span>
          </Tooltip>
        )}
        {canRemove && (
          <button
            type="button"
            aria-label={`Remove this line from these ${words.plural}`}
            className="inline-flex h-6 w-6 flex-none items-center justify-center text-muted-foreground hover:text-danger-text"
            onClick={onRemove}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {showsRole &&
        row.line &&
        hasIndicatorParts(row.line.role === 'auto' ? autoRole : row.line.role) && (
          <p className="flex items-center gap-1.5 pl-6 text-caption text-muted-foreground">
            Shows
            {INDICATOR_PARTS.map(({ part, label }) => {
              const isShown = !row.line?.hiddenIndicators?.includes(part);
              return (
                <button
                  key={part}
                  type="button"
                  aria-pressed={isShown}
                  className={`border px-1.5 ${
                    isShown
                      ? 'border-line-mid text-foreground'
                      : 'border-line-soft text-muted-foreground line-through'
                  } hover:border-primary/60`}
                  onClick={() => onToggleIndicatorPart(part)}
                >
                  {label}
                </button>
              );
            })}
          </p>
        )}
      {ratio && (
        <p className="flex items-center gap-1.5 pl-6 text-caption text-muted-foreground">
          to
          <Select
            size="xs"
            isQuiet
            value={ratio.chosenId}
            options={[
              {
                value: '',
                label: ratio.autoLabel ? `Auto: ${ratio.autoLabel}` : 'Pick the other cells',
              },
              ...ratio.choices.map(choice => ({ value: choice.lineId, label: choice.label })),
            ]}
            aria-label="The cells this ratio is to"
            className="w-40"
            onChange={choice => onPartnerChange(String(choice ?? ''))}
          />
          {ratio.workedOut && <span className="text-foreground">{ratio.workedOut}</span>}
        </p>
      )}
      {sharedName && (
        <p className="pl-6 text-caption text-muted-foreground">
          {sharedName.text} is also on {sharedName.wellCount}{' '}
          {sharedName.wellCount === 1 ? words.noun : words.plural}
          {sharedName.labwareName && ` on ${sharedName.labwareName}`} ·{' '}
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={onRenameEverywhere}
          >
            Rename everywhere
          </button>
        </p>
      )}
      {isPickingColor && row.value && (
        <WorkbenchColorSwatchList
          current={row.value.color}
          onPick={color => {
            onPickColor(color);
            setIsPickingColor(false);
          }}
        />
      )}
      <WorkbenchPlateSuggestionList suggestions={suggestions} onPick={onTextChange} />
    </div>
  );
}
