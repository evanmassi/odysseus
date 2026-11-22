import { z } from 'zod';

export const PROTOCOL_FILE_FORMAT = 'odysseus-workbench-protocol';
export const PROTOCOL_FILE_VERSION = 6;

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
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
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

const cardBase = {
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

const experimentDonorsSchema = z.object({
  label: z.string(),
  shownFields: z.array(z.string()),
  customFields: z.array(fieldDefinitionSchema).default([]),
  rows: z.array(z.object({ id, name: z.string(), values: textMap, units: textMap.default({}) })),
});

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
  isSetAside: z.boolean().default(false),
  recipe: z
    .array(z.object({ id, materialId: z.string(), amount: z.string(), unit: z.string() }))
    .default([]),
  donors: experimentDonorsSchema.optional(),
});

const materialsCardSchema = z.object({
  ...cardBase,
  type: z.literal('materials'),
  foldedGroups: z.array(z.string()),
  customGroups: z.array(z.string()),
  isSetAsideOpen: z.boolean().default(false),
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

const tableCardSchema = z.object({
  ...cardBase,
  type: z.literal('table'),
  isNamed: z.boolean(),
  columns: z.array(tableColumnSchema).min(1),
  items: z.array(z.object({ id, cells: textMap, units: textMap.default({}) })),
});

const valueItemSchema = z.union([
  z.object({ id, row: z.string(), materialField: z.string() }),
  z.object({
    id,
    name: z.string(),
    value: z.string(),
    unit: z.string(),
    row: z.string().optional(),
  }),
]);

const valueRowSchema = z.union([
  z.object({ id, materialId: z.string(), materialName: z.string().optional() }),
  z.object({ id, mixName: z.string() }),
]);

const valuesCardSchema = z.object({
  ...cardBase,
  type: z.literal('values'),
  items: z.array(valueItemSchema),
  rows: z.array(valueRowSchema).default([]),
  generalTitle: z.string().optional(),
});

const calculationsCardSchema = z.object({
  ...cardBase,
  type: z.literal('calculations'),
  items: z.array(z.object({ id, name: z.string(), formula: z.string(), unit: z.string() })),
  materialSections: z.array(z.string()).default([]),
});

export const SERIES_DIRECTIONS = ['right', 'down', 'left', 'up'] as const;

const seriesPrepSchema = z.object({
  roundTo: z.string().optional(),
  diluent: z.string().optional(),
});

const seriesSchema = z.union([
  z.object({
    typedValues: z.array(z.string()),
    direction: z.enum(SERIES_DIRECTIONS),
    prep: seriesPrepSchema.optional(),
  }),
  z.object({
    top: z.string(),
    unit: z.string(),
    dilutionFactor: z.string(),
    direction: z.enum(SERIES_DIRECTIONS).default('right'),
    prep: seriesPrepSchema.optional(),
  }),
]);

const sampleEntrySchema = z.object({
  valueId: z.string().optional(),
  amount: z.string().optional(),
  unit: z.string().optional(),
  seriesId: z.string().optional(),
  seriesPoint: z.number().int().min(0).optional(),
});

export const LINE_ROLES = ['auto', 'fill', 'band', 'stripe', 'tag', 'caption', 'hover'] as const;
const LINE_MARKS = ['outline', 'bracket'] as const;

const plateLineSchema = z.object({
  id,
  name: z.string(),
  values: z.array(z.object({ id, text: z.string(), color: z.string().optional() })),
  role: z.enum(LINE_ROLES).default('auto'),
  hiddenIndicators: z.array(z.enum(LINE_MARKS)).optional(),
  ratioTo: z.string().optional(),
});

export const PLATE_FORMATS = ['6', '12', '24', '48', '96', '384'] as const;
export const OTHER_LABWARE = [
  'T25',
  'T75',
  'T175',
  'dish10',
  'tube1.5',
  'facs',
  'tube15',
  'tube50',
] as const;

const PLATE_MAP_SIDES = ['assay', 'stain'] as const;

export const plateMapCardSchema = z.object({
  ...cardBase,
  type: z.literal('plateMap'),
  plates: z.array(z.object({ id, labware: z.enum(PLATE_FORMATS), name: z.string() })),
  otherLabware: z.array(
    z.object({ id, labware: z.enum(OTHER_LABWARE), count: z.number().int().min(1) })
  ),
  activeTab: z.number().int().min(0),
  lines: z.array(plateLineSchema),
  samples: z.record(z.string(), z.record(z.string(), sampleEntrySchema)),
  series: z.record(z.string(), seriesSchema),
  otherLabwareTabName: z.string().optional(),
  showsReplicatesAsOne: z.boolean().default(true),
  counts: textMap.default({}),
  amountNames: textMap.default({}),
  side: z.enum(PLATE_MAP_SIDES).default('assay'),
  stain: textMap.default({}),
  stainedIn: textMap.default({}),
});

const linkedPlateMapCardSchema = z.object({
  ...cardBase,
  type: z.literal('linkedPlateMap'),
  shows: id,
  side: z.enum(PLATE_MAP_SIDES).default('assay'),
  activeTab: z.number().int().min(0).default(0),
  showsReplicatesAsOne: z.boolean().default(true),
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

export const INSTRUMENT_KINDS = ['conventional', 'spectral'] as const;

const cytometerSchema = z.object({
  name: z.string(),
  kind: z.enum(INSTRUMENT_KINDS),
  lasers: z
    .array(
      z.object({
        name: z.string(),
        nm: z.number().positive(),
        detectors: z.array(z.object({ id, filter: z.string(), usual: z.string().default('') })),
      })
    )
    .min(1),
});

const flowCytometryPanelCardSchema = z.object({
  ...cardBase,
  type: z.literal('flowCytometryPanel'),
  cytometer: cytometerSchema.optional(),
  markers: z.array(
    z.object({
      id,
      materialId: z.string(),
      detectorId: z.string(),
      staining: z.string(),
      dilution: z.string(),
    })
  ),
  stains: z
    .array(
      z.object({
        id,
        name: z.string(),
        color: z.string().optional(),
        markerIds: z.array(z.string()),
        plus: z.array(z.object({ id, materialId: z.string(), staining: z.string() })),
      })
    )
    .default([]),
});

const protocolFluorSchema = z.object({
  name: z.string().min(1),
  lasers: z.array(z.number().positive()).min(1),
  peak: z.number().positive(),
});

const protocolCardSchema = z.discriminatedUnion('type', [
  materialsCardSchema,
  tableCardSchema,
  valuesCardSchema,
  calculationsCardSchema,
  plateMapCardSchema,
  linkedPlateMapCardSchema,
  flowCytometryPanelCardSchema,
  z.object({ ...cardBase, type: z.literal('procedure') }),
  z.object({ ...cardBase, type: z.literal('dilutions') }),
  z.object({ ...cardBase, type: z.literal('flowDiagram') }),
  z.object({ ...cardBase, type: z.literal('sketch'), strokes: z.array(sketchStrokeSchema) }),
  z.object({ ...cardBase, type: z.literal('text'), html: z.string() }),
]);

const protocolSchema = z.object({
  title: z.string(),
  descriptor: z.string(),
  purpose: z.string().default(''),
  runNumber: z.string(),
  runOn: z.object({ from: z.string(), to: z.string() }),
  pages: z.array(pageSchema).min(1),
  cards: z.array(protocolCardSchema),
  lotMemory: z.record(z.string(), z.record(z.string(), textMap)),
  keptBoth: z.array(z.string()),
  ignoredSuggestions: z.array(z.string()).default([]),
  fluors: z.array(protocolFluorSchema).default([]),
  diluent: z.string(),
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
export type ProtocolCard = z.infer<typeof protocolCardSchema>;
export type ProtocolCardType = ProtocolCard['type'];
export type MaterialItem = z.infer<typeof materialItemSchema>;
export type ExperimentDonors = z.infer<typeof experimentDonorsSchema>;
export type ExperimentDonor = ExperimentDonors['rows'][number];
export type MaterialsCard = z.infer<typeof materialsCardSchema>;
export type ValuesCard = z.infer<typeof valuesCardSchema>;
export type ValueRow = ValuesCard['rows'][number];
export type CalculationsCard = z.infer<typeof calculationsCardSchema>;
export type PlateMapCard = z.infer<typeof plateMapCardSchema>;
export type LinkedPlateMapCard = z.infer<typeof linkedPlateMapCardSchema>;
export type FlowCytometryPanelCard = z.infer<typeof flowCytometryPanelCardSchema>;
export type Stain = FlowCytometryPanelCard['stains'][number];
export type Cytometer = z.infer<typeof cytometerSchema>;
export type ProtocolFluor = z.infer<typeof protocolFluorSchema>;
export type PlateLine = z.infer<typeof plateLineSchema>;
export type PlateSeries = z.infer<typeof seriesSchema>;
export type SampleEntry = z.infer<typeof sampleEntrySchema>;
export type Protocol = z.infer<typeof protocolSchema>;
export type ProtocolFile = z.infer<typeof protocolFileSchema>;
