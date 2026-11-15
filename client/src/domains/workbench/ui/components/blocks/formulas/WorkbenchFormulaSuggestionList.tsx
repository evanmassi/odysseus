import { Button, Tooltip } from '@shared/ui';

import type { CalculationSuggestion } from '../../../../utils/formulas/formulaScopes';

interface WorkbenchFormulaSuggestionListProps {
  suggestions: readonly CalculationSuggestion[];
  suggestionTitle: (suggestion: CalculationSuggestion) => string;
  className: string;
  onSuggest: (suggestion: CalculationSuggestion) => void;
}

export function WorkbenchFormulaSuggestionList({
  suggestions,
  suggestionTitle,
  className,
  onSuggest,
}: WorkbenchFormulaSuggestionListProps) {
  if (!suggestions.length) return null;
  return (
    <p
      className={`${className} flex-wrap items-center gap-x-1 pb-1 text-label-xs text-muted-foreground`}
    >
      Often added:
      {suggestions.map(suggestion => (
        <Tooltip content={suggestionTitle(suggestion)} key={suggestion.name}>
          <Button
            variant="ghost-primary"
            size="xs"
            onMouseDown={event => event.preventDefault()}
            onClick={() => onSuggest(suggestion)}
          >
            {suggestion.label}
          </Button>
        </Tooltip>
      ))}
    </p>
  );
}
