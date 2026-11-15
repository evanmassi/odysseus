import { useState } from 'react';

import { Plus } from 'lucide-react';

import { Button, Input } from '@shared/ui';

import { focusOnMount } from '../../../../utils/dom/focusOnMount';
import { withGreekLetters } from '../../../../utils/materials/greekLetters';

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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      if (draft) setDraft('');
      else onClose?.();
    }
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
        <div className="flex max-w-[38.75rem] items-center gap-2">
          <div className="min-w-0 flex-1">
            <Input
              size="md"
              fullWidth
              value={draft}
              placeholder={placeholder}
              aria-label="Add a value"
              spellCheck={false}
              autoComplete="off"
              inputClassName="placeholder:italic"
              onValueChange={setDraft}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
            />
          </div>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="h-4 w-4" />}
            disabled={!hasText}
            onClick={() => submit([draft])}
          >
            Add Value
          </Button>
        </div>
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
