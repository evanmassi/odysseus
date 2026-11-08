import type { DoseHeaders, PlateBand } from './plateLayers';
import type { WellSize } from './vesselSizing';

export interface PlateGeometry {
  leftPad: number;
  topPad: number;
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

interface Bracket {
  band: PlateBand;
  from: number;
  to: number;
  lane: number;
}

export interface BandShapes {
  areas: Array<{ fill: string; edge: string; color: string }>;
  rings: Array<Box & { color: string }>;
  tags: Array<{ x: number; y: number; width: number; text: string; color: string }>;
  topBrackets: Array<{ path: string; x: number; y: number; text: string; color: string }>;
  leftBrackets: Array<{ path: string; x: number; y: number; text: string; color: string }>;
}

const GAP = 4;
const HALF_GAP = GAP / 2;
const LANE = 16;
const PLAIN_HEADER_WIDTH = 16;
const DOSED_HEADER_WIDTH = 44;
const PLAIN_HEADER_HEIGHT = 14;
const DOSED_HEADER_HEIGHT = 28;
const TAG_CHARACTER_WIDTH = 6.2;
const TAG_PADDING = 12;

function assignLanes(spans: Array<Omit<Bracket, 'lane'>>): { lanes: number; brackets: Bracket[] } {
  const laneEnds: number[] = [];
  const brackets = [...spans]
    .sort((a, b) => a.from - b.from)
    .map(span => {
      const free = laneEnds.findIndex(end => end < span.from);
      const lane = free < 0 ? laneEnds.length : free;
      laneEnds[lane] = span.to;
      return { ...span, lane };
    });
  return { lanes: laneEnds.length, brackets };
}

function bracketsOf(bands: readonly PlateBand[]) {
  const spansAt = (place: 'top' | 'left') =>
    bands.flatMap(band =>
      band.clusters
        .filter(cluster => cluster.place === place)
        .map(cluster =>
          place === 'top'
            ? { band, from: cluster.left, to: cluster.right }
            : { band, from: cluster.top, to: cluster.bottom }
        )
    );
  return { top: assignLanes(spansAt('top')), left: assignLanes(spansAt('left')) };
}

export function plateGeometry(
  size: WellSize,
  rows: number,
  cols: number,
  headers: DoseHeaders | undefined,
  bands: readonly PlateBand[]
): PlateGeometry {
  const { top, left } = bracketsOf(bands);
  return {
    leftPad: left.lanes ? left.lanes * LANE + HALF_GAP : 0,
    topPad: top.lanes ? top.lanes * LANE + HALF_GAP : 0,
    headerWidth: headers?.axis === 'row' ? DOSED_HEADER_WIDTH : PLAIN_HEADER_WIDTH,
    headerHeight: headers?.axis === 'col' ? DOSED_HEADER_HEIGHT : PLAIN_HEADER_HEIGHT,
    cellWidth: size.width,
    cellHeight: size.height,
    rows,
    cols,
  };
}

export const plateWidth = (geometry: PlateGeometry) =>
  geometry.leftPad + geometry.headerWidth + geometry.cols * (geometry.cellWidth + GAP);

export const plateHeight = (geometry: PlateGeometry) =>
  geometry.topPad + geometry.headerHeight + geometry.rows * (geometry.cellHeight + GAP);

const cellLeft = (geometry: PlateGeometry, col: number) =>
  geometry.leftPad + geometry.headerWidth + GAP + col * (geometry.cellWidth + GAP);

const cellTop = (geometry: PlateGeometry, row: number) =>
  geometry.topPad + geometry.headerHeight + GAP + row * (geometry.cellHeight + GAP);

const cellBox = (geometry: PlateGeometry, row: number, col: number): Box => ({
  x: cellLeft(geometry, col) - HALF_GAP,
  y: cellTop(geometry, row) - HALF_GAP,
  width: geometry.cellWidth + GAP,
  height: geometry.cellHeight + GAP,
});

export function bandShapes(bands: readonly PlateBand[], geometry: PlateGeometry): BandShapes {
  const shapes: BandShapes = { areas: [], rings: [], tags: [], topBrackets: [], leftBrackets: [] };
  for (const band of bands) {
    for (const cluster of band.clusters) {
      if (cluster.place === 'ring') {
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
      const inside = new Set(cluster.cells.map(({ row, col }) => `${row},${col}`));
      let fill = '';
      let edge = '';
      for (const { row, col } of cluster.cells) {
        const box = cellBox(geometry, row, col);
        fill += `M${box.x} ${box.y}h${box.width}v${box.height}h${-box.width}Z`;
        if (!inside.has(`${row - 1},${col}`)) edge += `M${box.x} ${box.y}h${box.width}`;
        if (!inside.has(`${row + 1},${col}`))
          edge += `M${box.x} ${box.y + box.height}h${box.width}`;
        if (!inside.has(`${row},${col - 1}`)) edge += `M${box.x} ${box.y}v${box.height}`;
        if (!inside.has(`${row},${col + 1}`))
          edge += `M${box.x + box.width} ${box.y}v${box.height}`;
      }
      shapes.areas.push({ fill, edge, color: band.color });
      if (cluster.place === 'tag') {
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
  const { top, left } = bracketsOf(bands);
  for (const { band, from, to, lane } of top.brackets) {
    const y = (top.lanes - lane - 1) * LANE + 12;
    const x1 = cellLeft(geometry, from) + HALF_GAP;
    const x2 = cellLeft(geometry, to) + geometry.cellWidth - HALF_GAP;
    shapes.topBrackets.push({
      path: `M${x1} ${y + 4}v-4H${x2}v4`,
      x: (x1 + x2) / 2,
      y: y - 2,
      text: band.text,
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
      text: band.text,
      color: band.color,
    });
  }
  return shapes;
}
