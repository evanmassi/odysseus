import { z } from 'zod';

import { newProtocolId } from './protocolIds';
import {
  PROTOCOL_FILE_VERSION,
  vesselMapBlockSchema,
  type PlateLine,
  type VesselMapBlock,
} from './protocolFileSchemas';
import {
  lineValueOf,
  moveValueKeys,
  normalizeVesselMap,
  plateValueKey,
  unifyPlateValues,
} from './vesselMapValues';

export const PAINTED_GROUPS_FILE_VERSION = 2;

const paintedGroupSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  color: z.string(),
});
type PaintedGroup = z.infer<typeof paintedGroupSchema>;

function pruneUnusedValues(block: VesselMapBlock): void {
  const used = new Set(
    Object.values(block.cells).flatMap(lines => Object.values(lines).map(cell => cell.valueId))
  );
  for (const line of block.lines) line.values = line.values.filter(value => used.has(value.id));
}

function addColorLine(block: VesselMapBlock): PlateLine {
  const line: PlateLine = { id: newProtocolId(), name: '', values: [], role: 'color' };
  block.lines.push(line);
  return line;
}

interface PaintedWells {
  group: PaintedGroup;
  label: string;
  keys: string[];
}

const heldValues = (block: VesselMapBlock, line: PlateLine, keys: string[]) =>
  keys.map(key => lineValueOf(line, block.cells[key]?.[line.id]));

function paintedValueText(held: ReturnType<typeof heldValues>, label: string) {
  const [first] = held;
  if (first && held.every(value => value === first)) return first.text;
  return held.some(value => !value) ? label : undefined;
}

function lineForPaint(block: VesselMapBlock, painted: PaintedWells[]): PlateLine {
  const explicit = block.lines.find(line => line.role === 'color');
  if (explicit) return explicit;
  let best: { line: PlateLine; kept: number; held: number } | undefined;
  for (const line of block.lines.filter(candidate => candidate.role === 'auto')) {
    const helds = painted.map(({ keys }) => heldValues(block, line, keys));
    const held = helds.flat().filter(Boolean).length;
    const texts = helds.map((values, index) => paintedValueText(values, painted[index].label));
    const kept = new Set(texts.filter(text => text !== undefined).map(plateValueKey)).size;
    const isBetter = !best || kept > best.kept || (kept === best.kept && held > best.held);
    if (held && isBetter) best = { line, kept, held };
  }
  if (!best) return addColorLine(block);
  best.line.role = 'color';
  return best.line;
}

function valueForPaint(block: VesselMapBlock, line: PlateLine, { label, keys }: PaintedWells) {
  const held = heldValues(block, line, keys);
  const text = paintedValueText(held, label);
  if (text === undefined) return undefined;
  let value = line.values.find(candidate => plateValueKey(candidate.text) === plateValueKey(text));
  if (!value) {
    value = { id: newProtocolId(), text };
    line.values.push(value);
  }
  for (const [index, key] of keys.entries()) {
    if (held[index]) continue;
    const lines = (block.cells[key] ??= {});
    lines[line.id] = { ...lines[line.id], valueId: value.id };
  }
  return value;
}

function retirePaintedGroups(
  block: VesselMapBlock,
  groups: PaintedGroup[],
  wells: Record<string, string>
): VesselMapBlock {
  pruneUnusedValues(block);
  unifyPlateValues(block);
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
    const line = lineForPaint(block, painted);
    for (const paint of painted) {
      const value = valueForPaint(block, line, paint);
      if (!value) continue;
      value.color ??= paint.group.color;
      paintedValueIds.set(paint.group.id, value.id);
    }
  }
  for (const group of groups) {
    const valueId = paintedValueIds.get(group.id);
    if (valueId) moveValueKeys(block, group.id, valueId);
    else {
      delete block.counts[group.id];
      for (const key of Object.keys(block.amountNames)) {
        if (key.endsWith(`:${group.id}`)) delete block.amountNames[key];
      }
    }
  }
  normalizeVesselMap(block);
  return block;
}

const paintedVesselMapSchema = vesselMapBlockSchema
  .extend({ groups: z.array(paintedGroupSchema), wells: z.record(z.string(), z.string()) })
  .transform(({ groups, wells, ...block }) => retirePaintedGroups(block, groups, wells));

const isVesselMap = (block: unknown) =>
  typeof block === 'object' && block !== null && 'type' in block && block.type === 'plate';

export const paintedGroupsFileSchema = z
  .looseObject({
    version: z.literal(PAINTED_GROUPS_FILE_VERSION),
    protocol: z.looseObject({ blocks: z.array(z.unknown()) }),
  })
  .transform(file => ({
    ...file,
    version: PROTOCOL_FILE_VERSION,
    protocol: {
      ...file.protocol,
      blocks: file.protocol.blocks.map(block =>
        isVesselMap(block) ? paintedVesselMapSchema.parse(block) : block
      ),
    },
  }));
