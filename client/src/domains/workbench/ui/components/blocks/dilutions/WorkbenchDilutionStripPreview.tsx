import type { DilutionPrep } from '../../../../utils/dilutions/dilutionPrep';

type ReadyPrep = Extract<DilutionPrep, { kind: 'ready' }>;

interface WorkbenchDilutionStripPreviewProps {
  prep: ReadyPrep;
  markerId: string;
  color: string | undefined;
}

const LEFT = 100;
const COLUMN = 78;
const RADIUS = 17;
const CENTER_Y = 34;
const SOURCE_RIGHT = 61;
const MONO = 'font-mono';
const MUTED = 'fill-muted-foreground';
const BRIGHT = 'fill-foreground';

export function WorkbenchDilutionStripPreview({
  prep,
  markerId,
  color,
}: WorkbenchDilutionStripPreviewProps) {
  const width = LEFT + prep.points.length * COLUMN;
  const height = prep.isUneven ? 104 : 90;
  const centerX = (index: number) => LEFT + COLUMN * index + COLUMN / 2;
  const below = (offset: number) => CENTER_Y + RADIUS + offset;
  const hasStockIssue = prep.stock.kind === 'ask' || prep.stock.kind === 'problem';

  const arrow = (from: number, to: number, volume: string, isStock: boolean) => (
    <>
      <line
        x1={from}
        y1={CENTER_Y}
        x2={to}
        y2={CENTER_Y}
        strokeWidth={1.2}
        strokeDasharray={isStock ? '4 3' : undefined}
        className={isStock ? 'stroke-muted-foreground' : 'stroke-primary/70'}
        markerEnd={`url(#${markerId}${isStock ? '-stock' : ''})`}
      />
      <text x={(from + to) / 2} y={CENTER_Y - 7} fontSize={10} className={`${MONO} ${MUTED}`}>
        {volume}
      </text>
    </>
  );

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      className="my-1.5 block h-auto max-w-full"
      textAnchor="middle"
      aria-label="How to make this series"
    >
      <defs>
        {['', '-stock'].map(suffix => (
          <marker
            key={suffix}
            id={`${markerId}${suffix}`}
            viewBox="0 0 10 10"
            refX={9}
            refY={5}
            markerWidth={7}
            markerHeight={7}
            orient="auto"
          >
            <path
              d="M0 0L10 5L0 10z"
              className={suffix ? 'fill-muted-foreground' : 'fill-primary/70'}
            />
          </marker>
        ))}
      </defs>
      <rect
        x={1}
        y={CENTER_Y - 17}
        width={58}
        height={34}
        fill="none"
        strokeDasharray="3 3"
        className={hasStockIssue ? 'stroke-warning-text' : 'stroke-foreground/35'}
      />
      <text x={30} y={CENTER_Y - 2} fontSize={10} className={`${MONO} ${BRIGHT}`}>
        {prep.stockShown ?? '?'}
      </text>
      <text x={30} y={CENTER_Y + 10} fontSize={9} className={`${MONO} ${MUTED}`}>
        stock
      </text>
      {['Final', `Working ${prep.strength}`, ...(prep.isUneven ? ['Replicates'] : [])].map(
        (label, index) => (
          <text
            key={label}
            x={0}
            y={below(17 + index * 14)}
            fontSize={10}
            textAnchor="start"
            className={MUTED}
          >
            {label}
          </text>
        )
      )}
      {prep.points.map((point, index) => {
        const x = centerX(index);
        const arrowEnd = x - RADIUS - 5;
        return (
          <g key={point.point}>
            {index
              ? arrow(centerX(index - 1) + RADIUS + 3, arrowEnd, prep.transferText, false)
              : arrow(SOURCE_RIGHT, arrowEnd, prep.stockText ?? '?', true)}
            {!index && prep.stockPipette && (
              <text
                x={(SOURCE_RIGHT + arrowEnd) / 2}
                y={CENTER_Y + 14}
                fontSize={9}
                className={`${MONO} ${MUTED}`}
              >
                {prep.stockPipette}
              </text>
            )}
            <rect
              x={x - RADIUS}
              y={CENTER_Y - RADIUS}
              width={RADIUS * 2}
              height={RADIUS * 2}
              className={color ? undefined : 'fill-primary/10 stroke-primary/55'}
              style={
                color
                  ? { fill: `color-mix(in srgb, ${color} 20%, transparent)`, stroke: color }
                  : undefined
              }
            />
            <text x={x} y={CENTER_Y + 1} fontSize={11} className={`${MONO} ${BRIGHT}`}>
              {point.volume}
            </text>
            <text x={x} y={CENTER_Y + 10} fontSize={7.5} className={`${MONO} ${MUTED}`}>
              µL
            </text>
            <text
              x={x}
              y={below(17)}
              fontSize={11}
              fontWeight={600}
              className={`${MONO} ${BRIGHT}`}
            >
              {point.final}
            </text>
            <text x={x} y={below(31)} fontSize={10} className={`${MONO} ${MUTED}`}>
              {point.working}
            </text>
            {prep.isUneven && (
              <text x={x} y={below(45)} fontSize={10} className={`${MONO} ${MUTED}`}>
                {point.wells}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
