import { useState, type ReactNode } from 'react';

import { Button } from '@shared/ui';

import { displayValue } from '../../../../utils/formulas/quantities';
import { parseValueLine } from '../../../../utils/values/valueLines';
import { joinValueName } from '../../../../utils/values/valueNames';
import { valueUnitLabel } from '../../../../utils/values/valueUnits';

import type { ValueSuggestion } from '../../../../utils/values/valueSuggestions';

interface WorkbenchValueSectionProps {
  title: ReactNode;
  kind: string;
  ownerName: string;
  addPlaceholder: string;
  suggestions?: readonly ValueSuggestion[];
  takenNames: ReadonlySet<string>;
  undoLabel: string | undefined;
  onAddLines: (lines: string[]) => void;
  onSuggest?: (suggestion: ValueSuggestion) => void;
  onRemoveSection?: () => void;
  isEmpty: boolean;
  onUndo: () => void;
  children: ReactNode;
}

function guessLine(text: string, ownerName: string, takenNames: ReadonlySet<string>) {
  const parsed = parseValueLine(text);
  if (!parsed) return undefined;
  const full = ownerName ? joinValueName(ownerName, parsed.name) : parsed.name;
  const shown = parsed.value ? displayValue(parsed.value, parsed.unit) : 'to fill in';
  const unitHint = parsed.unit && !parsed.value ? ` (${valueUnitLabel(parsed.unit)})` : '';
  return { full, shown: `${shown}${unitHint}`, isTaken: takenNames.has(full.trim().toLowerCase()) };
}

export function WorkbenchValueSection({
  title,
  kind,
  ownerName,
  addPlaceholder,
  suggestions = [],
  takenNames,
  undoLabel,
  onAddLines,
  onSuggest,
  onRemoveSection,
  isEmpty,
  onUndo,
  children,
}: WorkbenchValueSectionProps) {
  const [draft, setDraft] = useState('');
  const guess = draft.trim() ? guessLine(draft, ownerName, takenNames) : undefined;

  const submit = (lines: string[]) => {
    onAddLines(lines);
    setDraft('');
  };

  return (
    <section className="group/section min-w-0">
      <header className="group flex items-center gap-2 px-2 pb-1.5">
        <span className="min-w-0 truncate type-label text-label-md font-semibold text-foreground">
          {title}
        </span>
        {kind && (
          <span className="flex-none font-mono text-data-sm text-muted-foreground">· {kind}</span>
        )}
        {onRemoveSection && (
          <Button
            variant="ghost-danger"
            size="xs"
            className="ml-auto opacity-0 group-hover:opacity-100"
            onClick={onRemoveSection}
          >
            Remove
          </Button>
        )}
      </header>
      <table className="w-full border-collapse">
        <tbody>
          {children}
          {undoLabel && (
            <tr>
              <td colSpan={2} className="px-2 py-1.5 text-body-sm text-muted-foreground">
                Removed {undoLabel}
              </td>
              <td className="px-1 text-right">
                <Button variant="ghost" size="xs" onClick={onUndo}>
                  Undo
                </Button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="px-2 pt-1">
        <input
          value={draft}
          placeholder={addPlaceholder}
          aria-label={addPlaceholder}
          spellCheck={false}
          autoComplete="off"
          className="w-full bg-transparent py-1 text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Escape') setDraft('');
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
          <p
            className={`${isEmpty ? 'flex' : 'hidden group-focus-within/section:flex'} flex-wrap items-center gap-x-1 pb-1 text-label-xs text-muted-foreground`}
          >
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
    </section>
  );
}
