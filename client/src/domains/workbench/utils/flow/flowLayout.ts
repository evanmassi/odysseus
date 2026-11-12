import type { FlowBox, FlowModel, FlowStep, FlowSubStep, FlowWait } from './flowModel';

export const FLOW_METRICS = {
  boxWidth: 236,
  minBoxWidth: 180,
  maxBoxWidth: 340,
  boxHeight: 70,
  actionRow: 60,
  subStepLine: 20,
  boxChrome: 14,
  columnGap: 30,
  waitGap: 120,
  stackGap: 26,
  stackWaitGap: 62,
  lead: 26,
  framePad: 10,
  header: 30,
  duringGap: 22,
  duringSpacing: 10,
  rowGap: 30,
  waitRowGap: 50,
  arrowY: 32,
  turnOut: 14,
} as const;

export interface PlacedStep {
  step: FlowStep;
  x: number;
  y: number;
  width: number;
  height: number;
  duringOf: string | undefined;
}

export interface FlowFrame {
  sectionIndex: number;
  isContinued: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FlowArrow {
  path: string;
  waits: FlowWait[];
  labelX: number;
  labelY: number;
  labelAnchor: 'middle' | 'start';
}

export interface FlowLink {
  x: number;
  y1: number;
  y2: number;
}

export interface FlowLayout {
  height: number;
  frames: FlowFrame[];
  steps: PlacedStep[];
  arrows: FlowArrow[];
  links: FlowLink[];
}

interface Row {
  sectionIndex: number;
  incoming: FlowWait[];
  items: FlowBox[];
}

const M = FLOW_METRICS;

const lineCount = (subSteps: readonly FlowSubStep[]): number =>
  subSteps.reduce((count, sub) => count + 1 + lineCount(sub.subSteps), 0);

const estimatedHeight = (step: FlowStep) =>
  M.boxHeight + (step.actions.length - 1) * M.actionRow + lineCount(step.subSteps) * M.subStepLine;
const gapAfter = (box: FlowBox) => (box.waitsAfter.length ? M.waitGap : M.columnGap);
const gapBefore = (incoming: readonly FlowWait[] | undefined) =>
  incoming?.length ? M.waitRowGap : M.rowGap;

function rowsOf(
  boxes: readonly FlowBox[],
  width: number,
  boxWidth: number,
  isStacked: boolean
): Row[] {
  const rows: Row[] = [];
  let x = 0;
  boxes.forEach((box, index) => {
    const row = rows[rows.length - 1];
    const last = row?.items[row.items.length - 1];
    if (row && last && row.sectionIndex === box.sectionIndex) {
      const nextX = x + boxWidth + gapAfter(last);
      if (isStacked || nextX + boxWidth <= width) {
        row.items.push(box);
        x = nextX;
        return;
      }
    }
    rows.push({
      sectionIndex: box.sectionIndex,
      incoming: index > 0 ? boxes[index - 1].waitsAfter : [],
      items: [box],
    });
    x = M.lead;
  });
  return rows;
}

function sharedBoxWidth(rows: readonly Row[], width: number, isStacked: boolean): number {
  const room = width - M.lead - M.framePad;
  const roomPerBox = (row: Row) =>
    (room - row.items.slice(0, -1).reduce((sum, box) => sum + gapAfter(box), 0)) / row.items.length;
  const widest = isStacked ? room : Math.min(...rows.map(roomPerBox));
  return Math.floor(Math.min(M.maxBoxWidth, widest));
}

export function flowLayout(
  model: FlowModel,
  width: number,
  contentHeights: ReadonlyMap<string, number>
): FlowLayout {
  const heightOf = (step: FlowStep) => {
    const measured = contentHeights.get(step.id);
    return measured === undefined ? estimatedHeight(step) : measured + M.boxChrome;
  };
  const baseWidth = Math.max(M.minBoxWidth, Math.min(M.boxWidth, width - M.lead - M.framePad));
  const isStacked = M.lead + 2 * baseWidth + M.columnGap > width;
  const rows = rowsOf(model.boxes, width, baseWidth, isStacked);
  const boxWidth = Math.max(baseWidth, sharedBoxWidth(rows, width, isStacked));
  const frames: FlowFrame[] = [];
  const steps: PlacedStep[] = [];
  const arrows: FlowArrow[] = [];
  const links: FlowLink[] = [];
  const seenSections = new Set<number>();
  const headerOf = (row: Row) => (model.sections[row.sectionIndex].numeral ? M.header : 0);

  const placeBox = (box: FlowBox, x: number, y: number, height = heightOf(box.step)): number => {
    steps.push({ step: box.step, x, y, width: boxWidth, height, duringOf: undefined });
    if (!box.step.during.length) return y + height;
    let duringY = y + height + M.duringGap;
    links.push({ x: x + 28, y1: y + height, y2: duringY });
    for (const during of box.step.during) {
      const duringHeight = heightOf(during);
      steps.push({
        step: during,
        x,
        y: duringY,
        width: boxWidth,
        height: duringHeight,
        duringOf: box.step.number,
      });
      duringY += duringHeight + M.duringSpacing;
    }
    return duringY - M.duringSpacing;
  };

  let y = 0;
  rows.forEach((row, rowIndex) => {
    const top = y + headerOf(row) + M.framePad;
    let bottom = top;
    let exit = { path: '', labelX: 0 };
    const returnAnchor = isStacked ? 'start' : 'middle';

    if (isStacked) {
      let cursor = top;
      row.items.forEach((box, itemIndex) => {
        const boxBottom = placeBox(box, M.lead, cursor);
        const centerX = M.lead + boxWidth / 2;
        bottom = boxBottom;
        exit = { path: `M${centerX} ${boxBottom + 3}`, labelX: M.lead - M.framePad };
        if (itemIndex === row.items.length - 1) return;
        const gap = box.waitsAfter.length ? M.stackWaitGap : M.stackGap;
        arrows.push({
          path: `M${centerX} ${boxBottom + 3} V${boxBottom + gap - 5}`,
          waits: box.waitsAfter,
          labelX: centerX,
          labelY: boxBottom + gap / 2 - 6,
          labelAnchor: 'middle',
        });
        cursor = boxBottom + gap;
      });
    } else {
      const arrowY = top + M.arrowY;
      const rowHeight = Math.max(...row.items.map(box => heightOf(box.step)));
      let x = M.lead;
      row.items.forEach((box, itemIndex) => {
        const previous = row.items[itemIndex - 1];
        if (previous) {
          const x1 = x - gapAfter(previous) + 3;
          const x2 = x - 5;
          arrows.push({
            path: `M${x1} ${arrowY} H${x2}`,
            waits: previous.waitsAfter,
            labelX: (x1 + x2) / 2,
            labelY: arrowY,
            labelAnchor: 'middle',
          });
        }
        bottom = Math.max(bottom, placeBox(box, x, top, rowHeight));
        x += boxWidth + gapAfter(box);
      });
      const lastRight = x - gapAfter(row.items[row.items.length - 1]);
      const turnX = Math.min(width + 6, lastRight + M.turnOut);
      exit = { path: `M${lastRight + 3} ${arrowY} H${turnX}`, labelX: (turnX + 6) / 2 };
    }

    frames.push({
      sectionIndex: row.sectionIndex,
      isContinued: seenSections.has(row.sectionIndex),
      x: M.lead - M.framePad,
      y,
      width: width - M.lead + M.framePad,
      height: bottom + M.framePad - y,
    });
    seenSections.add(row.sectionIndex);

    const next = rows[rowIndex + 1];
    if (next) {
      const gap = gapBefore(next.incoming);
      const midY = bottom + M.framePad + gap / 2;
      const nextArrowY = bottom + M.framePad + gap + headerOf(next) + M.framePad + M.arrowY;
      arrows.push({
        path: `${exit.path} V${midY} H6 V${nextArrowY} H${M.lead - M.framePad - 4}`,
        waits: next.incoming,
        labelX: exit.labelX,
        labelY: midY,
        labelAnchor: returnAnchor,
      });
    }
    y = bottom + M.framePad + gapBefore(next?.incoming);
  });

  return {
    height: Math.max(0, y - gapBefore(undefined)),
    frames,
    steps,
    arrows,
    links,
  };
}
