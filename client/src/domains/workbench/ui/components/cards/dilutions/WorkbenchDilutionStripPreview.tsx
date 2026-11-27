import tubeInside from '../../../../assets/dilution-pictures/tube-inside.webp';
import tubeOutline from '../../../../assets/dilution-pictures/tube-outline.webp';
import vialInside from '../../../../assets/dilution-pictures/vial-inside.webp';
import vialOutline from '../../../../assets/dilution-pictures/vial-outline.webp';
import { dilutionArrowPoints, type Point } from '../../../../utils/dilutions/dilutionArrow';
import { seriesTint, tinted, WELL_EDGE_TINT } from '../../../../utils/plateMap/wellContents';
import {
  FINAL_CONCENTRATION,
  REPLICATES,
  TOP_POSITION,
  WORKING_CONCENTRATION,
} from '../../../../utils/terms/termList';

import type { DilutionPrep } from '../../../../utils/dilutions/dilutionPrep';

type ReadyPrep = Extract<DilutionPrep, { kind: 'ready' }>;

interface WorkbenchDilutionStripPreviewProps {
  prep: ReadyPrep;
  svgId: string;
  color: string | undefined;
}

interface Vessel {
  inside: string;
  outline: string;
  aspect: number;
  inner: readonly [left: number, top: number, right: number, bottom: number];
}

const TUBE: Vessel = {
  inside: tubeInside,
  outline: tubeOutline,
  aspect: 0.6278,
  inner: [0.5708, 0.3083, 0.8982, 0.9639],
};
const VIAL: Vessel = {
  inside: vialInside,
  outline: vialOutline,
  aspect: 0.55,
  inner: [0.0657, 0.225, 0.9343, 0.9639],
};

const TUBE_HEIGHT = 168;
const VIAL_HEIGHT = 140;
const TUBE_GAP = 98;
const BASE = 236;
const VIAL_X = 6;
const FIRST_TUBE_X = 116;
const ARC_ABOVE_TUBE = 30;
const MOUTH_DEPTH = 0.76;
const SURFACE_LINE = 3;
const FULLEST_LEVEL = 0.92;
const VIAL_LEVEL = 0.6;
const TUBE_TEXT_AT = 0.6;
const VIAL_TEXT_AT = 0.66;
const AMOUNT_FONT = 14;
const UNIT_FONT = 10;
const MONO_CHARACTER = 0.6;
const ROW_GAP = 15;
const FALLBACK_COLOR = 'hsl(var(--primary))';
const HALO = 'fill-foreground stroke-background font-mono font-bold';
const UNUSED_OPACITY = 0.4;

const widthOf = (vessel: Vessel, height: number) => height * vessel.aspect;

const centerOf = (vessel: Vessel, x: number, height: number) =>
  x + (widthOf(vessel, height) * (vessel.inner[0] + vessel.inner[2])) / 2;

const fittedFont = (text: string, room: number) =>
  Math.min(AMOUNT_FONT, room / (Math.max(text.length, 1) * MONO_CHARACTER));

function splitAmount(text: string): [amount: string, unit: string] {
  const match = /^(\S+)\s+(.+)$/.exec(text);
  return match ? [match[1], match[2]] : [text, ''];
}

const toPath = (points: readonly Point[]) =>
  points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

