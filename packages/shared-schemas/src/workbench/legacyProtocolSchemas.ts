import { z } from 'zod';

import { PAINTED_GROUPS_FILE_VERSION, paintedGroupsFileSchema } from './paintedGroupUpgrade';
import {
  LINE_ROLES,
  PLATE_FORMATS,
  PROTOCOL_FILE_FORMAT,
  PROTOCOL_FILE_VERSION,
  SERIES_DIRECTIONS,
  protocolFileSchema,
  type CellLine,
  type PlateSeries,
} from './protocolFileSchemas';
import { newProtocolId } from './protocolIds';

const text = z.string().catch('');
const textMap = z.record(z.string(), z.string()).catch({});
const list = <T extends z.ZodType>(item: T) => z.array(item).catch([]);
const loose = z.record(z.string(), z.unknown());

const RENAMED_MATERIAL_FIELDS: Record<string, string> = {
  concentration: 'stock-concentration',
  'working-concentration': 'final-concentration',
};

const upgradeUnit = (unit: string) => (unit === 'x' ? 'X' : unit);
const upgradeUnits = (units: Record<string, string>) =>
  Object.fromEntries(Object.entries(units).map(([key, unit]) => [key, upgradeUnit(unit)]));

function renameMaterialFields(values: Record<string, string>, units: Record<string, string> = {}) {
  const nextValues = { ...values };
  const nextUnits = { ...units };
  for (const [from, to] of Object.entries(RENAMED_MATERIAL_FIELDS)) {
    if (nextValues[from] === undefined) continue;
    nextValues[to] ??= nextValues[from];
    if (nextUnits[from]) nextUnits[to] ??= nextUnits[from];
    delete nextValues[from];
    delete nextUnits[from];
  }
  return { values: nextValues, units: nextUnits };
}

const renameFieldKey = (key: string) => RENAMED_MATERIAL_FIELDS[key] ?? key;

const legacyFieldDefinition = z
  .object({
    key: text,
    label: text,
    kind: z.enum(['text', 'number', 'date', 'choice']).catch('text'),
    scope: z.enum(['protocol', 'lot']).catch('protocol'),
    unit: text,
    options: list(z.string()),
    defaultUnit: z.string().optional(),
    units: z.array(z.string()).optional(),
    nameByUnit: z.record(z.string(), z.string()).optional(),
    warnPast: z.boolean().optional(),
  })
  .transform(({ warnPast, defaultUnit, units, ...field }) => ({
    ...field,
    unit: upgradeUnit(field.unit),
    ...(defaultUnit !== undefined && { defaultUnit: upgradeUnit(defaultUnit) }),
    ...(units && { units: units.map(upgradeUnit) }),
    ...(warnPast !== undefined && { warnsWhenPast: warnPast }),
  }));

const legacyStep = z
  .object({
    id: z.string().catch(() => newProtocolId()),
    kind: z.enum(['step', 'section']).catch('step'),
    level: z.union([z.literal(1), z.literal(2)]).catch(1),
    text,
    meanwhile: z.boolean().catch(false),
  })
  .transform(step =>
    step.kind === 'section'
      ? { id: step.id, kind: 'section' as const, text: step.text }
      : {
          id: step.id,
          kind: 'step' as const,
          level: step.level,
          text: step.text,
          isMeanwhile: step.meanwhile,
        }
  );

const legacyBlockBase = {
  id: z.string(),
  type: z.string(),
  title: text,
  page: z.string().optional(),
  x: z.number().catch(0),
  y: z.number().catch(0),
  w: z.number().catch(6),
  h: z.number().catch(6),
  collapsed: z.boolean().optional(),
  openH: z.number().optional(),
};

const legacyMaterialItem = z
  .object({
    id: z.string(),
    group: text,
    type: text,
    name: text,
    on: list(z.string()),
    values: textMap,
    units: textMap,
    custom: list(legacyFieldDefinition),
    labels: textMap,
    dropped: z.boolean().catch(false),
  })
  .transform(item => {
    const { values, units } = renameMaterialFields(item.values, item.units);
    return {
      id: item.id,
      group: item.group,
      type: item.type,
      name: item.name,
      shownFields: [...new Set(item.on.map(renameFieldKey))],
      values,
      units: upgradeUnits(units),
      customFields: item.custom,
      fieldLabels: item.labels,
      isDropped: item.dropped,
    };
  });

