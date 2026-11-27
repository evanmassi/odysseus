import type { Ref } from 'react';

import { Button, Input, Select, Tooltip, type SelectOption } from '@shared/ui';

import { nameKey, type SolvedBoard } from '../../../../utils/formulas/boardCalculation';
import { describeName } from '../../../../utils/formulas/nameDisplay';
import { seriesTopTerm } from '../../../../utils/plateMap/plateMapNames';
import { DILUTION_FACTOR } from '../../../../utils/terms/termList';
import { VALUE_UNIT_OPTIONS } from '../../../../utils/values/valueUnits';

import type { LabwareWords } from '../../../../utils/plateMap/labwareCatalog';
import type { SeriesFit, SeriesForm } from '../../../../utils/plateMap/seriesEdits';

interface WorkbenchWellSeriesFormProps {
  form: SeriesForm;
  isUnnamed: boolean;
  preview: string;
  board: SolvedBoard;
  firstFieldRef: Ref<HTMLInputElement>;
  onChange: (change: Partial<SeriesForm>) => void;
  onDone: () => void;
  onRemove: (() => void) | undefined;
  words: LabwareWords;
  existing: readonly SelectOption[];
  onPickExisting: (seriesId: string) => void;
  fit: SeriesFit | undefined;
  onFitChoice: (keepsPlanned: boolean) => void;
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

function nameSuggestions(board: SolvedBoard, typed: string) {
  const key = nameKey(typed);
  if (!/[a-z]/.test(key) || board.names.has(key)) return [];
  return [...board.names.values()]
    .filter(
      entry =>
        (entry.kind === 'value' || entry.kind === 'calculation') &&
        nameKey(entry.name).includes(key)
    )
    .slice(0, SUGGESTION_LIMIT)
    .map(entry => ({ name: entry.name, shown: describeName(board, entry).text }));
}

function linkedText(board: SolvedBoard, text: string) {
  const shown = describeName(board, { name: text });
  return shown.kind === 'value' || shown.kind === 'calculation' ? shown.text : undefined;
}

export function WorkbenchWellSeriesForm({
  form,
  isUnnamed,
  preview,
  board,
  firstFieldRef,
  onChange,
  onDone,
  onRemove,
  words,
  existing,
  onPickExisting,
  fit,
  onFitChoice,
}: WorkbenchWellSeriesFormProps) {
  const topLink = linkedText(board, form.top);
  const topWord = seriesTopTerm(form.unit, form.unit).word;
  const dilutionFactorLink = linkedText(board, form.dilutionFactor);

  const suggestionsFor = (part: 'top' | 'dilutionFactor') => {
    const found = nameSuggestions(board, form[part]);
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
      {form.seriesId === undefined && existing.length > 0 && (
        <div className="flex items-center gap-2">
          <span className={LABEL}>Use</span>
          <Select
            size="xs"
            isQuiet
            value={null}
            placeholder="A dilution already made"
            options={[...existing]}
            aria-label="Use a dilution already made"
            onChange={choice => choice !== null && onPickExisting(String(choice))}
            className="min-w-0 flex-1"
          />
        </div>
      )}
      {fit && (
        <div className="flex items-center gap-2 text-caption text-warning-text">
          {`${fit.fits} of ${fit.planned} fit`}
          <Button variant="ghost" size="xs" onClick={() => onFitChoice(true)}>
            {`Keep ${fit.planned}`}
          </Button>
          <Button variant="ghost" size="xs" onClick={() => onFitChoice(false)}>
            {`Use ${fit.fits}`}
          </Button>
        </div>
      )}
      {form.isList ? (
        <>
          <div className="flex items-center gap-2">
            <span className={LABEL}>Values</span>
            <span className="min-w-0 flex-1">
              <Input
                ref={firstFieldRef}
                size="sm"
                fullWidth
                value={form.typedValues}
                aria-label="Values, separated by commas"
                placeholder="10:1, 5:1, 2.5:1, 1:1"
                spellCheck={false}
                onValueChange={typedValues => onChange({ typedValues })}
              />
            </span>
          </div>
          <button type="button" className={LINK} onClick={() => onChange({ isList: false })}>
            Use Top and Dil. factor instead
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className={LABEL}>{topWord}</span>
            <span className="min-w-0 flex-1">
              <Input
                ref={firstFieldRef}
                size="sm"
                fullWidth
                value={form.top}
                aria-label={topWord}
                placeholder="10, or a value's name"
                spellCheck={false}
                autoComplete="off"
                onValueChange={top => onChange({ top })}
              />
            </span>
            {topLink ? (
              <span className="font-mono text-data-sm text-foreground">{topLink}</span>
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
          {suggestionsFor('top')}
          <div className="flex items-center gap-2">
            <span className={LABEL}>{DILUTION_FACTOR.word}</span>
            <span className="font-mono text-data-sm text-muted-foreground">1:</span>
            <span className="w-24">
              <Input
                size="sm"
                fullWidth
                value={form.dilutionFactor}
                aria-label={`${DILUTION_FACTOR.word}, 1 in`}
                placeholder="3"
                spellCheck={false}
                autoComplete="off"
                onValueChange={dilutionFactor => onChange({ dilutionFactor })}
              />
            </span>
            {dilutionFactorLink && (
              <span className="font-mono text-data-sm text-foreground">{dilutionFactorLink}</span>
            )}
          </div>
          {suggestionsFor('dilutionFactor')}
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
      {!form.isList && !form.unit && !topLink && (
        <p className="text-caption text-warning-text">
          {`No unit yet, so the ${words.plural} will show bare numbers. Pick one next to ${topWord}.`}
        </p>
      )}
      {isUnnamed && (
        <p className="text-caption text-warning-text">
          {`Name what is being diluted in the box above, so the ${words.plural} and the Dilutions card can say what it is.`}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="ghost" size="sm">
          Done
        </Button>
        {onRemove && (
          <Button variant="ghost" size="sm" onClick={onRemove}>
            Clear from the plate
          </Button>
        )}
      </div>
    </form>
  );
}
