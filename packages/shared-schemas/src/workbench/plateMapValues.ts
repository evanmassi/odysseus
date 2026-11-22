import { normalizeMaterialKey } from './materialKey';

import type { SampleEntry, PlateLine, PlateMapCard } from './protocolFileSchemas';

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

const cellsOn = (card: PlateMapCard, line: PlateLine) =>
  Object.values(card.samples).map(lines => lines[line.id]);

const hasSeries = (card: PlateMapCard, line: PlateLine) =>
  cellsOn(card, line).some(cell => cell?.seriesId !== undefined);

function varies(card: PlateMapCard, line: PlateLine): boolean {
  if (hasSeries(card, line)) return true;
  const cells = cellsOn(card, line).filter(isFilledEntry);
  const texts = new Set(
    cells.map(
      cell =>
        `${plateValueKey(lineValueOf(line, cell)?.text ?? '')}|${cell.amount?.trim() ?? ''}|${cell.unit ?? ''}`
    )
  );
  return texts.size > 1;
}

export const colorLineOf = (card: PlateMapCard): PlateLine | undefined =>
  card.lines.find(line => line.role === 'fill') ??
  card.lines.find(line => line.role === 'auto' && hasSeries(card, line)) ??
  card.lines.find(line => line.role === 'auto' && varies(card, line));

function renameKeys(map: Record<string, string>, rename: (key: string) => string) {
  for (const key of Object.keys(map)) {
    const renamed = rename(key);
    if (renamed === key) continue;
    map[renamed] ??= map[key];
    delete map[key];
  }
}

export function moveValueKeys(card: PlateMapCard, fromId: string, toId: string): void {
  renameKeys(card.counts, key => (key === fromId ? toId : key));
  const suffix = `:${fromId}`;
  renameKeys(card.amountNames, key =>
    key.endsWith(suffix) ? `${key.slice(0, -suffix.length)}:${toId}` : key
  );
}

function mergeValueInto(
  card: PlateMapCard,
  line: PlateLine,
  from: LineValue,
  into: LineValue
): void {
  for (const cell of cellsOn(card, line)) {
    if (cell?.valueId === from.id) cell.valueId = into.id;
  }
  into.color ??= from.color;
  moveValueKeys(card, from.id, into.id);
  line.values.splice(line.values.indexOf(from), 1);
}

function mergeSameValues(card: PlateMapCard, line: PlateLine): void {
  const byKey = new Map<string, LineValue>();
  for (const value of [...line.values]) {
    const kept = byKey.get(plateValueKey(value.text));
    if (kept) mergeValueInto(card, line, value, kept);
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

const holdsBoth = (card: PlateMapCard, a: PlateLine, b: PlateLine) =>
  Object.values(card.samples).some(lines => lines[a.id] && lines[b.id]);

function findTwinLines(card: PlateMapCard): [PlateLine, PlateLine] | undefined {
  for (const [index, kept] of card.lines.entries()) {
    const twin = card.lines
      .slice(index + 1)
      .find(
        other =>
          (sharesName(kept, other) || sharesValue(kept, other)) && !holdsBoth(card, kept, other)
      );
    if (twin) return [kept, twin];
  }
  return undefined;
}

function mergeLineInto(card: PlateMapCard, from: PlateLine, into: PlateLine): void {
  for (const lines of Object.values(card.samples)) {
    if (!lines[from.id]) continue;
    lines[into.id] = lines[from.id];
    delete lines[from.id];
  }
  into.values.push(...from.values);
  into.name ||= from.name;
  if (into.role === 'auto') into.role = from.role;
  into.ratioTo ??= from.ratioTo;
  for (const line of card.lines) {
    if (line.ratioTo === from.id) line.ratioTo = into.id;
  }
  if (into.ratioTo === into.id) delete into.ratioTo;
  const prefix = `a:${from.id}:`;
  renameKeys(card.amountNames, key =>
    key.startsWith(prefix) ? `a:${into.id}:${key.slice(prefix.length)}` : key
  );
  card.lines.splice(card.lines.indexOf(from), 1);
}

export function pruneUnused(card: PlateMapCard): void {
  for (const [key, lines] of Object.entries(card.samples)) {
    for (const [lineId, cell] of Object.entries(lines)) {
      const { unit } = cell;
      if (!isFilledEntry(cell) && !unit) delete lines[lineId];
    }
    if (!Object.keys(lines).length) delete card.samples[key];
  }
  for (const key of Object.keys(card.stainedIn)) {
    if (!Object.values(card.samples[key] ?? {}).some(isFilledEntry)) delete card.stainedIn[key];
  }
  const sampleEntries = Object.values(card.samples).flatMap(lines => Object.entries(lines));
  const usedLines = new Set(sampleEntries.map(([lineId]) => lineId));
  const usedValues = new Set(sampleEntries.map(([, cell]) => cell.valueId));
  const usedSeries = new Set(sampleEntries.map(([, cell]) => cell.seriesId));
  for (const seriesId of Object.keys(card.series)) {
    if (!usedSeries.has(seriesId)) delete card.series[seriesId];
  }
  card.lines = card.lines.filter(line => usedLines.has(line.id));
  for (const line of card.lines) {
    if (line.ratioTo && !usedLines.has(line.ratioTo)) delete line.ratioTo;
  }
  for (const line of card.lines)
    line.values = line.values.filter(value => usedValues.has(value.id));
}

export function unifyPlateValues(card: PlateMapCard): void {
  for (let twins = findTwinLines(card); twins; twins = findTwinLines(card)) {
    mergeLineInto(card, twins[1], twins[0]);
  }
  for (const line of card.lines) mergeSameValues(card, line);
}

function nextValueColor(card: PlateMapCard, text: string): string {
  if (NEUTRAL_VALUE.test(text.trim())) return NEUTRAL_VALUE_COLOR;
  const uses = new Map<string, number>(VALUE_COLORS.map(color => [color, 0]));
  for (const { color } of card.lines.flatMap(line => line.values)) {
    const count = color === undefined ? undefined : uses.get(color);
    if (color !== undefined && count !== undefined) uses.set(color, count + 1);
  }
  const fewest = Math.min(...uses.values());
  return VALUE_COLORS.find(color => uses.get(color) === fewest) ?? VALUE_COLORS[0];
}

export function normalizePlateMap(card: PlateMapCard): void {
  pruneUnused(card);
  unifyPlateValues(card);
  const line = colorLineOf(card);
  if (!line) return;
  for (const value of line.values) value.color ??= nextValueColor(card, value.text);
}

export function indicatorColorOf(card: PlateMapCard, value: LineValue | undefined): string {
  if (value?.color) return value.color;
  if (!value) return BAND_COLORS[0];
  const colorLine = colorLineOf(card);
  const bandValues = card.lines.filter(line => line !== colorLine).flatMap(line => line.values);
  return BAND_COLORS[Math.max(0, bandValues.indexOf(value)) % BAND_COLORS.length];
}