export function WorkbenchDilutionStripPreview({
  prep,
  svgId,
  color,
}: WorkbenchDilutionStripPreviewProps) {
  const seriesColor = color ?? FALLBACK_COLOR;
  const lastPoint = prep.points.length - 1;
  const tubeX = (index: number) => FIRST_TUBE_X + index * TUBE_GAP;
  const tubeWidth = widthOf(TUBE, TUBE_HEIGHT);
  const mouthY = BASE - TUBE_HEIGHT * MOUTH_DEPTH;
  const arcTop = BASE - TUBE_HEIGHT - ARC_ABOVE_TUBE;
  const vialTop = BASE - VIAL_HEIGHT;
  const vialCenter = VIAL_X + widthOf(VIAL, VIAL_HEIGHT) / 2;
  const hasStockIssue = prep.stock.kind === 'ask' || prep.stock.kind === 'problem';
  const rowsBelow = prep.isUneven ? 4 : 3;
  const missing = Math.max(0, (prep.platePoints ?? 0) - prep.points.length);
  const isUnused = (index: number) => prep.platePoints !== undefined && index >= prep.platePoints;
  const width = tubeX(prep.points.length + missing) + 10;
  const height = BASE + 20 + rowsBelow * ROW_GAP;
  const maskId = (vessel: 'tube' | 'vial', part: 'inside' | 'outline') =>
    `${svgId}-${vessel}-${part}`;

  const vessel = (
    shape: Vessel,
    kind: 'tube' | 'vial',
    x: number,
    vesselHeight: number,
    level: number,
    tint: number,
    outlineClass: string
  ) => {
    const vesselWidth = widthOf(shape, vesselHeight);
    const top = BASE - vesselHeight;
    const [, innerTop, , innerBottom] = shape.inner;
    const surface =
      vesselHeight * (1 - innerBottom) + (innerBottom - innerTop) * vesselHeight * level;
    return (
      <>
        <g mask={`url(#${maskId(kind, 'inside')})`}>
          <rect x={x} y={top} width={vesselWidth} height={vesselHeight} fill="none" />
          <rect
            x={x}
            y={BASE - surface}
            width={vesselWidth}
            height={surface}
            style={{ fill: tinted(seriesColor, tint) }}
          />
          <rect
            x={x}
            y={BASE - surface}
            width={vesselWidth}
            height={SURFACE_LINE}
            style={{ fill: tinted(seriesColor, WELL_EDGE_TINT) }}
          />
        </g>
        <rect
          x={x}
          y={top}
          width={vesselWidth}
          height={vesselHeight}
          mask={`url(#${maskId(kind, 'outline')})`}
          className={outlineClass}
        />
      </>
    );
  };

  const amountText = (text: string, centerX: number, y: number, room: number) => {
    const [amount, unit] = splitAmount(text);
    const size = fittedFont(amount, room);
    return (
      <text
        x={centerX}
        y={y}
        className={HALO}
        paintOrder="stroke"
        strokeWidth={4}
        strokeLinejoin="round"
      >
        <tspan fontSize={size}>{amount}</tspan>
        {unit && (
          <tspan x={centerX} dy={UNIT_FONT + 1} fontSize={Math.min(UNIT_FONT, size)}>
            {unit}
          </tspan>
        )}
      </text>
    );
  };

  const arrow = (from: Point, to: Point, volume: string) => (
    <>
      <polygon
        points={toPath(dilutionArrowPoints(from, to, arcTop))}
        strokeWidth={1}
        strokeLinejoin="round"
        className="fill-muted-foreground stroke-muted-foreground"
      />
      <text
        x={from[0] + (to[0] - from[0]) * 0.6}
        y={arcTop - 9}
        fontSize={13}
        className={HALO}
        paintOrder="stroke"
        strokeWidth={4}
        strokeLinejoin="round"
      >
        {volume}
      </text>
    </>
  );

  const tubeRoom = tubeWidth * (TUBE.inner[2] - TUBE.inner[0]) - 2;
  const vialRoom = widthOf(VIAL, VIAL_HEIGHT) * (VIAL.inner[2] - VIAL.inner[0]) - 2;
  const rowY = (row: number) => BASE + 20 + row * ROW_GAP;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      className="my-1.5 block h-auto max-w-full"
      textAnchor="middle"
      aria-label="How to make this series"
    >
      <defs>
        {(
          [
            ['tube', TUBE],
            ['vial', VIAL],
          ] as const
        ).flatMap(([kind, shape]) =>
          (['inside', 'outline'] as const).map(part => (
            <mask
              key={`${kind}-${part}`}
              id={maskId(kind, part)}
              maskUnits="objectBoundingBox"
              maskContentUnits="objectBoundingBox"
              style={{ maskType: 'alpha' }}
            >
              <image href={shape[part]} width={1} height={1} preserveAspectRatio="none" />
            </mask>
          ))
        )}
      </defs>
      {vessel(
        VIAL,
        'vial',
        VIAL_X,
        VIAL_HEIGHT,
        VIAL_LEVEL,
        seriesTint(0),
        hasStockIssue ? 'fill-warning-text' : 'fill-foreground'
      )}
      {amountText(
        prep.stockShown ?? '?',
        vialCenter,
        vialTop + VIAL_HEIGHT * VIAL_TEXT_AT,
        vialRoom
      )}
      <text x={vialCenter} y={rowY(0)} fontSize={11} className="fill-muted-foreground">
        Stock
      </text>
      {[
        FINAL_CONCENTRATION.word,
        `${WORKING_CONCENTRATION.word} (${prep.strength})`,
        ...(prep.isUneven ? [REPLICATES.word] : []),
      ].map((label, index) => (
        <text
          key={label}
          x={0}
          y={rowY(index + 1)}
          fontSize={11}
          textAnchor="start"
          className="fill-muted-foreground"
        >
          {label}
        </text>
      ))}
      {prep.points.map((point, index) => {
        const x = tubeX(index);
        const center = centerOf(TUBE, x, TUBE_HEIGHT);
        const tint = seriesTint(lastPoint ? index / lastPoint : 0);
        return (
          <g key={point.point} opacity={isUnused(index) ? UNUSED_OPACITY : undefined}>
            {isUnused(index) && <title>Not used on the plate</title>}
            {vessel(
              TUBE,
              'tube',
              x,
              TUBE_HEIGHT,
              point.level * FULLEST_LEVEL,
              tint,
              'fill-foreground'
            )}
            {amountText(
              `${point.volume} µL`,
              center,
              BASE - TUBE_HEIGHT + TUBE_HEIGHT * TUBE_TEXT_AT,
              tubeRoom
            )}
            <text x={center} y={rowY(0)} fontSize={11} className="fill-muted-foreground">
              {index ? point.point : TOP_POSITION}
            </text>
            <text
              x={center}
              y={rowY(1)}
              fontSize={13}
              fontWeight={600}
              className="fill-foreground font-mono"
            >
              {point.final}
            </text>
            <text x={center} y={rowY(2)} fontSize={11} className="fill-muted-foreground font-mono">
              {point.workingConc}
            </text>
            {prep.isUneven && (
              <text
                x={center}
                y={rowY(3)}
                fontSize={11}
                className="fill-muted-foreground font-mono"
              >
                {point.wells}
              </text>
            )}
          </g>
        );
      })}
      {Array.from({ length: missing }, (_, offset) => {
        const index = prep.points.length + offset;
        const x = tubeX(index);
        return (
          <g key={`missing-${index}`}>
            <title>Used on the plate, but no tube is made</title>
            {vessel(TUBE, 'tube', x, TUBE_HEIGHT, 0, 0, 'fill-warning-text')}
            <text
              x={centerOf(TUBE, x, TUBE_HEIGHT)}
              y={rowY(0)}
              fontSize={11}
              className="fill-warning-text"
            >
              {index + 1}
            </text>
          </g>
        );
      })}
      {prep.points.map((point, index) => {
        const to: Point = [centerOf(TUBE, tubeX(index), TUBE_HEIGHT) + 7, mouthY - 6];
        const from: Point = index
          ? [centerOf(TUBE, tubeX(index - 1), TUBE_HEIGHT) + 17, BASE - TUBE_HEIGHT - 2]
          : [vialCenter + 6, vialTop - 6];
        return (
          <g key={point.point}>
            {arrow(from, to, index ? prep.transferText : (prep.stockText ?? '?'))}
          </g>
        );
      })}
    </svg>
  );
}