const legacyValueItem = z.union([
  z
    .object({ id: z.string(), section: z.string(), link: z.string() })
    .transform(({ id, section, link }) => ({ id, section, materialField: renameFieldKey(link) })),
  z
    .object({ id: z.string(), name: text, value: text, unit: text, section: z.string().optional() })
    .transform(item => ({ ...item, unit: upgradeUnit(item.unit) })),
]);

const legacyValueSection = z.union([
  z
    .object({ id: z.string(), of: z.string(), name: z.string().optional() })
    .transform(({ id, of, name }) => ({
      id,
      materialId: of,
      ...(name !== undefined && { materialName: name }),
    })),
  z.object({ id: z.string(), mix: text }).transform(({ id, mix }) => ({ id, mixName: mix })),
]);

const legacyPrep = z
  .object({
    add: z.string().optional(),
    well: z.string().optional(),
    extra: z.string().optional(),
    step: z.string().optional(),
  })
  .transform(prep => ({
    ...(prep.add !== undefined && { volumeAdded: prep.add }),
    ...(prep.well !== undefined && { wellVolume: prep.well }),
    ...(prep.extra !== undefined && { extraPercent: prep.extra }),
    ...(prep.step !== undefined && { roundTo: prep.step }),
  }))
  .optional()
  .catch(undefined);

const direction = z.enum(SERIES_DIRECTIONS).catch('right');

const legacySeries = z
  .object({
    list: z.array(z.string()).optional(),
    start: text,
    unit: text,
    fold: text,
    dir: direction,
    prep: legacyPrep,
  })
  .transform((series): PlateSeries => {
    const prep = series.prep && { prep: series.prep };
    if (series.list) return { points: series.list, direction: series.dir, ...prep };
    return {
      start: series.start,
      unit: upgradeUnit(series.unit),
      fold: series.fold,
      direction: series.dir,
      ...prep,
    };
  });

const legacyLineValue = z.object({ id: z.string(), text });
const legacyLine = z.object({
  id: z.string(),
  name: text,
  values: list(legacyLineValue),
  show: z.enum(LINE_ROLES).catch('auto'),
});

type LegacyLine = z.infer<typeof legacyLine>;

function valueIdFor(line: LegacyLine, valueText: string): string {
  const existing = line.values.find(value => value.text === valueText);
  if (existing) return existing.id;
  const created = { id: newProtocolId(), text: valueText };
  line.values.push(created);
  return created.id;
}

function upgradeCellLine(raw: unknown, line: LegacyLine | undefined): CellLine | undefined {
  if (typeof raw === 'string') return line ? { valueId: valueIdFor(line, raw) } : undefined;
  const parsed = loose.safeParse(raw);
  if (!parsed.success) return undefined;
  const { v, amt, unit, s, step } = parsed.data;
  const upgraded: CellLine = {};
  if (typeof v === 'string' && v) upgraded.valueId = v;
  else if (typeof s === 'string' && line?.name) upgraded.valueId = valueIdFor(line, line.name);
  if (typeof amt === 'string') upgraded.amount = amt;
  if (typeof unit === 'string' && unit) upgraded.unit = upgradeUnit(unit);
  if (typeof s === 'string' && s) {
    upgraded.seriesId = s;
    upgraded.seriesStep = typeof step === 'number' ? step : Number(step) || 0;
  }
  return upgraded;
}

const PLATE_FORMAT_SET = new Set<string>(PLATE_FORMATS);

const renameKeys = <T>(map: Record<string, T>, rename: (key: string) => string) =>
  Object.fromEntries(Object.entries(map).map(([key, value]) => [rename(key), value]));

