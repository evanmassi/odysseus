export type TreeRailPlace = 'start' | 'middle' | 'end' | 'passing';

export const TREE_RAIL_X = 25;

export const TREE_BRANCH_INDENT = 15;

const NEUTRAL_RAIL = 'hsl(var(--muted-foreground) / 0.5)';

const RUNS: Readonly<Record<TreeRailPlace, string>> = {
  start: 'top-[calc(50%+8px)] bottom-0',
  middle: 'inset-y-0',
  passing: 'inset-y-0',
  end: 'top-0 h-1/2',
};

interface WorkbenchTreeRailProps {
  place: TreeRailPlace;
  color: string | undefined;
  left?: number;
}

export function WorkbenchTreeRail({ place, color, left = TREE_RAIL_X }: WorkbenchTreeRailProps) {
  const style = { backgroundColor: color ?? NEUTRAL_RAIL, left };
  return (
    <>
      <span aria-hidden className={`absolute ${RUNS[place]} w-0.5 opacity-70`} style={style} />
      {(place === 'middle' || place === 'end') && (
        <span aria-hidden className="absolute top-1/2 h-0.5 w-2.5 opacity-70" style={style} />
      )}
    </>
  );
}
