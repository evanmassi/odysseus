import { useState } from 'react';

import { withGreekLetters } from '@odysseus/shared-schemas';

import { Button } from '@shared/ui';

import { focusOnMount } from '../../../../utils/dom/focusOnMount';
import { WorkbenchAddBar } from '../../board/WorkbenchAddBar';

import type { ValueLineGuess } from '../../../../utils/values/valueRouting';
import type { ValueSuggestion } from '../../../../utils/values/valueSuggestions';

interface WorkbenchValueAddFieldProps {
  variant?: 'line' | 'bar';
  placeholder: string;
  guessFor: (text: string) => ValueLineGuess | undefined;
  suggestions?: readonly ValueSuggestion[];
  isFocusedOnMount?: boolean;
  onAddLines: (lines: string[]) => void;
  onSuggest?: (suggestion: ValueSuggestion) => void;
  onClose?: () => void;
}

export function WorkbenchValueAddField({
  variant = 'line',
  placeholder,
  guessFor,
  suggestions = [],
  isFocusedOnMount = false,
  onAddLines,
  onSuggest,
  onClose,
}: WorkbenchValueAddFieldProps) {
  const [draft, setDraft] = useState('');
  const hasText = !!draft.trim();
  const guess = hasText ? guessFor(draft) : undefined;

  const submit = (lines: string[]) => {
    onAddLines(lines.map(withGreekLetters));
    setDraft('');
  };

  const escape = () => {
    if (draft) setDraft('');
    else onClose?.();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') escape();
    if (event.key === 'Enter' && hasText) {
      event.preventDefault();
      submit([draft]);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text');
    if (!/\n/.test(text.trim())) return;
    event.preventDefault();
    submit(text.split(/\r?\n/).filter(line => line.trim()));
  };

  return (
    <div>
      {variant === 'bar' ? (
        <WorkbenchAddBar
          value={draft}
          placeholder={placeholder}
          itemLabel="Value"
          onValueChange={setDraft}
          onSubmit={() => submit([draft])}
          onEscape={escape}
          onPaste={handlePaste}
        />
      ) : (
        <span className="inline-edit">
          <input
            ref={isFocusedOnMount ? focusOnMount : undefined}
            value={draft}
            placeholder={placeholder}
            aria-label={placeholder}
            spellCheck={false}
            autoComplete="off"
            className="py-px text-body-sm text-foreground placeholder:text-muted-foreground"
            onChange={event => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
          />
        </span>
      )}
      {guess && (
        <p
          className={`pb-1 text-label-xs text-muted-foreground ${variant === 'bar' ? 'pt-1.5' : ''}`}
        >
          <b className="font-semibold text-foreground">{guess.full}</b> · {guess.shown}
          {guess.place && ` · ${guess.place}`}
          {guess.isTaken && (
            <span className="text-warning-text">{` · ${guess.full} is already used`}</span>
          )}
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
