import type { FlowBox, FlowModel, FlowStep, FlowWait } from './flowModel';

export const FLOW_METRICS = {
  boxWidth: 236,
  minBoxWidth: 180,
  extraPicture: 56,
  boxHeight: 70,
  subStepLine: 16,
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
  items: Array<{ box: FlowBox; x: number }>;
}

const M = FLOW_METRICS;

const heightOf = (step: FlowStep) => M.boxHeight + (step.subSteps.length ? M.subStepLine : 0);

const widthFor = (boxWidth: number, width: number) => (step: FlowStep) =>
  step.pictures.length > 1
    ? Math.min(boxWidth + M.extraPicture, Math.max(boxWidth, width - M.lead - M.framePad))
    : boxWidth;
const gapBefore = (incoming: readonly FlowWait[] | undefined) =>
  incoming?.length ? M.waitRowGap : M.rowGap;

function rowsOf(
  boxes: readonly FlowBox[],
  width: number,
  widthOf: (step: FlowStep) => number,
  isStacked: boolean
): Row[] {
  const rows: Row[] = [];
  boxes.forEach((box, index) => {
    const row = rows[rows.length - 1];
    const last = row?.items[row.items.length - 1];
    const x = last
      ? last.x + widthOf(last.box.step) + (last.box.waitsAfter.length ? M.waitGap : M.columnGap)
      : 0;
    const fits = isStacked || x + widthOf(box.step) <= width;
    if (row && last && row.sectionIndex === box.sectionIndex && fits) {
      row.items.push({ box, x: isStacked ? M.lead : x });
      return;
    }
    rows.push({
      sectionIndex: box.sectionIndex,
      incoming: index > 0 ? boxes[index - 1].waitsAfter : [],
      items: [{ box, x: M.lead }],
    });
  });
  return rows;
}

export function flowLayout(model: FlowModel, width: number): FlowLayout {
  const boxWidth = Math.max(M.minBoxWidth, Math.min(M.boxWidth, width - M.lead - M.framePad));
  const widthOf = widthFor(boxWidth, width);
  const isStacked = M.lead + 2 * boxWidth + M.columnGap > width;
  const rows = rowsOf(model.boxes, width, widthOf, isStacked);
  const frames: FlowFrame[] = [];
  const steps: PlacedStep[] = [];
  const arrows: FlowArrow[] = [];
  const links: FlowLink[] = [];
  const seenSections = new Set<number>();
  const headerOf = (row: Row) => (model.sections[row.sectionIndex].numeral ? M.header : 0);

  const placeBox = (box: FlowBox, x: number, y: number): number => {
    const height = heightOf(box.step);
    steps.push({ step: box.step, x, y, width: widthOf(box.step), height, duringOf: undefined });
    if (!box.step.during.length) return y + height;
    let duringY = y + height + M.duringGap;
    links.push({ x: x + 28, y1: y + height, y2: duringY });
    for (const during of box.step.during) {
      const duringHeight = heightOf(during);
      steps.push({
        step: during,
        x,
        y: duringY,
        width: widthOf(during),
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
      row.items.forEach(({ box, x }, itemIndex) => {
        const boxBottom = placeBox(box, x, cursor);
        const centerX = x + boxWidth / 2;
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
      row.items.forEach(({ box, x }, itemIndex) => {
        bottom = Math.max(bottom, placeBox(box, x, top));
        const previous = row.items[itemIndex - 1];
        if (!previous) return;
        const x1 = previous.x + widthOf(previous.box.step) + 3;
        const x2 = x - 5;
        arrows.push({
          path: `M${x1} ${arrowY} H${x2}`,
          waits: previous.box.waitsAfter,
          labelX: (x1 + x2) / 2,
          labelY: arrowY,
          labelAnchor: 'middle',
        });
      });
      const last = row.items[row.items.length - 1];
      const lastRight = last.x + widthOf(last.box.step);
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
