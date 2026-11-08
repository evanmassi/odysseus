import { z } from 'zod';

export const PROTOCOL_FILE_FORMAT = 'odysseus-workbench-protocol';
export const PROTOCOL_FILE_VERSION = 3;

const id = z.string().min(1);
const textMap = z.record(z.string(), z.string());

const FIELD_KINDS = ['text', 'number', 'date', 'choice'] as const;

const fieldDefinitionSchema = z.object({
  key: z.string(),
  label: z.string(),
  kind: z.enum(FIELD_KINDS),
  scope: z.enum(['protocol', 'lot']),
  unit: z.string(),
  options: z.array(z.string()),
  defaultUnit: z.string().optional(),
  units: z.array(z.string()).optional(),
  nameByUnit: textMap.optional(),
  warnsWhenPast: z.boolean().optional(),
});

const stepSchema = z.discriminatedUnion('kind', [
  z.object({
    id,
    kind: z.literal('step'),
    level: z.union([z.literal(1), z.literal(2)]),
    text: z.string(),
    isMeanwhile: z.boolean(),
  }),
  z.object({ id, kind: z.literal('section'), text: z.string() }),
]);

const pageSchema = z.object({
  id,
  name: z.string(),
  steps: z.array(stepSchema),
});

const blockBase = {
  id,
  title: z.string(),
  page: id,
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1),
  h: z.number().int().min(1),
  isCollapsed: z.boolean().default(false),
  expandedHeight: z.number().int().min(1).optional(),
};

const materialItemSchema = z.object({
  id,
  group: z.string(),
  type: z.string(),
  name: z.string(),
  shownFields: z.array(z.string()),
  values: textMap,
  units: textMap,
  customFields: z.array(fieldDefinitionSchema),
  fieldLabels: textMap.default({}),
  isDropped: z.boolean().default(false),
});

const materialsBlockSchema = z.object({
  ...blockBase,
  type: z.literal('materials'),
  foldedGroups: z.array(z.string()),
  customGroups: z.array(z.string()),
  isDroppedOpen: z.boolean().default(false),
  items: z.array(materialItemSchema),
});

const tableColumnSchema = z.object({
  id,
  name: z.string(),
  kind: z.enum(FIELD_KINDS),
  unit: z.string(),
  options: z.array(z.string()),
  isHidden: z.boolean(),
  warnsWhenPast: z.boolean(),
});

const tableBlockSchema = z.object({
  ...blockBase,
  type: z.literal('list'),
  isNamed: z.boolean(),
  columns: z.array(tableColumnSchema).min(1),
  items: z.array(z.object({ id, cells: textMap, units: textMap.default({}) })),
});

const valueItemSchema = z.union([
  z.object({ id, section: z.string(), materialField: z.string() }),
  z.object({
    id,
    name: z.string(),
    value: z.string(),
    unit: z.string(),
    section: z.string().optional(),
  }),
]);

const valueSectionSchema = z.union([
  z.object({ id, materialId: z.string(), materialName: z.string().optional() }),
  z.object({ id, mixName: z.string() }),
]);

const valuesBlockSchema = z.object({
  ...blockBase,
  type: z.literal('values'),
  items: z.array(valueItemSchema),
  sections: z.array(valueSectionSchema).default([]),
  generalTitle: z.string().optional(),
});

const formulaBlockSchema = z.object({
  ...blockBase,
  type: z.literal('formula'),
  items: z.array(z.object({ id, name: z.string(), expr: z.string(), unit: z.string() })),
  materialSections: z.array(z.string()).default([]),
});

export const SERIES_DIRECTIONS = ['right', 'down', 'left', 'up'] as const;

const seriesPrepSchema = z.object({
  volumeAdded: z.string().optional(),
  wellVolume: z.string().optional(),
  extraPercent: z.string().optional(),
  roundTo: z.string().optional(),
});

const seriesSchema = z.union([
  z.object({
    points: z.array(z.string()),
    direction: z.enum(SERIES_DIRECTIONS),
    prep: seriesPrepSchema.optional(),
  }),
  z.object({
    start: z.string(),
    unit: z.string(),
    fold: z.string(),
    direction: z.enum(SERIES_DIRECTIONS).default('right'),
    prep: seriesPrepSchema.optional(),
  }),
]);

