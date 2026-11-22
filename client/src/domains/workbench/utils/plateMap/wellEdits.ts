import {
  isFilledEntry,
  lineValueOf,
  moveValueKeys,
  normalizeMaterialKey,
  plateValueKey,
  type SampleEntry,
  type PlateLine,
  type PlateMapCard,
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

const isOnWells = (card: PlateMapCard, keys: readonly string[], line: PlateLine) =>
  keys.some(key => card.cells[key]?.[line.id]);

export function wellRows(card: PlateMapCard, keys: readonly string[]): WellRow[] {
  return card.lines
    .filter(line => isOnWells(card, keys, line))
    .map(line => {
      const cells = keys.map(key => card.cells[key]?.[line.id]);
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

export const startingLineId = (card: PlateMapCard, keys: readonly string[]): string | undefined =>
  wellRows(card, keys)[0]?.line?.id;

export const linesOffWells = (card: PlateMapCard, keys: readonly string[]): PlateLine[] =>
  card.lines.filter(line => line.name.trim() && !isOnWells(card, keys, line));

export function lineNamed(
  card: PlateMapCard,
  keys: readonly string[],
  name: string
): PlateLine | undefined {
  const key = normalizeMaterialKey(name);
  return key
    ? linesOffWells(card, keys).find(line => normalizeMaterialKey(line.name) === key)
    : undefined;
}

function valueOnLine(line: PlateLine, moved: PlateLine['values'][number]) {
  const found = line.values.find(value => plateValueKey(value.text) === plateValueKey(moved.text));
  if (found) return found;
  const created = { id: createId(), text: moved.text, color: moved.color };
  line.values.push(created);
  return created;
}

function subjectsOn(card: PlateMapCard, line: PlateLine): Set<string> {
  const texts = Object.values(card.cells).map(lines => lineValueOf(line, lines[line.id])?.text);
  return new Set(texts.filter(text => text !== undefined).map(normalizeMaterialKey));
}

function moveAmountNames(card: PlateMapCard, from: PlateLine, toId: string, moved: Set<string>) {
  const kept = subjectsOn(card, from);
  const prefix = `a:${from.id}:`;
  for (const key of Object.keys(card.amountNames)) {
    if (!key.startsWith(prefix)) continue;
    const rest = key.slice(prefix.length);
    const [subject] = rest.split('-');
    if (!moved.has(subject) || kept.has(subject)) continue;
    card.amountNames[`a:${toId}:${rest}`] ??= card.amountNames[key];
    delete card.amountNames[key];
  }
}

export function moveWellsToLine(
  card: PlateMapCard,
  keys: readonly string[],
  fromId: string,
  toId: string
): void {
  const from = card.lines.find(line => line.id === fromId);
  const to = card.lines.find(line => line.id === toId);
  if (!from || !to) return;
  const movedValues = new Map<string, string>();
  const movedSubjects = new Set<string>();
  for (const key of keys) {
    const lines = card.cells[key];
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
  const stillHeld = new Set(Object.values(card.cells).map(lines => lines[fromId]?.valueId));
  for (const [fromValueId, toValueId] of movedValues) {
    if (!stillHeld.has(fromValueId)) moveValueKeys(card, fromValueId, toValueId);
  }
  moveAmountNames(card, from, toId, movedSubjects);
}

function writeCells(
  card: PlateMapCard,
  keys: readonly string[],
  lineId: string,
  change: (entry: SampleEntry) => void
): void {
  for (const key of keys) {
    const lines = (card.cells[key] ??= {});
    const entry = { ...lines[lineId] };
    change(entry);
    const { unit } = entry;
    if (isFilledEntry(entry)) lines[lineId] = entry;
    else if (unit) lines[lineId] = { unit };
    else delete lines[lineId];
    if (!Object.keys(lines).length) delete card.cells[key];
  }
}

function lineFor(card: PlateMapCard, lineId: string | undefined): PlateLine {
  const existing = card.lines.find(line => line.id === lineId);
  if (existing) return existing;
  const created: PlateLine = { id: lineId ?? createId(), name: '', values: [], role: 'auto' };
  card.lines.push(created);
  return created;
}

const isHeldOnlyBy = (
  card: PlateMapCard,
  line: PlateLine,
  valueId: string,
  keys: readonly string[]
) =>
  Object.keys(card.cells).every(
    key => keys.includes(key) || card.cells[key][line.id]?.valueId !== valueId
  );

export function setWellsText(
  card: PlateMapCard,
  keys: readonly string[],
  lineId: string | undefined,
  text: string
): void {
  const line = lineFor(card, lineId);
  if (!text.trim()) {
    writeCells(card, keys, line.id, entry => delete entry.valueId);
    return;
  }
  const held = keys.map(key => lineValueOf(line, card.cells[key]?.[line.id]));
  const [first] = held;
  if (first && held.every(value => value === first) && isHeldOnlyBy(card, line, first.id, keys)) {
    first.text = text;
    return;
  }
  let value = line.values.find(candidate => plateValueKey(candidate.text) === plateValueKey(text));
  if (!value) {
    value = { id: createId(), text };
    line.values.push(value);
  }
  const valueId = value.id;
  writeCells(card, keys, line.id, entry => {
    entry.valueId = valueId;
  });
}

export function setWellsAmount(
  card: PlateMapCard,
  keys: readonly string[],
  lineId: string | undefined,
  amount: string
): void {
  writeCells(card, keys, lineFor(card, lineId).id, entry => {
    delete entry.seriesId;
    delete entry.seriesStep;
    if (amount.trim()) entry.amount = amount;
    else delete entry.amount;
  });
}

export function setWellsUnit(
  card: PlateMapCard,
  keys: readonly string[],
  lineId: string | undefined,
  unit: string
): void {
  writeCells(card, keys, lineFor(card, lineId).id, entry => {
    if (unit) entry.unit = unit;
    else delete entry.unit;
  });
}

export function removeLineFromWells(
  card: PlateMapCard,
  keys: readonly string[],
  lineId: string
): void {
  for (const key of keys) {
    const lines = card.cells[key];
    if (!lines) continue;
    delete lines[lineId];
    if (!Object.keys(lines).length) delete card.cells[key];
  }
}

export function recolorValue(card: PlateMapCard, valueId: string, color: string): void {
  const value = card.lines.flatMap(line => line.values).find(candidate => candidate.id === valueId);
  if (value) value.color = color;
}

export function renameLine(card: PlateMapCard, lineId: string, name: string): void {
  const line = card.lines.find(candidate => candidate.id === lineId);
  if (line) line.name = name.trim();
}

export function setRatioPartner(card: PlateMapCard, lineId: string, partnerId: string): void {
  const line = card.lines.find(candidate => candidate.id === lineId);
  if (!line) return;
  if (partnerId) line.ratioTo = partnerId;
  else delete line.ratioTo;
}

export function renameValue(card: PlateMapCard, valueId: string, text: string): void {
  const value = card.lines.flatMap(line => line.values).find(candidate => candidate.id === valueId);
  if (value && text.trim()) value.text = text.trim();
}

export interface HeldName {
  valueId: string;
  text: string;
}

export function heldNames(card: PlateMapCard, keys: readonly string[]): Map<string, HeldName> {
  const held = new Map<string, HeldName>();
  for (const row of wellRows(card, keys)) {
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
  card: PlateMapCard,
  lineId: string,
  valueId: string,
  keys: readonly string[]
): NameElsewhere | undefined {
  const value = card.lines
    .find(line => line.id === lineId)
    ?.values.find(candidate => candidate.id === valueId);
  const selected = new Set(keys);
  const outside = Object.entries(card.cells)
    .filter(([key, lines]) => !selected.has(key) && lines[lineId]?.valueId === valueId)
    .map(([key]) => key.match(VESSEL_OF_KEY)?.[0]);
  if (!value || !outside.length) return undefined;
  const labware = new Set(outside);
  const [onlyPlateId] = labware;
  return {
    text: value.text,
    wellCount: outside.length,
    labwareName:
      labware.size === 1 ? card.plates.find(plate => plate.id === onlyPlateId)?.name : undefined,
  };
}

export function toggleIndicatorPart(
  card: PlateMapCard,
  lineId: string,
  part: NonNullable<PlateLine['hiddenMarks']>[number]
): void {
  const line = card.lines.find(candidate => candidate.id === lineId);
  if (!line) return;
  const hidden = new Set(line.hiddenMarks);
  if (hidden.has(part)) hidden.delete(part);
  else hidden.add(part);
  if (hidden.size) line.hiddenMarks = [...hidden];
  else delete line.hiddenMarks;
}