const legacyVesselMap = z
  .object({
    plates: z.array(z.object({ id: z.string(), vessel: z.string(), name: text })).optional(),
    sets: z.array(z.object({ id: z.string(), vessel: z.string(), count: z.number() })).optional(),
    vessel: z.string().optional(),
    count: z.number().optional(),
    names: list(z.string()),
    active: z.number().catch(0),
    groups: list(z.object({ id: z.string(), label: text, color: text })),
    wells: textMap,
    fields: list(legacyLine),
    cells: z.record(z.string(), z.record(z.string(), z.unknown()).catch({})).catch({}),
    series: z.record(z.string(), legacySeries).catch({}),
    shelfName: z.string().optional(),
    merge: z.boolean().optional(),
    counts: textMap,
    amountNames: textMap,
  })
  .transform(block => {
    let { wells, cells } = block;
    const lines = block.fields;
    const isPlateVessel = block.vessel !== undefined && PLATE_FORMAT_SET.has(block.vessel);
    let sets = block.sets;
    if (!sets) {
      sets = [];
      if (block.vessel && !isPlateVessel) {
        const setId = newProtocolId();
        sets = [{ id: setId, vessel: block.vessel, count: block.count ?? 1 }];
        const rename = (key: string) => key.replace(/^(\d+):1$/, `${setId}#$1:1`);
        wells = renameKeys(wells, rename);
        cells = renameKeys(cells, rename);
      }
    }
    let plates = block.plates;
    if (!plates) {
      plates =
        block.vessel && isPlateVessel
          ? Array.from({ length: block.count ?? 1 }, (_, index) => ({
              id: newProtocolId(),
              vessel: block.vessel as string,
              name: block.names[index] ?? '',
            }))
          : [];
      const created = plates;
      const rename = (key: string) => {
        const [index, position] = key.split(':');
        const plate = created[Number(index)];
        return plate && position !== '1' ? `${plate.id}:${position}` : key;
      };
      wells = renameKeys(wells, rename);
      cells = renameKeys(cells, rename);
    }
    const lineById = new Map(lines.map(line => [line.id, line]));
    const upgradedCells: Record<string, Record<string, CellLine>> = {};
    for (const [wellKey, wellLines] of Object.entries(cells)) {
      const upgradedLines: Record<string, CellLine> = {};
      for (const [lineId, raw] of Object.entries(wellLines)) {
        const upgraded = upgradeCellLine(raw, lineById.get(lineId));
        if (upgraded) upgradedLines[lineId] = upgraded;
      }
      upgradedCells[wellKey] = upgradedLines;
    }
    return {
      plates,
      sets,
      activeTab: Math.max(0, Math.round(block.active)),
      groups: block.groups,
      wells,
      lines: lines.map(({ show, ...line }) => ({ ...line, role: show })),
      cells: upgradedCells,
      series: block.series,
      ...(block.shelfName !== undefined && { shelfName: block.shelfName }),
      mergesReplicates: block.merge !== false,
      counts: block.counts,
      amountNames: block.amountNames,
    };
  });

const legacyBlockContent: Record<string, z.ZodType<Record<string, unknown>>> = {
  materials: z
    .object({
      folded: list(z.string()),
      customGroups: list(z.string()),
      droppedOpen: z.boolean().catch(false),
      items: list(legacyMaterialItem),
    })
    .transform(({ folded, droppedOpen, ...block }) => ({
      ...block,
      foldedGroups: folded,
      isDroppedOpen: droppedOpen,
    })),
  list: z
    .object({
      named: z.boolean().catch(false),
      columns: list(
        z
          .object({
            id: z.string(),
            name: text,
            kind: z.enum(['text', 'number', 'date', 'choice']).catch('text'),
            unit: text,
            options: list(z.string()),
            hidden: z.boolean().catch(false),
            warnPast: z.boolean().catch(false),
          })
          .transform(({ hidden, warnPast, ...column }) => ({
            ...column,
            unit: upgradeUnit(column.unit),
            isHidden: hidden,
            warnsWhenPast: warnPast,
          }))
      ),
      items: list(z.object({ id: z.string(), cells: textMap, units: textMap })),
    })
    .transform(({ named, items, ...block }) => ({
      ...block,
      isNamed: named,
      items: items.map(row => ({ ...row, units: upgradeUnits(row.units) })),
    })),
  values: z.object({
    items: list(legacyValueItem),
    sections: list(legacyValueSection),
    generalTitle: z.string().optional(),
  }),
  formula: z
    .object({
      items: list(
        z.object({ id: z.string(), name: text, expr: text, unit: z.string().catch('auto') })
      ),
      sections: list(z.string()),
    })
    .transform(({ items, sections }) => ({
      items: items.map(item => ({ ...item, unit: upgradeUnit(item.unit) })),
      materialSections: sections,
    })),
  plate: legacyVesselMap,
  steps: z.object({}),
  dilutions: z.object({}),
  flow: z.object({}),
  sketch: z.object({
    strokes: list(
      z.union([
        z
          .object({
            kind: z.literal('line'),
            color: text,
            pts: list(z.tuple([z.number(), z.number()])),
          })
          .transform(({ pts, ...stroke }) => ({ ...stroke, points: pts })),
        z.object({
          kind: z.literal('text'),
          color: text,
          x: z.number(),
          y: z.number(),
          text,
          size: z.number(),
        }),
      ])
    ),
  }),
  text: z.object({ html: text }),
};

