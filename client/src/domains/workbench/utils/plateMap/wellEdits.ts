import {
  isFilledEntry,
  lineValueOf,
  moveValueKeys,
  normalizeMaterialKey,
  plateValueKey,
  type SampleEntry,
  type PlateLine,
  type PlateMapBlock,
} from '@odysseus/shared-schemas';

import { createId } from '../ids/createId';

export interface WellRow {
  line: PlateLine | undefined;
  value: PlateLine['values'][number] | undefined;
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

const isOnWells = (block: PlateMapBlock, keys: readonly string[], line: PlateLine) =>
  keys.some(key => block.cells[key]?.[line.id]);

export function wellRows(block: PlateMapBlock, keys: readonly string[]): WellRow[] {
  return block.lines
    .filter(line => isOnWells(block, keys, line))
    .map(line => {
      const cells = keys.map(key => block.cells[key]?.[line.id]);
      const values = cells.map(entry => lineValueOf(line, entry));
      const text = sharedOf(values.map(value => value?.text ?? ''));
      const [firstValue] = values;
      const amount = sharedOf(cells.map(entry => entry?.amount ?? ''));
      return {
        line,
        value: firstValue && values.every(value => value === firstValue) ? firstValue : undefined,
        text: text.shared,
        isTextMixed: text.isMixed,
        amount: amount.shared,
        isAmountMixed: amount.isMixed,
        unit: sharedOf(cells.map(entry => entry?.unit ?? '')).shared,
        seriesId: cells.find(entry => entry?.seriesId !== undefined)?.seriesId,
      };
    });
}

export const startingLineId = (block: PlateMapBlock, keys: readonly string[]): string | undefined =>
  wellRows(block, keys)[0]?.line?.id;

export const linesOffWells = (block: PlateMapBlock, keys: readonly string[]): PlateLine[] =>
  block.lines.filter(line => line.name.trim() && !isOnWells(block, keys, line));

export function lineNamed(
  block: PlateMapBlock,
  keys: readonly string[],
  name: string
): PlateLine | undefined {
  const key = normalizeMaterialKey(name);
  return key
    ? linesOffWells(block, keys).find(line => normalizeMaterialKey(line.name) === key)
    : undefined;
}

function valueOnLine(line: PlateLine, moved: PlateLine['values'][number]) {
  const found = line.values.find(value => plateValueKey(value.text) === plateValueKey(moved.text));
  if (found) return found;
  const created = { id: createId(), text: moved.text, color: moved.color };
  line.values.push(created);
  return created;
}

function subjectsOn(block: PlateMapBlock, line: PlateLine): Set<string> {
  const texts = Object.values(block.cells).map(lines => lineValueOf(line, lines[line.id])?.text);
  return new Set(texts.filter(text => text !== undefined).map(normalizeMaterialKey));
}

function moveAmountNames(block: PlateMapBlock, from: PlateLine, toId: string, moved: Set<string>) {
  const kept = subjectsOn(block, from);
  const prefix = `a:${from.id}:`;
  for (const key of Object.keys(block.amountNames)) {
    if (!key.startsWith(prefix)) continue;
    const rest = key.slice(prefix.length);
    const [subject] = rest.split('-');
    if (!moved.has(subject) || kept.has(subject)) continue;
    block.amountNames[`a:${toId}:${rest}`] ??= block.amountNames[key];
    delete block.amountNames[key];
  }
}

export function moveWellsToLine(
  block: PlateMapBlock,
  keys: readonly string[],
  fromId: string,
  toId: string
): void {
  const from = block.lines.find(line => line.id === fromId);
  const to = block.lines.find(line => line.id === toId);
  if (!from || !to) return;
  const movedValues = new Map<string, string>();
  const movedSubjects = new Set<string>();
  for (const key of keys) {
    const lines = block.cells[key];
    const entry = lines?.[fromId];
    if (!lines || !entry) continue;
    const value = lineValueOf(from, entry);
    const target = value && valueOnLine(to, value);
    if (value && target) {
      movedValues.set(value.id, target.id);
      movedSubjects.add(normalizeMaterialKey(value.text));
    }
    lines[toId] = target ? { ...entry, valueId: target.id } : entry;
    delete lines[fromId];
  }
  const stillHeld = new Set(Object.values(block.cells).map(lines => lines[fromId]?.valueId));
  for (const [fromValueId, toValueId] of movedValues) {
    if (!stillHeld.has(fromValueId)) moveValueKeys(block, fromValueId, toValueId);
  }
  moveAmountNames(block, from, toId, movedSubjects);
}

function writeCells(
  block: PlateMapBlock,
  keys: readonly string[],
  lineId: string,
  change: (entry: SampleEntry) => void
): void {
  for (const key of keys) {
    const lines = (block.cells[key] ??= {});
    const entry = { ...lines[lineId] };
    change(entry);
    const { unit } = entry;
    if (isFilledEntry(entry)) lines[lineId] = entry;
    else if (unit) lines[lineId] = { unit };
    else delete lines[lineId];
    if (!Object.keys(lines).length) delete block.cells[key];
  }
}

function lineFor(block: PlateMapBlock, lineId: string | undefined): PlateLine {
  const existing = block.lines.find(line => line.id === lineId);
  if (existing) return existing;
  const created: PlateLine = { id: lineId ?? createId(), name: '', values: [], role: 'auto' };
  block.lines.push(created);
  return created;
}

const isHeldOnlyBy = (
  block: PlateMapBlock,
  line: PlateLine,
  valueId: string,
  keys: readonly string[]
) =>
  Object.keys(block.cells).every(
    key => keys.includes(key) || block.cells[key][line.id]?.valueId !== valueId
  );

export function setWellsText(
  block: PlateMapBlock,
  keys: readonly string[],
  lineId: string | undefined,
  text: string
): void {
  const line = lineFor(block, lineId);
  if (!text.trim()) {
    writeCells(block, keys, line.id, entry => delete entry.valueId);
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
  writeCells(block, keys, line.id, entry => {
    entry.valueId = valueId;
  });
}

export function setWellsAmount(
  block: PlateMapBlock,
  keys: readonly string[],
  lineId: string | undefined,
  amount: string
): void {
  writeCells(block, keys, lineFor(block, lineId).id, entry => {
    delete entry.seriesId;
    delete entry.seriesStep;
    if (amount.trim()) entry.amount = amount;
    else delete entry.amount;
  });
}

export function setWellsUnit(
  block: PlateMapBlock,
  keys: readonly string[],
  lineId: string | undefined,
  unit: string
): void {
  writeCells(block, keys, lineFor(block, lineId).id, entry => {
    if (unit) entry.unit = unit;
    else delete entry.unit;
  });
}

export function removeLineFromWells(
  block: PlateMapBlock,
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

export function recolorValue(block: PlateMapBlock, valueId: string, color: string): void {
  const value = block.lines
    .flatMap(line => line.values)
    .find(candidate => candidate.id === valueId);
  if (value) value.color = color;
}

export function renameLine(block: PlateMapBlock, lineId: string, name: string): void {
  const line = block.lines.find(candidate => candidate.id === lineId);
  if (line) line.name = name.trim();
}

export function setRatioPartner(block: PlateMapBlock, lineId: string, partnerId: string): void {
  const line = block.lines.find(candidate => candidate.id === lineId);
  if (!line) return;
  if (partnerId) line.ratioTo = partnerId;
  else delete line.ratioTo;
}

export function renameValue(block: PlateMapBlock, valueId: string, text: string): void {
  const value = block.lines
    .flatMap(line => line.values)
    .find(candidate => candidate.id === valueId);
  if (value && text.trim()) value.text = text.trim();
}

export interface HeldName {
  valueId: string;
  text: string;
}

export function heldNames(block: PlateMapBlock, keys: readonly string[]): Map<string, HeldName> {
  const held = new Map<string, HeldName>();
  for (const row of wellRows(block, keys)) {
    if (row.line && row.value)
      held.set(row.line.id, { valueId: row.value.id, text: row.value.text });
  }
  return held;
}

export interface NameElsewhere {
  text: string;
  wellCount: number;
  labwareName: string | undefined;
}

const VESSEL_OF_KEY = /^[^:#]+/;

export function nameElsewhere(
  block: PlateMapBlock,
  lineId: string,
  valueId: string,
  keys: readonly string[]
): NameElsewhere | undefined {
  const value = block.lines
    .find(line => line.id === lineId)
    ?.values.find(candidate => candidate.id === valueId);
  const selected = new Set(keys);
  const outside = Object.entries(block.cells)
    .filter(([key, lines]) => !selected.has(key) && lines[lineId]?.valueId === valueId)
    .map(([key]) => key.match(VESSEL_OF_KEY)?.[0]);
  if (!value || !outside.length) return undefined;
  const labware = new Set(outside);
  const [onlyPlateId] = labware;
  return {
    text: value.text,
    wellCount: outside.length,
    labwareName:
      labware.size === 1 ? block.plates.find(plate => plate.id === onlyPlateId)?.name : undefined,
  };
}

export function toggleIndicatorPart(
  block: PlateMapBlock,
  lineId: string,
  part: NonNullable<PlateLine['hiddenMarks']>[number]
): void {
  const line = block.lines.find(candidate => candidate.id === lineId);
  if (!line) return;
  const hidden = new Set(line.hiddenMarks);
  if (hidden.has(part)) hidden.delete(part);
  else hidden.add(part);
  if (hidden.size) line.hiddenMarks = [...hidden];
  else delete line.hiddenMarks;
}
