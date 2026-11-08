import {
  isFilledCell,
  lineValueOf,
  plateValueKey,
  type CellLine,
  type PlateLine,
  type VesselMapBlock,
} from '@odysseus/shared-schemas';

import { createId } from '../ids/createId';

export interface WellRow {
  line: PlateLine | undefined;
  text: string;
  isTextMixed: boolean;
  amount: string;
  isAmountMixed: boolean;
  unit: string;
  seriesId: string | undefined;
}

const sharedOf = (texts: readonly string[]) => {
  const distinct = new Set(texts);
  return { shared: distinct.size === 1 ? [...distinct][0] : '', isMixed: distinct.size > 1 };
};

export function wellRows(
  block: VesselMapBlock,
  keys: readonly string[],
  colorLine: PlateLine | undefined
): WellRow[] {
  const onWells = block.lines.filter(line => keys.some(key => block.cells[key]?.[line.id]));
  const lines = onWells.length ? onWells : [colorLine ?? block.lines[0]];
  return lines.map(line => {
    const cells = keys.map(key => (line ? block.cells[key]?.[line.id] : undefined));
    const text = sharedOf(cells.map(cell => (line && lineValueOf(line, cell)?.text) ?? ''));
    const amount = sharedOf(cells.map(cell => cell?.amount ?? ''));
    return {
      line,
      text: text.shared,
      isTextMixed: text.isMixed,
      amount: amount.shared,
      isAmountMixed: amount.isMixed,
      unit: sharedOf(cells.map(cell => cell?.unit ?? '')).shared,
      seriesId: cells.find(cell => cell?.seriesId !== undefined)?.seriesId,
    };
  });
}

function writeCells(
  block: VesselMapBlock,
  keys: readonly string[],
  lineId: string,
  change: (cell: CellLine) => void
): void {
  for (const key of keys) {
    const lines = (block.cells[key] ??= {});
    const cell = { ...lines[lineId] };
    change(cell);
    const { unit } = cell;
    if (isFilledCell(cell)) lines[lineId] = cell;
    else if (unit) lines[lineId] = { unit };
    else delete lines[lineId];
    if (!Object.keys(lines).length) delete block.cells[key];
  }
}

function lineFor(block: VesselMapBlock, lineId: string | undefined): PlateLine {
  const existing = block.lines.find(line => line.id === lineId);
  if (existing) return existing;
  const created: PlateLine = { id: createId(), name: '', values: [], role: 'auto' };
  block.lines.push(created);
  return created;
}

const isHeldOnlyBy = (
  block: VesselMapBlock,
  line: PlateLine,
  valueId: string,
  keys: readonly string[]
) =>
  Object.keys(block.cells).every(
    key => keys.includes(key) || block.cells[key][line.id]?.valueId !== valueId
  );

export function setWellsText(
  block: VesselMapBlock,
  keys: readonly string[],
  lineId: string | undefined,
  text: string
): void {
  const line = lineFor(block, lineId);
  if (!text.trim()) {
    writeCells(block, keys, line.id, cell => delete cell.valueId);
    return;
  }
  const held = keys.map(key => lineValueOf(line, block.cells[key]?.[line.id]));
  const [first] = held;
  if (first && held.every(value => value === first) && isHeldOnlyBy(block, line, first.id, keys)) {
    first.text = text;
    return;
  }
  let value = line.values.find(candidate => plateValueKey(candidate.text) === plateValueKey(text));
  if (!value) {
    value = { id: createId(), text };
    line.values.push(value);
  }
  const valueId = value.id;
  writeCells(block, keys, line.id, cell => {
    cell.valueId = valueId;
  });
}

export function setWellsAmount(
  block: VesselMapBlock,
  keys: readonly string[],
  lineId: string | undefined,
  amount: string
): void {
  writeCells(block, keys, lineFor(block, lineId).id, cell => {
    delete cell.seriesId;
    delete cell.seriesStep;
    if (amount.trim()) cell.amount = amount;
    else delete cell.amount;
  });
}

export function setWellsUnit(
  block: VesselMapBlock,
  keys: readonly string[],
  lineId: string | undefined,
  unit: string
): void {
  writeCells(block, keys, lineFor(block, lineId).id, cell => {
    if (unit) cell.unit = unit;
    else delete cell.unit;
  });
}

export function removeLineFromWells(
  block: VesselMapBlock,
  keys: readonly string[],
  lineId: string
): void {
  for (const key of keys) {
    const lines = block.cells[key];
    if (!lines) continue;
    delete lines[lineId];
    if (!Object.keys(lines).length) delete block.cells[key];
  }
}
