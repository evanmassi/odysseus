import { useState, type ReactNode } from 'react';

import { Plus } from 'lucide-react';

import { Button, Tooltip } from '@shared/ui';

import { WorkbenchCalculationSectionHeader } from './WorkbenchCalculationSectionHeader';
import { WorkbenchCalculationSuggestionList } from './WorkbenchCalculationSuggestionList';

import type { CalculationSuggestion } from '../../../../utils/formulas/formulaScopes';
import type { PlateSwatch } from '../../../../utils/plateMap/plateSwatches';

interface WorkbenchCalculationSectionProps {
  title: string | undefined;
  kind: string;
  swatch: PlateSwatch | undefined;
  addPlaceholder: string;
  suggestions: readonly CalculationSuggestion[];
  suggestionTitle: (suggestion: CalculationSuggestion) => string;
  isEmpty: boolean;
  onAdd: ((text: string) => void) | undefined;
  onSuggest: (suggestion: CalculationSuggestion) => void;
  onRemoveSection?: () => void;
  children: ReactNode;
}

export function WorkbenchCalculationSection({
  title,
  kind,
  swatch,
  addPlaceholder,
  suggestions,
  suggestionTitle,
  isEmpty,
  onAdd,
  onSuggest,
  onRemoveSection,
  children,
}: WorkbenchCalculationSectionProps) {
  const [draft, setDraft] = useState('');

  return (
    <section className="group/section min-w-0 break-inside-avoid">
      {title !== undefined && (
        <WorkbenchCalculationSectionHeader title={title} kind={kind} swatch={swatch}>
          {onRemoveSection && (
            <Button
              variant="ghost-danger"
              size="xs"
              className="opacity-0 group-hover:opacity-100"
              onClick={onRemoveSection}
            >
              Remove
            </Button>
          )}
        </WorkbenchCalculationSectionHeader>
      )}
      <div className="flex flex-col">{children}</div>
      {onAdd && (
        <div className="group/add mx-2 mt-1 flex items-center gap-2 text-muted-foreground hover:text-primary focus-within:text-primary">
          <Plus aria-hidden className="h-3.5 w-3.5 flex-none" />
          <Tooltip content="Name it, or type Name = formula">
            <span className="inline-edit min-w-0 flex-1">
              <input
                value={draft}
                placeholder={addPlaceholder}
                aria-label={addPlaceholder}
                spellCheck={false}
                autoComplete="off"
                className="w-full bg-transparent py-px text-body-sm text-foreground outline-none placeholder:text-muted-foreground group-hover/add:placeholder:text-foreground"
                onChange={event => setDraft(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Escape') setDraft('');
                  if (event.key !== 'Enter' || !draft.trim()) return;
                  event.preventDefault();
                  onAdd(draft);
                  setDraft('');
                }}
              />
            </span>
          </Tooltip>
        </div>
      )}
      <WorkbenchCalculationSuggestionList
        suggestions={suggestions}
        suggestionTitle={suggestionTitle}
        className={`px-2 ${isEmpty ? 'flex' : 'hidden group-focus-within/section:flex'}`}
        onSuggest={onSuggest}
      />
    </section>
  );
}
