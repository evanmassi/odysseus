import { normalizeMaterialKey } from './materialKey';

import type { SampleEntry, PlateLine, PlateMap } from './protocolFileSchemas';

type LineValue = PlateLine['values'][number];

const VALUE_COLORS = [
  '#6fa8e8',
  '#5cc8bd',
  '#b48ee6',
  '#e88fbf',
  '#8b9cf0',
  '#b8d36a',
  '#e8875a',
  '#8fd3e8',
] as const;
const BAND_COLORS = [
  '#f0b35b',
  '#e8875a',
  '#6fbf73',
  '#c9ccd3',
  '#e07a8f',
  '#e3d36b',
  '#b8875a',
  '#8fdcb0',
] as const;
const NEUTRAL_VALUE_COLOR = '#7d8494';
const NEUTRAL_VALUE = /^(?:no|none|vehicle|media|medium|untreated|unstim\w*|blank|empty|mock)\b/i;

export const plateValueKey = (text: string) => text.trim().toLowerCase();

export const isFilledEntry = (cell: SampleEntry | undefined): cell is SampleEntry =>
  !!cell && (!!cell.valueId || !!cell.amount?.trim() || cell.seriesId !== undefined);

export const lineValueOf = (
  line: PlateLine,
  cell: SampleEntry | undefined
): LineValue | undefined =>
  cell?.valueId ? line.values.find(value => value.id === cell.valueId) : undefined;

const cellsOn = (plateMap: PlateMap, line: PlateLine) =>
  Object.values(plateMap.samples).map(lines => lines[line.id]);

const hasSeries = (plateMap: PlateMap, line: PlateLine) =>
  cellsOn(plateMap, line).some(cell => cell?.seriesId !== undefined);

function varies(plateMap: PlateMap, line: PlateLine): boolean {
  if (hasSeries(plateMap, line)) return true;
  const cells = cellsOn(plateMap, line).filter(isFilledEntry);
  const texts = new Set(
    cells.map(
      cell =>
        `${plateValueKey(lineValueOf(line, cell)?.text ?? '')}|${cell.amount?.trim() ?? ''}|${cell.unit ?? ''}`
    )
  );
  return texts.size > 1;
}

export const colorLineOf = (plateMap: PlateMap): PlateLine | undefined =>
  plateMap.lines.find(line => line.role === 'fill') ??
  plateMap.lines.find(line => line.role === 'auto' && hasSeries(plateMap, line)) ??
  plateMap.lines.find(line => line.role === 'auto' && varies(plateMap, line));

function renameKeys(map: Record<string, string>, rename: (key: string) => string) {
  for (const key of Object.keys(map)) {
    const renamed = rename(key);
    if (renamed === key) continue;
    map[renamed] ??= map[key];
    delete map[key];
  }
}

const AMOUNT_KEY_LEAD = 'a:';
const AMOUNT_KEY_FIRST_VALUE_PART = 3;

export const amountLinePrefix = (lineId: string): string => `${AMOUNT_KEY_LEAD}${lineId}:`;

export function moveValueKeys(plateMap: PlateMap, fromId: string, toId: string): void {
  renameKeys(plateMap.counts, key => (key === fromId ? toId : key));
  renameKeys(plateMap.amountNames, key =>
    key.startsWith(AMOUNT_KEY_LEAD)
      ? key
          .split(':')
          .map((part, index) =>
            index >= AMOUNT_KEY_FIRST_VALUE_PART && part === fromId ? toId : part
          )
          .join(':')
      : key
  );
}

function mergeValueInto(
  plateMap: PlateMap,
  line: PlateLine,
  from: LineValue,
  into: LineValue
): void {
  for (const cell of cellsOn(plateMap, line)) {
    if (cell?.valueId === from.id) cell.valueId = into.id;
  }
  into.color ??= from.color;
  into.links ??= from.links;
  moveValueKeys(plateMap, from.id, into.id);
  line.values.splice(line.values.indexOf(from), 1);
}

function mergeSameValues(plateMap: PlateMap, line: PlateLine): void {
  const byKey = new Map<string, LineValue>();
  for (const value of [...line.values]) {
    const kept = byKey.get(plateValueKey(value.text));
    if (kept) mergeValueInto(plateMap, line, value, kept);
    else byKey.set(plateValueKey(value.text), value);
  }
}

const sharesValue = (a: PlateLine, b: PlateLine) => {
  const keys = new Set(a.values.map(value => plateValueKey(value.text)));
  return b.values.some(value => keys.has(plateValueKey(value.text)));
};

const sharesName = (a: PlateLine, b: PlateLine) => {
  const key = normalizeMaterialKey(a.name);
  return !!key && key === normalizeMaterialKey(b.name);
};

