import type { BandCluster, BandPlace, PlateBand } from './plateLayers';
import type { WellSize } from './vesselSizing';

export interface PlateGeometry {
  leftPad: number;
  topPad: number;
  edgePad: number;
  headerWidth: number;
  headerHeight: number;
  cellWidth: number;
  cellHeight: number;
  rows: number;
  cols: number;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Span {
  band: PlateBand;
  cluster: BandCluster;
  from: number;
  to: number;
}

interface Bracket extends Span {
  lane: number;
}

export interface BandShapes {
  areas: Array<{ fill: string; edge: string; color: string }>;
  rings: Array<Box & { color: string }>;
  tags: Array<{ x: number; y: number; width: number; text: string; color: string }>;
  wellTags: Array<{ x: number; y: number; text: string; color: string }>;
  topBrackets: Array<{ path: string; x: number; y: number; text: string; color: string }>;
  leftBrackets: Array<{ path: string; x: number; y: number; text: string; color: string }>;
}

const GAP = 4;
const HALF_GAP = GAP / 2;
const LANE = 16;
const OUTLINE_ROOM = HALF_GAP + 2;
const HEADER_WIDTH = 16;
const HEADER_HEIGHT = 14;
const TAG_CHARACTER_WIDTH = 6.2;
const TAG_PADDING = 12;

const LABEL_CHARACTER_WIDTH = 6.5;
const WELL_TAG_CHARACTER_WIDTH = 5.4;
const WELL_TAG_INSET = 3;
const MOST_LANES_PER_SIDE = 2;

function fitLabel(text: string, room: number, characterWidth = LABEL_CHARACTER_WIDTH): string {
  const fits = Math.max(1, Math.floor(room / characterWidth));
  return text.length <= fits ? text : `${text.slice(0, Math.max(1, fits - 1)).trimEnd()}…`;
}

const overlaps = (a: Span, b: Span) => a.from <= b.to && b.from <= a.to;

function assignLanes(spans: Span[]): { lanes: number; brackets: Bracket[]; overflow: Span[] } {
  const lanes: Span[][] = [];
  const brackets: Bracket[] = [];
  const overflow: Span[] = [];
  const biggestFirst = [...spans].sort(
    (a, b) => b.to - b.from - (a.to - a.from) || a.from - b.from
  );
  for (const span of biggestFirst) {
    const free = lanes.findIndex(lane => !lane.some(taken => overlaps(taken, span)));
    const lane = free >= 0 ? free : lanes.length < MOST_LANES_PER_SIDE ? lanes.length : -1;
    if (lane < 0) {
      overflow.push(span);
      continue;
    }
    lanes[lane] = [...(lanes[lane] ?? []), span];
    brackets.push({ ...span, lane });
  }
  return { lanes: lanes.length, brackets, overflow };
}

function bracketsOf(bands: readonly PlateBand[]) {
  const spansAt = (place: 'top' | 'left') =>
    bands
      .filter(band => band.showsBracket)
      .flatMap(band =>
        band.clusters
          .filter(cluster => cluster.place === place)
          .map(cluster =>
            place === 'top'
              ? { band, cluster, from: cluster.left, to: cluster.right }
              : { band, cluster, from: cluster.top, to: cluster.bottom }
          )
      );
  const top = assignLanes(spansAt('top'));
  const left = assignLanes(spansAt('left'));
  const crowdedOut = new Set([...top.overflow, ...left.overflow].map(span => span.cluster));
  return { top, left, crowdedOut };
}

const lanePad = (lanes: number) => (lanes ? lanes * LANE + HALF_GAP : 0);

export function bandWidthPad(bands: readonly PlateBand[]): number {
  return lanePad(bracketsOf(bands).left.lanes) + (bands.length ? OUTLINE_ROOM : 0);
}

export function plateGeometry(
  size: WellSize,
  rows: number,
  cols: number,
  bands: readonly PlateBand[]
): PlateGeometry {
  const { top, left } = bracketsOf(bands);
  return {
    leftPad: lanePad(left.lanes),
    topPad: lanePad(top.lanes),
    edgePad: bands.length ? OUTLINE_ROOM : 0,
    headerWidth: HEADER_WIDTH,
    headerHeight: HEADER_HEIGHT,
    cellWidth: size.width,
    cellHeight: size.height,
    rows,
    cols,
  };
}

export const plateWidth = (geometry: PlateGeometry) =>
  geometry.leftPad +
  geometry.headerWidth +
  geometry.cols * (geometry.cellWidth + GAP) +
  geometry.edgePad;

export const plateHeight = (geometry: PlateGeometry) =>
  geometry.topPad +
  geometry.headerHeight +
  geometry.rows * (geometry.cellHeight + GAP) +
  geometry.edgePad;

const cellLeft = (geometry: PlateGeometry, col: number) =>
  geometry.leftPad + geometry.headerWidth + GAP + col * (geometry.cellWidth + GAP);

const cellTop = (geometry: PlateGeometry, row: number) =>
  geometry.topPad + geometry.headerHeight + GAP + row * (geometry.cellHeight + GAP);

function clusterOutline(cluster: BandCluster, geometry: PlateGeometry) {
  const inside = new Set(cluster.cells.map(({ row, col }) => `${row},${col}`));
  let fill = '';
  let edge = '';
  for (const { row, col } of cluster.cells) {
    const box = cellBox(geometry, row, col);
    fill += `M${box.x} ${box.y}h${box.width}v${box.height}h${-box.width}Z`;
    if (!inside.has(`${row - 1},${col}`)) edge += `M${box.x} ${box.y}h${box.width}`;
    if (!inside.has(`${row + 1},${col}`)) edge += `M${box.x} ${box.y + box.height}h${box.width}`;
    if (!inside.has(`${row},${col - 1}`)) edge += `M${box.x} ${box.y}v${box.height}`;
    if (!inside.has(`${row},${col + 1}`)) edge += `M${box.x + box.width} ${box.y}v${box.height}`;
  }
  return { fill, edge };
}

const cellBox = (geometry: PlateGeometry, row: number, col: number): Box => ({
  x: cellLeft(geometry, col) - HALF_GAP,
  y: cellTop(geometry, row) - HALF_GAP,
  width: geometry.cellWidth + GAP,
  height: geometry.cellHeight + GAP,
});

export function bandShapes(bands: readonly PlateBand[], geometry: PlateGeometry): BandShapes {
  const shapes: BandShapes = {
    areas: [],
    rings: [],
    tags: [],
    wellTags: [],
    topBrackets: [],
    leftBrackets: [],
  };
  const { top, left, crowdedOut } = bracketsOf(bands);
  for (const band of bands) {
    for (const cluster of band.clusters) {
      const isRingForText = cluster.place === 'ring' && band.kind === 'fill';
      const place: BandPlace = crowdedOut.has(cluster) || isRingForText ? 'tag' : cluster.place;
      if (place === 'well') {
        for (const { row, col } of cluster.cells) {
          shapes.wellTags.push({
            x: cellLeft(geometry, col) + WELL_TAG_INSET,
            y: cellTop(geometry, row) + geometry.cellHeight - WELL_TAG_INSET,
            text: fitLabel(
              band.label || band.text,
              geometry.cellWidth - WELL_TAG_INSET * 2,
              WELL_TAG_CHARACTER_WIDTH
            ),
            color: band.color,
          });
        }
        continue;
      }
      if (place === 'ring') {
        if (band.kind === 'stripe') continue;
        for (const { row, col } of cluster.cells) {
          shapes.rings.push({
            x: cellLeft(geometry, col) + 1,
            y: cellTop(geometry, row) + 1,
            width: geometry.cellWidth - 2,
            height: geometry.cellHeight - 2,
            color: band.color,
          });
        }
        continue;
      }
      if (band.showsOutline)
        shapes.areas.push({ ...clusterOutline(cluster, geometry), color: band.color });
      if (place === 'tag') {
        const firstCol = Math.min(
          ...cluster.cells.filter(cell => cell.row === cluster.top).map(cell => cell.col)
        );
        const box = cellBox(geometry, cluster.top, firstCol);
        shapes.tags.push({
          x: box.x,
          y: box.y,
          width: band.text.length * TAG_CHARACTER_WIDTH + TAG_PADDING,
          text: band.text,
          color: band.color,
        });
      }
    }
  }

  for (const { band, from, to, lane } of top.brackets) {
    const y = (top.lanes - lane - 1) * LANE + 12;
    const x1 = cellLeft(geometry, from) + HALF_GAP;
    const x2 = cellLeft(geometry, to) + geometry.cellWidth - HALF_GAP;
    shapes.topBrackets.push({
      path: `M${x1} ${y + 4}v-4H${x2}v4`,
      x: (x1 + x2) / 2,
      y: y - 2,
      text: fitLabel(band.text, x2 - x1),
      color: band.color,
    });
  }
  for (const { band, from, to, lane } of left.brackets) {
    const x = (left.lanes - lane - 1) * LANE + 12;
    const y1 = cellTop(geometry, from) + HALF_GAP;
    const y2 = cellTop(geometry, to) + geometry.cellHeight - HALF_GAP;
    shapes.leftBrackets.push({
      path: `M${x + 4} ${y1}h-4V${y2}h4`,
      x: x - 3,
      y: (y1 + y2) / 2,
      text: fitLabel(band.text, y2 - y1),
      color: band.color,
    });
  }
  return shapes;
}
