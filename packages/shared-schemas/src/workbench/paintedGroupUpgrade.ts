import { z } from 'zod';

import { newProtocolId } from './protocolIds';
import { plateMapCardSchema, type PlateLine, type PlateMapCard } from './protocolFileSchemas';
import { SERIES_DILUENT_FILE_VERSION } from './seriesDiluentUpgrade';
import {
  lineValueOf,
  moveValueKeys,
  normalizePlateMap,
  plateValueKey,
  pruneUnused,
  unifyPlateValues,
} from './plateMapValues';

export const PAINTED_GROUPS_FILE_VERSION = 2;

const paintedGroupSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  color: z.string(),
});
type PaintedGroup = z.infer<typeof paintedGroupSchema>;

function addColorLine(card: PlateMapCard): PlateLine {
  const line: PlateLine = { id: newProtocolId(), name: '', values: [], role: 'color' };
  card.lines.push(line);
  return line;
}

interface PaintedWells {
  group: PaintedGroup;
  label: string;
  keys: string[];
}

const heldValues = (card: PlateMapCard, line: PlateLine, keys: string[]) =>
  keys.map(key => lineValueOf(line, card.cells[key]?.[line.id]));

function paintedValueText(held: ReturnType<typeof heldValues>, label: string) {
  const [first] = held;
  if (first && held.every(value => value === first)) return first.text;
  return held.some(value => !value) ? label : undefined;
}

function lineForPaint(card: PlateMapCard, painted: PaintedWells[]): PlateLine {
  const explicit = card.lines.find(line => line.role === 'color');
  if (explicit) return explicit;
  let best: { line: PlateLine; kept: number; held: number } | undefined;
  for (const line of card.lines.filter(candidate => candidate.role === 'auto')) {
    const helds = painted.map(({ keys }) => heldValues(card, line, keys));
    const held = helds.flat().filter(Boolean).length;
    const texts = helds.map((values, index) => paintedValueText(values, painted[index].label));
    const kept = new Set(texts.filter(text => text !== undefined).map(plateValueKey)).size;
    const isBetter = !best || kept > best.kept || (kept === best.kept && held > best.held);
    if (held && isBetter) best = { line, kept, held };
  }
  if (!best) return addColorLine(card);
  best.line.role = 'color';
  return best.line;
}

function valueForPaint(card: PlateMapCard, line: PlateLine, { label, keys }: PaintedWells) {
  const held = heldValues(card, line, keys);
  const text = paintedValueText(held, label);
  if (text === undefined) return undefined;
  let value = line.values.find(candidate => plateValueKey(candidate.text) === plateValueKey(text));
  if (!value) {
    value = { id: newProtocolId(), text };
    line.values.push(value);
  }
  for (const [index, key] of keys.entries()) {
    if (held[index]) continue;
    const lines = (card.cells[key] ??= {});
    lines[line.id] = { ...lines[line.id], valueId: value.id };
  }
  return value;
}

function retirePaintedGroups(
  card: PlateMapCard,
  groups: PaintedGroup[],
  wells: Record<string, string>
): PlateMapCard {
  pruneUnused(card);
  unifyPlateValues(card);
  const painted = groups
    .map(
      (group, index): PaintedWells => ({
        group,
        label: group.label.trim() || `Color ${index + 1}`,
        keys: Object.keys(wells).filter(key => wells[key] === group.id),
      })
    )
    .filter(({ keys }) => keys.length);
  const paintedValueIds = new Map<string, string>();
  if (painted.length) {
    const line = lineForPaint(card, painted);
    for (const paint of painted) {
      const value = valueForPaint(card, line, paint);
      if (!value) continue;
      value.color ??= paint.group.color;
      paintedValueIds.set(paint.group.id, value.id);
    }
  }
  for (const group of groups) {
    const valueId = paintedValueIds.get(group.id);
    if (valueId) moveValueKeys(card, group.id, valueId);
    else {
      delete card.counts[group.id];
      for (const key of Object.keys(card.amountNames)) {
        if (key.endsWith(`:${group.id}`)) delete card.amountNames[key];
      }
    }
  }
  normalizePlateMap(card);
  return card;
}

const paintedPlateMapSchema = plateMapCardSchema
  .extend({ groups: z.array(paintedGroupSchema), wells: z.record(z.string(), z.string()) })
  .transform(({ groups, wells, ...card }) => retirePaintedGroups(card, groups, wells));

const isPlateMap = (card: unknown) =>
  typeof card === 'object' && card !== null && 'type' in card && card.type === 'plate';

export const paintedGroupsFileSchema = z
  .looseObject({
    version: z.literal(PAINTED_GROUPS_FILE_VERSION),
    protocol: z.looseObject({ blocks: z.array(z.unknown()) }),
  })
  .transform(file => ({
    ...file,
    version: SERIES_DILUENT_FILE_VERSION,
    protocol: {
      ...file.protocol,
      blocks: file.protocol.blocks.map(card =>
        isPlateMap(card) ? paintedPlateMapSchema.parse(card) : card
      ),
    },
  }));
