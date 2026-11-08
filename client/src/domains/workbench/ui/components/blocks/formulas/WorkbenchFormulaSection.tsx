import { useState, type ReactNode } from 'react';

import { Button } from '@shared/ui';

import type { CalculationSuggestion } from '../../../../utils/formulas/formulaScopes';

interface WorkbenchFormulaSectionProps {
  title: string | undefined;
  kind: string;
  addPlaceholder: string;
  suggestions: readonly CalculationSuggestion[];
  suggestionTitle: (suggestion: CalculationSuggestion) => string;
  isEmpty: boolean;
  onAdd: (text: string) => void;
  onSuggest: (suggestion: CalculationSuggestion) => void;
  onRemoveSection?: () => void;
  children: ReactNode;
}

export function WorkbenchFormulaSection({
  title,
  kind,
  addPlaceholder,
  suggestions,
  suggestionTitle,
  isEmpty,
  onAdd,
  onSuggest,
  onRemoveSection,
  children,
}: WorkbenchFormulaSectionProps) {
  const [draft, setDraft] = useState('');

  return (
    <section className="group/section min-w-0">
      {title !== undefined && (
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
      )}
      <div className="flex flex-col">{children}</div>
      <input
        value={draft}
        placeholder={addPlaceholder}
        title="Name it, or type Name = formula"
        aria-label={addPlaceholder}
        spellCheck={false}
        autoComplete="off"
        className="mx-2 mt-1 w-[calc(100%-1rem)] bg-transparent py-1 text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
        onChange={event => setDraft(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Escape') setDraft('');
          if (event.key !== 'Enter' || !draft.trim()) return;
          event.preventDefault();
          onAdd(draft);
          setDraft('');
        }}
      />
      {suggestions.length > 0 && (
        <p
          className={`${isEmpty ? 'flex' : 'hidden group-focus-within/section:flex'} flex-wrap items-center gap-x-1 px-2 pb-1 text-label-xs text-muted-foreground`}
        >
          Often added:
          {suggestions.map(suggestion => (
            <Button
              key={suggestion.name}
              variant="ghost-primary"
              size="xs"
              title={suggestionTitle(suggestion)}
              onMouseDown={event => event.preventDefault()}
              onClick={() => onSuggest(suggestion)}
            >
              {suggestion.label}
            </Button>
          ))}
        </p>
      )}
    </section>
  );
}
