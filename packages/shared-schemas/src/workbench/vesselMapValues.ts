import type { CellLine, PlateLine, VesselMapBlock } from './protocolFileSchemas';

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
const BAND_COLORS = ['#f0b35b', '#e8875a', '#6fbf73', '#c9ccd3'] as const;
const NEUTRAL_VALUE_COLOR = '#7d8494';
const NEUTRAL_VALUE = /^(?:no|none|vehicle|media|medium|untreated|unstim\w*|blank|empty|mock)\b/i;

export const plateValueKey = (text: string) => text.trim().toLowerCase();

export const isFilledCell = (cell: CellLine | undefined): cell is CellLine =>
  !!cell && (!!cell.valueId || !!cell.amount?.trim() || cell.seriesId !== undefined);

export const lineValueOf = (line: PlateLine, cell: CellLine | undefined): LineValue | undefined =>
  cell?.valueId ? line.values.find(value => value.id === cell.valueId) : undefined;

const cellsOn = (block: VesselMapBlock, line: PlateLine) =>
  Object.values(block.cells).map(lines => lines[line.id]);

function varies(block: VesselMapBlock, line: PlateLine): boolean {
  const cells = cellsOn(block, line).filter(isFilledCell);
  if (cells.some(cell => cell.seriesId !== undefined)) return true;
  const texts = new Set(
    cells.map(
      cell =>
        `${plateValueKey(lineValueOf(line, cell)?.text ?? '')}|${cell.amount?.trim() ?? ''}|${cell.unit ?? ''}`
    )
  );
  return texts.size > 1;
}

export const colorLineOf = (block: VesselMapBlock): PlateLine | undefined =>
  block.lines.find(line => line.role === 'color') ??
  block.lines.find(line => line.role === 'auto' && varies(block, line));

function renameKeys(map: Record<string, string>, rename: (key: string) => string) {
  for (const key of Object.keys(map)) {
    const renamed = rename(key);
    if (renamed === key) continue;
    map[renamed] ??= map[key];
    delete map[key];
  }
}

export function moveValueKeys(block: VesselMapBlock, fromId: string, toId: string): void {
  renameKeys(block.counts, key => (key === fromId ? toId : key));
  const suffix = `:${fromId}`;
  renameKeys(block.amountNames, key =>
    key.endsWith(suffix) ? `${key.slice(0, -suffix.length)}:${toId}` : key
  );
}

function mergeValueInto(
  block: VesselMapBlock,
  line: PlateLine,
  from: LineValue,
  into: LineValue
): void {
  for (const cell of cellsOn(block, line)) {
    if (cell?.valueId === from.id) cell.valueId = into.id;
  }
  into.color ??= from.color;
  moveValueKeys(block, from.id, into.id);
  line.values.splice(line.values.indexOf(from), 1);
}

function mergeSameValues(block: VesselMapBlock, line: PlateLine): void {
  const byKey = new Map<string, LineValue>();
  for (const value of [...line.values]) {
    const kept = byKey.get(plateValueKey(value.text));
    if (kept) mergeValueInto(block, line, value, kept);
    else byKey.set(plateValueKey(value.text), value);
  }
}

const sharesValue = (a: PlateLine, b: PlateLine) => {
  const keys = new Set(a.values.map(value => plateValueKey(value.text)));
  return b.values.some(value => keys.has(plateValueKey(value.text)));
};

const holdsBoth = (block: VesselMapBlock, a: PlateLine, b: PlateLine) =>
  Object.values(block.cells).some(lines => lines[a.id] && lines[b.id]);

function findTwinLines(block: VesselMapBlock): [PlateLine, PlateLine] | undefined {
  for (const [index, kept] of block.lines.entries()) {
    const twin = block.lines
      .slice(index + 1)
      .find(other => sharesValue(kept, other) && !holdsBoth(block, kept, other));
    if (twin) return [kept, twin];
  }
  return undefined;
}

function mergeLineInto(block: VesselMapBlock, from: PlateLine, into: PlateLine): void {
  for (const lines of Object.values(block.cells)) {
    if (!lines[from.id]) continue;
    lines[into.id] = lines[from.id];
    delete lines[from.id];
  }
  into.values.push(...from.values);
  into.name ||= from.name;
  if (into.role === 'auto') into.role = from.role;
  const prefix = `a:${from.id}:`;
  renameKeys(block.amountNames, key =>
    key.startsWith(prefix) ? `a:${into.id}:${key.slice(prefix.length)}` : key
  );
  block.lines.splice(block.lines.indexOf(from), 1);
}

export function pruneUnused(block: VesselMapBlock): void {
  for (const [key, lines] of Object.entries(block.cells)) {
    for (const [lineId, cell] of Object.entries(lines)) {
      const { unit } = cell;
      if (!isFilledCell(cell) && !unit) delete lines[lineId];
    }
    if (!Object.keys(lines).length) delete block.cells[key];
  }
  const cellLines = Object.values(block.cells).flatMap(lines => Object.entries(lines));
  const usedLines = new Set(cellLines.map(([lineId]) => lineId));
  const usedValues = new Set(cellLines.map(([, cell]) => cell.valueId));
  const usedSeries = new Set(cellLines.map(([, cell]) => cell.seriesId));
  for (const seriesId of Object.keys(block.series)) {
    if (!usedSeries.has(seriesId)) delete block.series[seriesId];
  }
  block.lines = block.lines.filter(line => usedLines.has(line.id));
  for (const line of block.lines)
    line.values = line.values.filter(value => usedValues.has(value.id));
}

export function unifyPlateValues(block: VesselMapBlock): void {
  for (let twins = findTwinLines(block); twins; twins = findTwinLines(block)) {
    mergeLineInto(block, twins[1], twins[0]);
  }
  for (const line of block.lines) mergeSameValues(block, line);
}

function nextValueColor(block: VesselMapBlock, text: string): string {
  if (NEUTRAL_VALUE.test(text.trim())) return NEUTRAL_VALUE_COLOR;
  const uses = new Map<string, number>(VALUE_COLORS.map(color => [color, 0]));
  for (const { color } of block.lines.flatMap(line => line.values)) {
    const count = color === undefined ? undefined : uses.get(color);
    if (color !== undefined && count !== undefined) uses.set(color, count + 1);
  }
  const fewest = Math.min(...uses.values());
  return VALUE_COLORS.find(color => uses.get(color) === fewest) ?? VALUE_COLORS[0];
}

export function normalizeVesselMap(block: VesselMapBlock): void {
  pruneUnused(block);
  unifyPlateValues(block);
  const line = colorLineOf(block);
  if (!line) return;
  for (const value of line.values) value.color ??= nextValueColor(block, value.text);
}

export function bandColorOf(block: VesselMapBlock, value: LineValue | undefined): string {
  if (value?.color) return value.color;
  if (!value) return BAND_COLORS[0];
  const colorLine = colorLineOf(block);
  const bandValues = block.lines.filter(line => line !== colorLine).flatMap(line => line.values);
  return BAND_COLORS[Math.max(0, bandValues.indexOf(value)) % BAND_COLORS.length];
}
