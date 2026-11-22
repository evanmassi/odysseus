const PICKABLE_COLORS = [
  '#f0b35b',
  '#e8875a',
  '#d97a7a',
  '#e88fbf',
  '#b48ee6',
  '#8b9cf0',
  '#6fa8e8',
  '#8fd3e8',
  '#5cc8bd',
  '#6fbf73',
  '#b8d36a',
  '#c9ccd3',
  '#b9802a',
  '#b85a32',
  '#a84848',
  '#b5568a',
  '#7d58b3',
  '#5565c2',
  '#3d73b8',
  '#4b9bb8',
  '#2e8f86',
  '#3f8a47',
  '#83a033',
  '#7d8494',
] as const;

interface WorkbenchColorSwatchListProps {
  current: string | undefined;
  onPick: (color: string) => void;
}

export function WorkbenchColorSwatchList({ current, onPick }: WorkbenchColorSwatchListProps) {
  return (
    <div className="grid w-max grid-cols-12 gap-1.5" role="group" aria-label="Pick a color">
      {PICKABLE_COLORS.map(color => (
        <button
          key={color}
          type="button"
          aria-label={`Use ${color}`}
          aria-pressed={color === current}
          className={`h-5 w-5 hover:outline hover:outline-2 hover:outline-offset-1 hover:outline-foreground/50 ${
            color === current ? 'outline outline-2 outline-offset-1 outline-foreground' : ''
          }`}
          style={{ backgroundColor: color }}
          onClick={() => onPick(color)}
        />
      ))}
    </div>
  );
}