const holdsBoth = (plateMap: PlateMap, a: PlateLine, b: PlateLine) =>
  Object.values(plateMap.samples).some(lines => lines[a.id] && lines[b.id]);

function findTwinLines(plateMap: PlateMap): [PlateLine, PlateLine] | undefined {
  for (const [index, kept] of plateMap.lines.entries()) {
    const twin = plateMap.lines
      .slice(index + 1)
      .find(
        other =>
          (sharesName(kept, other) || sharesValue(kept, other)) && !holdsBoth(plateMap, kept, other)
      );
    if (twin) return [kept, twin];
  }
  return undefined;
}

function mergeLineInto(plateMap: PlateMap, from: PlateLine, into: PlateLine): void {
  for (const lines of Object.values(plateMap.samples)) {
    if (!lines[from.id]) continue;
    lines[into.id] = lines[from.id];
    delete lines[from.id];
  }
  into.values.push(...from.values);
  into.name ||= from.name;
  into.links ??= from.links;
  if (into.role === 'auto') into.role = from.role;
  into.ratioTo ??= from.ratioTo;
  for (const line of plateMap.lines) {
    if (line.ratioTo === from.id) line.ratioTo = into.id;
  }
  if (into.ratioTo === into.id) delete into.ratioTo;
  const prefix = amountLinePrefix(from.id);
  renameKeys(plateMap.amountNames, key =>
    key.startsWith(prefix) ? `${amountLinePrefix(into.id)}${key.slice(prefix.length)}` : key
  );
  plateMap.lines.splice(plateMap.lines.indexOf(from), 1);
}

export function pruneUnused(plateMap: PlateMap): void {
  for (const [key, lines] of Object.entries(plateMap.samples)) {
    for (const [lineId, cell] of Object.entries(lines)) {
      const { unit } = cell;
      if (!isFilledEntry(cell) && !unit) delete lines[lineId];
    }
    if (!Object.keys(lines).length) delete plateMap.samples[key];
  }
  for (const key of Object.keys(plateMap.stainedIn)) {
    if (!Object.values(plateMap.samples[key] ?? {}).some(isFilledEntry))
      delete plateMap.stainedIn[key];
  }
  const sampleEntries = Object.values(plateMap.samples).flatMap(lines => Object.entries(lines));
  const usedLines = new Set(sampleEntries.map(([lineId]) => lineId));
  const usedValues = new Set(sampleEntries.map(([, cell]) => cell.valueId));
  const usedSeries = new Set(sampleEntries.map(([, cell]) => cell.seriesId));
  for (const seriesId of Object.keys(plateMap.seriesDirections)) {
    if (!usedSeries.has(seriesId)) delete plateMap.seriesDirections[seriesId];
  }
  plateMap.lines = plateMap.lines.filter(line => usedLines.has(line.id));
  for (const line of plateMap.lines) {
    if (line.ratioTo && !usedLines.has(line.ratioTo)) delete line.ratioTo;
  }
  for (const line of plateMap.lines)
    line.values = line.values.filter(value => usedValues.has(value.id));
}

export function unifyPlateValues(plateMap: PlateMap): void {
  for (let twins = findTwinLines(plateMap); twins; twins = findTwinLines(plateMap)) {
    mergeLineInto(plateMap, twins[1], twins[0]);
  }
  for (const line of plateMap.lines) mergeSameValues(plateMap, line);
}

function nextValueColor(plateMap: PlateMap, text: string): string {
  if (NEUTRAL_VALUE.test(text.trim())) return NEUTRAL_VALUE_COLOR;
  const uses = new Map<string, number>(VALUE_COLORS.map(color => [color, 0]));
  for (const { color } of plateMap.lines.flatMap(line => line.values)) {
    const count = color === undefined ? undefined : uses.get(color);
    if (color !== undefined && count !== undefined) uses.set(color, count + 1);
  }
  const fewest = Math.min(...uses.values());
  return VALUE_COLORS.find(color => uses.get(color) === fewest) ?? VALUE_COLORS[0];
}

export function normalizePlateMap(plateMap: PlateMap): void {
  pruneUnused(plateMap);
  unifyPlateValues(plateMap);
  const line = colorLineOf(plateMap);
  if (!line) return;
  for (const value of line.values) value.color ??= nextValueColor(plateMap, value.text);
}

export function indicatorColorOf(plateMap: PlateMap, value: LineValue | undefined): string {
  if (value?.color) return value.color;
  if (!value) return BAND_COLORS[0];
  const colorLine = colorLineOf(plateMap);
  const bandValues = plateMap.lines.filter(line => line !== colorLine).flatMap(line => line.values);
  return BAND_COLORS[Math.max(0, bandValues.indexOf(value)) % BAND_COLORS.length];
}