function upgradeBlock(raw: unknown, fallbackPage: string): unknown {
  const base = z.object(legacyBlockBase).parse(raw);
  const content = legacyBlockContent[base.type];
  if (!content) throw new Error(`Unknown block type “${base.type}”`);
  return {
    id: base.id,
    type: base.type,
    title: base.title,
    page: base.page ?? fallbackPage,
    x: Math.max(0, Math.round(base.x)),
    y: Math.max(0, Math.round(base.y)),
    w: Math.max(1, Math.round(base.w)),
    h: Math.max(1, Math.round(base.h)),
    isCollapsed: !!base.collapsed,
    ...(base.openH !== undefined && { expandedHeight: Math.max(1, Math.round(base.openH)) }),
    ...content.parse(raw),
  };
}

const legacyProtocol = z
  .object({
    title: z.string().catch('Untitled protocol'),
    descriptor: text,
    runNumber: text,
    runOn: z.object({ from: text, to: text }).catch({ from: '', to: '' }),
    pages: z.array(z.object({ id: z.string(), name: text, steps: list(legacyStep) })).optional(),
    steps: list(legacyStep),
    blocks: z.array(z.unknown()),
    lotMemory: z.record(z.string(), z.record(z.string(), textMap)).catch({}),
    keptBoth: list(z.string()),
    ignoredReadings: list(z.string()),
  })
  .transform(legacy => {
    const pages = legacy.pages?.length
      ? legacy.pages
      : [{ id: newProtocolId(), name: 'Setup', steps: legacy.steps }];
    const fallbackPage = pages[0].id;
    const lotMemory = Object.fromEntries(
      Object.entries(legacy.lotMemory).map(([itemId, lots]) => [
        itemId,
        Object.fromEntries(
          Object.entries(lots).map(([lot, values]) => [lot, renameMaterialFields(values).values])
        ),
      ])
    );
    return {
      title: legacy.title,
      descriptor: legacy.descriptor,
      runNumber: legacy.runNumber,
      runOn: legacy.runOn,
      pages,
      blocks: legacy.blocks.map(block => upgradeBlock(block, fallbackPage)),
      lotMemory,
      keptBoth: legacy.keptBoth,
      ignoredReadings: legacy.ignoredReadings,
    };
  });

const legacyProtocolFile = z
  .object({
    format: z.literal(PROTOCOL_FILE_FORMAT),
    savedAt: text,
    protocol: legacyProtocol,
  })
  .transform(file => ({ ...file, version: PAINTED_GROUPS_FILE_VERSION }));

function upgradeFile(raw: unknown): unknown {
  const version = loose.safeParse(raw).data?.['version'];
  if (version === PROTOCOL_FILE_VERSION) return raw;
  const paintedGroupsFile =
    version === PAINTED_GROUPS_FILE_VERSION ? raw : legacyProtocolFile.parse(raw);
  return paintedGroupsFileSchema.parse(paintedGroupsFile);
}

export const protocolFileInputSchema = z.preprocess(upgradeFile, protocolFileSchema);
