interface PlateSuggestion {
  key: string;
  text: string;
}

interface WorkbenchPlateSuggestionListProps {
  label?: string;
  suggestions: readonly PlateSuggestion[];
  onPick: (text: string) => void;
}

export function WorkbenchPlateSuggestionList({
  label,
  suggestions,
  onPick,
}: WorkbenchPlateSuggestionListProps) {
  if (!suggestions.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {label && <span className="text-caption text-muted-foreground">{label}</span>}
      {suggestions.map(({ key, text }) => (
        <button
          key={key}
          type="button"
          className="border border-line-soft px-2 py-0.5 text-caption text-foreground hover:border-primary/60"
          onMouseDown={event => event.preventDefault()}
          onClick={() => onPick(text)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
