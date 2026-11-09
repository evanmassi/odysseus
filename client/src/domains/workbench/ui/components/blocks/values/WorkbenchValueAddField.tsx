import { useState } from 'react';

import { Button } from '@shared/ui';

import { focusOnMount } from '../../../../utils/dom/focusOnMount';
import { displayValue } from '../../../../utils/formulas/quantities';
import { withGreekLetters } from '../../../../utils/materials/greekLetters';
import { parseValueLine } from '../../../../utils/values/valueLines';
import { joinValueName } from '../../../../utils/values/valueNames';
import { valueUnitLabel } from '../../../../utils/values/valueUnits';

import type { ValueSuggestion } from '../../../../utils/values/valueSuggestions';

interface WorkbenchValueAddFieldProps {
  ownerName: string;
  placeholder: string;
  takenNames: ReadonlySet<string>;
  suggestions?: readonly ValueSuggestion[];
  isFocusedOnMount?: boolean;
  onAddLines: (lines: string[]) => void;
  onSuggest?: (suggestion: ValueSuggestion) => void;
  onClose?: () => void;
}

function guessLine(text: string, ownerName: string, takenNames: ReadonlySet<string>) {
  const parsed = parseValueLine(text);
  if (!parsed) return undefined;
  const full = ownerName ? joinValueName(ownerName, parsed.name) : parsed.name;
  const shown = parsed.value ? displayValue(parsed.value, parsed.unit) : 'to fill in';
  const unitHint = parsed.unit && !parsed.value ? ` (${valueUnitLabel(parsed.unit)})` : '';
  return { full, shown: `${shown}${unitHint}`, isTaken: takenNames.has(full.trim().toLowerCase()) };
}

export function WorkbenchValueAddField({
  ownerName,
  placeholder,
  takenNames,
  suggestions = [],
  isFocusedOnMount = false,
  onAddLines,
  onSuggest,
  onClose,
}: WorkbenchValueAddFieldProps) {
  const [draft, setDraft] = useState('');
  const guess = draft.trim() ? guessLine(draft, ownerName, takenNames) : undefined;

  const submit = (lines: string[]) => {
    onAddLines(lines.map(withGreekLetters));
    setDraft('');
  };

  return (
    <div>
      <input
        ref={isFocusedOnMount ? focusOnMount : undefined}
        value={draft}
        placeholder={placeholder}
        aria-label={placeholder}
        spellCheck={false}
        autoComplete="off"
        className="w-full bg-transparent py-1 text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
        onChange={event => setDraft(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Escape') {
            if (draft) setDraft('');
            else onClose?.();
          }
          if (event.key === 'Enter' && draft.trim()) {
            event.preventDefault();
            submit([draft]);
          }
        }}
        onPaste={event => {
          const text = event.clipboardData.getData('text');
          if (!/\n/.test(text.trim())) return;
          event.preventDefault();
          submit(text.split(/\r?\n/).filter(line => line.trim()));
        }}
      />
      {guess && (
        <p className="pb-1 text-label-xs text-muted-foreground">
          <b className="font-semibold text-foreground">{guess.full}</b> · {guess.shown}
          {guess.isTaken && <span className="text-warning-text"> · name already used</span>}
        </p>
      )}
      {onSuggest && suggestions.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-1 pb-1 text-label-xs text-muted-foreground">
          Often added:
          {suggestions.map(suggestion => (
            <Button
              key={`${suggestion.kind}:${suggestion.label}`}
              variant="ghost-primary"
              size="xs"
              onMouseDown={event => event.preventDefault()}
              onClick={() => onSuggest(suggestion)}
            >
              {suggestion.label}
            </Button>
          ))}
        </p>
      )}
    </div>
  );
}