const cellLineSchema = z.object({
  valueId: z.string().optional(),
  amount: z.string().optional(),
  unit: z.string().optional(),
  seriesId: z.string().optional(),
  seriesStep: z.number().int().min(0).optional(),
});

export const LINE_ROLES = ['auto', 'color', 'band', 'caption', 'hover'] as const;

const plateLineSchema = z.object({
  id,
  name: z.string(),
  values: z.array(z.object({ id, text: z.string(), color: z.string().optional() })),
  role: z.enum(LINE_ROLES).default('auto'),
});

export const PLATE_FORMATS = ['6', '12', '24', '48', '96', '384'] as const;
export const LOOSE_VESSELS = [
  'T25',
  'T75',
  'T175',
  'dish10',
  'tube1.5',
  'facs',
  'tube15',
  'tube50',
] as const;

export const vesselMapBlockSchema = z.object({
  ...blockBase,
  type: z.literal('plate'),
  plates: z.array(z.object({ id, vessel: z.enum(PLATE_FORMATS), name: z.string() })),
  sets: z.array(z.object({ id, vessel: z.enum(LOOSE_VESSELS), count: z.number().int().min(1) })),
  activeTab: z.number().int().min(0),
  lines: z.array(plateLineSchema),
  cells: z.record(z.string(), z.record(z.string(), cellLineSchema)),
  series: z.record(z.string(), seriesSchema),
  shelfName: z.string().optional(),
  mergesReplicates: z.boolean().default(true),
  counts: textMap.default({}),
  amountNames: textMap.default({}),
});

const sketchStrokeSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('line'),
    color: z.string(),
    points: z.array(z.tuple([z.number(), z.number()])),
  }),
  z.object({
    kind: z.literal('text'),
    color: z.string(),
    x: z.number(),
    y: z.number(),
    text: z.string(),
    size: z.number(),
  }),
]);

const protocolBlockSchema = z.discriminatedUnion('type', [
  materialsBlockSchema,
  tableBlockSchema,
  valuesBlockSchema,
  formulaBlockSchema,
  vesselMapBlockSchema,
  z.object({ ...blockBase, type: z.literal('steps') }),
  z.object({ ...blockBase, type: z.literal('dilutions') }),
  z.object({ ...blockBase, type: z.literal('flow') }),
  z.object({ ...blockBase, type: z.literal('sketch'), strokes: z.array(sketchStrokeSchema) }),
  z.object({ ...blockBase, type: z.literal('text'), html: z.string() }),
]);

const protocolSchema = z.object({
  title: z.string(),
  descriptor: z.string(),
  runNumber: z.string(),
  runOn: z.object({ from: z.string(), to: z.string() }),
  pages: z.array(pageSchema).min(1),
  blocks: z.array(protocolBlockSchema),
  lotMemory: z.record(z.string(), z.record(z.string(), textMap)),
  keptBoth: z.array(z.string()),
  ignoredReadings: z.array(z.string()).default([]),
});

export const protocolFileSchema = z.object({
  format: z.literal(PROTOCOL_FILE_FORMAT),
  version: z.literal(PROTOCOL_FILE_VERSION),
  savedAt: z.string(),
  protocol: protocolSchema,
});

export type FieldDefinition = z.infer<typeof fieldDefinitionSchema>;
export type ProtocolStep = z.infer<typeof stepSchema>;
export type ProtocolPage = z.infer<typeof pageSchema>;
export type ProtocolBlock = z.infer<typeof protocolBlockSchema>;
export type ProtocolBlockType = ProtocolBlock['type'];
export type MaterialItem = z.infer<typeof materialItemSchema>;
export type MaterialsBlock = z.infer<typeof materialsBlockSchema>;
export type ValuesBlock = z.infer<typeof valuesBlockSchema>;
export type FormulaBlock = z.infer<typeof formulaBlockSchema>;
export type VesselMapBlock = z.infer<typeof vesselMapBlockSchema>;
export type PlateLine = z.infer<typeof plateLineSchema>;
export type PlateSeries = z.infer<typeof seriesSchema>;
export type CellLine = z.infer<typeof cellLineSchema>;
export type Protocol = z.infer<typeof protocolSchema>;
export type ProtocolFile = z.infer<typeof protocolFileSchema>;
