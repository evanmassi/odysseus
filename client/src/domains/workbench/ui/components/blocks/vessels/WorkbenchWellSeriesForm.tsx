import type { Ref } from 'react';

import { Button, Input, Select, Tooltip } from '@shared/ui';

import { nameKey, type BoardCalculation } from '../../../../utils/formulas/boardCalculation';
import { describeName } from '../../../../utils/formulas/nameDisplay';
import { VALUE_UNIT_OPTIONS } from '../../../../utils/values/valueUnits';

import type { SeriesForm } from '../../../../utils/vessels/seriesEdits';

interface WorkbenchWellSeriesFormProps {
  form: SeriesForm;
  isUnnamed: boolean;
  preview: string;
  calculation: BoardCalculation;
  startRef: Ref<HTMLInputElement>;
  onChange: (change: Partial<SeriesForm>) => void;
  onDone: () => void;
  onRemove: (() => void) | undefined;
}

const DIRECTIONS: ReadonlyArray<[SeriesForm['direction'], string, string]> = [
  ['right', '→', 'Left to right'],
  ['down', '↓', 'Top to bottom'],
  ['left', '←', 'Right to left'],
  ['up', '↑', 'Bottom to top'],
];
const SUGGESTION_LIMIT = 6;
const LABEL = 'w-16 flex-none text-caption text-muted-foreground';
const LINK = 'self-start text-caption text-primary hover:underline';

function nameSuggestions(calculation: BoardCalculation, typed: string) {
  const key = nameKey(typed);
  if (!/[a-z]/.test(key) || calculation.names.has(key)) return [];
  return [...calculation.names.values()]
    .filter(
      entry =>
        (entry.kind === 'value' || entry.kind === 'formula') && nameKey(entry.name).includes(key)
    )
    .slice(0, SUGGESTION_LIMIT)
    .map(entry => ({ name: entry.name, shown: describeName(calculation, entry.name).text }));
}

function linkedText(calculation: BoardCalculation, text: string) {
  const shown = describeName(calculation, text);
  return shown.kind === 'value' || shown.kind === 'formula' ? shown.text : undefined;
}

export function WorkbenchWellSeriesForm({
  form,
  isUnnamed,
  preview,
  calculation,
  startRef,
  onChange,
  onDone,
  onRemove,
}: WorkbenchWellSeriesFormProps) {
  const startLink = linkedText(calculation, form.start);
  const foldLink = linkedText(calculation, form.fold);

  const suggestionsFor = (part: 'start' | 'fold') => {
    const found = nameSuggestions(calculation, form[part]);
    return found.length > 0 ? (
      <div className="flex flex-wrap gap-1 pl-[4.5rem]">
        {found.map(({ name, shown }) => (
          <button
            key={name}
            type="button"
            className="border border-line-soft px-2 py-0.5 text-caption text-foreground hover:border-primary/60"
            onClick={() => onChange({ [part]: name })}
          >
            {name} <span className="text-muted-foreground">{shown}</span>
          </button>
        ))}
      </div>
    ) : null;
  };

  return (
    <form
      className="flex flex-col gap-2 border-l-2 border-primary/60 bg-foreground/[0.025] px-3 py-2"
      aria-label="Dilution series"
      onSubmit={event => {
        event.preventDefault();
        onDone();
      }}
    >
      {form.isList ? (
        <>
          <div className="flex items-center gap-2">
            <span className={LABEL}>Values</span>
            <span className="min-w-0 flex-1">
              <Input
                ref={startRef}
                size="sm"
                fullWidth
                value={form.points}
                aria-label="Values, separated by commas"
                placeholder="10:1, 5:1, 2.5:1, 1:1"
                spellCheck={false}
                onValueChange={points => onChange({ points })}
              />
            </span>
          </div>
          <button type="button" className={LINK} onClick={() => onChange({ isList: false })}>
            Step by a number instead
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className={LABEL}>Start</span>
            <span className="min-w-0 flex-1">
              <Input
                ref={startRef}
                size="sm"
                fullWidth
                value={form.start}
                aria-label="Start"
                placeholder="10, or a value’s name"
                spellCheck={false}
                autoComplete="off"
                onValueChange={start => onChange({ start })}
              />
            </span>
            {startLink ? (
              <span className="font-mono text-data-sm text-foreground">{startLink}</span>
            ) : (
              <Select
                size="xs"
                isQuiet
                options={[...VALUE_UNIT_OPTIONS]}
                value={form.unit}
                aria-label="Unit"
                onChange={unit => onChange({ unit: String(unit ?? '') })}
                className="w-28"
              />
            )}
          </div>
          {suggestionsFor('start')}
          <div className="flex items-center gap-2">
            <span className={LABEL}>Dilution</span>
            <span className="font-mono text-data-sm text-muted-foreground">1:</span>
            <span className="w-24">
              <Input
                size="sm"
                fullWidth
                value={form.fold}
                aria-label="Dilution, 1 in"
                placeholder="3"
                spellCheck={false}
                autoComplete="off"
                onValueChange={fold => onChange({ fold })}
              />
            </span>
            {foldLink && <span className="font-mono text-data-sm text-foreground">{foldLink}</span>}
          </div>
          {suggestionsFor('fold')}
          <button type="button" className={LINK} onClick={() => onChange({ isList: true })}>
            Type each value instead
          </button>
        </>
      )}
      <div className="flex items-center gap-2">
        <span className={LABEL}>Direction</span>
        {DIRECTIONS.map(([direction, arrow, label]) => (
          <Tooltip content={label} key={direction}>
            <button
              type="button"
              aria-label={label}
              aria-pressed={form.direction === direction}
              className={`h-7 w-8 border text-body-sm ${
                form.direction === direction
                  ? 'border-primary/60 bg-primary/15 text-foreground'
                  : 'border-line-soft text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => onChange({ direction })}
            >
              {arrow}
            </button>
          </Tooltip>
        ))}
      </div>
      <p className="text-caption text-muted-foreground">{preview}</p>
      {!form.isList && !form.unit && !startLink && (
        <p className="text-caption text-warning-text">
          No unit yet, so the wells will show bare numbers. Pick one next to Start.
        </p>
      )}
      {isUnnamed && (
        <p className="text-caption text-warning-text">
          Name what is being diluted in the box above, so the wells and the Dilutions card can say
          what it is.
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="ghost" size="sm">
          Done
        </Button>
        {onRemove && (
          <Button variant="ghost" size="sm" onClick={onRemove}>
            Remove dilution
          </Button>
        )}
      </div>
    </form>
  );
}
