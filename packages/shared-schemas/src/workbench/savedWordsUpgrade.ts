import { z } from 'zod';

import { PROTOCOL_FILE_VERSION } from './protocolFileSchemas';

export const SAVED_WORDS_FILE_VERSION = 4;

type Json = Record<string, unknown>;
type Renames = Readonly<Record<string, string>>;

const CARD_TYPES: Renames = {
  list: 'table',
  steps: 'procedure',
  formula: 'calculations',
  plate: 'plateMap',
  plateView: 'linkedPlateMap',
  flow: 'flowDiagram',
  cytometer: 'flowCytometryPanel',
};

const FIELD_KEYS: Renames = {
  vendor: 'source',
  count: 'total-cell-conc',
  'total-count': 'total-cell-conc',
  'live-count': 'live-cell-conc',
  recipe: 'recipe-note',
};
const STAINING_REAGENT_FIELD_KEYS: Renames = { ...FIELD_KEYS, dilution: 'amount' };
const STAINING_REAGENTS = new Set(['Secondary reagent', 'Dye', 'Multimer']);

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const listOf = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const eachObject = (value: unknown, upgrade: (item: Json) => Json): unknown[] =>
  listOf(value).map(item => (isObject(item) ? upgrade(item) : item));

function renamed(object: Json, renames: Renames): Json {
  const result: Json = {};
  for (const [key, value] of Object.entries(object)) {
    const target = renames[key] ?? key;
    if (target in result && result[target] !== '' && result[target] !== undefined) continue;
    result[target] = value;
  }
  return result;
}

const fieldKeysOf = (materialType: string): Renames =>
  STAINING_REAGENTS.has(materialType) ? STAINING_REAGENT_FIELD_KEYS : FIELD_KEYS;

export const renamedFieldKey = (key: string, materialType: string): string =>
  fieldKeysOf(materialType)[key] ?? key;

const fieldMap = (value: unknown, materialType: string): unknown =>
  isObject(value) ? renamed(value, fieldKeysOf(materialType)) : value;

const fieldList = (value: unknown, materialType: string): unknown =>
  Array.isArray(value)
    ? value.map(key => (typeof key === 'string' ? renamedFieldKey(key, materialType) : key))
    : value;

function upgradeDonors(donors: Json, materialType: string): Json {
  return {
    ...donors,
    shownFields: fieldList(donors['shownFields'], materialType),
    rows: eachObject(donors['rows'], row => ({
      ...row,
      values: fieldMap(row['values'], materialType),
      units: fieldMap(row['units'], materialType),
    })),
  };
}

function upgradeMaterial(item: Json): Json {
  const type = typeof item['type'] === 'string' ? item['type'] : '';
  const upgraded = renamed(item, { isDropped: 'isSetAside', sources: 'donors' });
  return {
    ...upgraded,
    values: fieldMap(item['values'], type),
    units: fieldMap(item['units'], type),
    fieldLabels: fieldMap(item['fieldLabels'], type),
    shownFields: fieldList(item['shownFields'], type),
    ...(isObject(item['sources']) && { donors: upgradeDonors(item['sources'], type) }),
  };
}

const SERIES_KEY_PARTS: Renames = { start: 'top', fold: 'dilutionFactor' };

function upgradeAmountNameKey(key: string): string {
  const [kind, seriesId, part] = key.split(':');
  return kind === 's' && part && SERIES_KEY_PARTS[part]
    ? `s:${seriesId}:${SERIES_KEY_PARTS[part]}`
    : key;
}

const upgradeSamples = (samples: unknown): unknown =>
  isObject(samples)
    ? Object.fromEntries(
        Object.entries(samples).map(([wellKey, lines]) => [
          wellKey,
          isObject(lines)
            ? Object.fromEntries(
                Object.entries(lines).map(([lineId, entry]) => [
                  lineId,
                  isObject(entry) ? renamed(entry, { seriesStep: 'seriesPoint' }) : entry,
                ])
              )
            : lines,
        ])
      )
    : samples;

function upgradePlateMap(card: Json): Json {
  const upgraded = renamed(card, {
    cells: 'samples',
    sets: 'otherLabware',
    shelfName: 'otherLabwareTabName',
    mergesReplicates: 'showsReplicatesAsOne',
  });
  const series = isObject(card['series']) ? card['series'] : {};
  const amountNames = isObject(card['amountNames']) ? card['amountNames'] : {};
  return {
    ...upgraded,
    plates: eachObject(card['plates'], plate => renamed(plate, { vessel: 'labware' })),
    otherLabware: eachObject(card['sets'], item => renamed(item, { vessel: 'labware' })),
    lines: eachObject(card['lines'], line => ({
      ...renamed(line, { hiddenMarks: 'hiddenIndicators' }),
      ...(line['role'] === 'color' && { role: 'fill' }),
    })),
    samples: upgradeSamples(card['cells']),
    series: Object.fromEntries(
      Object.entries(series).map(([id, entry]) => [
        id,
        isObject(entry)
          ? renamed(entry, { start: 'top', fold: 'dilutionFactor', points: 'typedValues' })
          : entry,
      ])
    ),
    amountNames: Object.fromEntries(
      Object.entries(amountNames).map(([key, name]) => [upgradeAmountNameKey(key), name])
    ),
  };
}

function upgradeFlowCytometryPanel(card: Json): Json {
  return {
    ...renamed(card, { instrument: 'cytometer', rows: 'markers', mixes: 'stains' }),
    markers: eachObject(card['rows'], marker => renamed(marker, { stain: 'staining' })),
    stains: eachObject(card['mixes'], stain => ({
      ...renamed(stain, { rowIds: 'markerIds' }),
      plus: eachObject(stain['plus'], plus => renamed(plus, { stain: 'staining' })),
    })),
  };
}

function upgradeValues(card: Json, materialTypes: ReadonlyMap<string, string>): Json {
  const rowMaterial = new Map(
    listOf(card['sections']).flatMap(row =>
      isObject(row) && typeof row['id'] === 'string' && typeof row['materialId'] === 'string'
        ? [[row['id'], row['materialId']] as const]
        : []
    )
  );
  return {
    ...renamed(card, { sections: 'rows' }),
    items: eachObject(card['items'], item => {
      const upgraded = renamed(item, { section: 'row' });
      if (typeof item['materialField'] !== 'string') return upgraded;
      const materialId = rowMaterial.get(String(item['section']));
      const type = (materialId && materialTypes.get(materialId)) || '';
      return { ...upgraded, materialField: renamedFieldKey(item['materialField'], type) };
    }),
  };
}

function upgradeCard(card: Json, materialTypes: ReadonlyMap<string, string>): Json {
  const type = typeof card['type'] === 'string' ? card['type'] : '';
  const typed = { ...card, type: CARD_TYPES[type] ?? type };
  if (type === 'materials') {
    return {
      ...renamed(typed, { isDroppedOpen: 'isSetAsideOpen' }),
      items: eachObject(card['items'], upgradeMaterial),
    };
  }
  if (type === 'formula') {
    return {
      ...typed,
      items: eachObject(card['items'], item => renamed(item, { expr: 'formula' })),
    };
  }
  if (type === 'values') return upgradeValues(typed, materialTypes);
  if (type === 'plate') return upgradePlateMap(typed);
  if (type === 'plateView') return renamed(typed, { mergesReplicates: 'showsReplicatesAsOne' });
  if (type === 'cytometer') return upgradeFlowCytometryPanel(typed);
  return typed;
}

function materialTypesIn(cards: readonly unknown[]): Map<string, string> {
  const types = new Map<string, string>();
  for (const card of cards) {
    if (!isObject(card) || card['type'] !== 'materials') continue;
    for (const item of listOf(card['items'])) {
      if (isObject(item) && typeof item['id'] === 'string' && typeof item['type'] === 'string') {
        types.set(item['id'], item['type']);
      }
    }
  }
  return types;
}

const upgradeLotMemory = (lotMemory: unknown): unknown =>
  isObject(lotMemory)
    ? Object.fromEntries(
        Object.entries(lotMemory).map(([material, lots]) => [
          material,
          isObject(lots)
            ? Object.fromEntries(
                Object.entries(lots).map(([lot, values]) => [lot, fieldMap(values, '')])
              )
            : lots,
        ])
      )
    : lotMemory;

function upgradeProtocol(protocol: Json): Json {
  const cards = listOf(protocol['blocks']);
  const materialTypes = materialTypesIn(cards);
  return {
    ...renamed(protocol, {
      blocks: 'cards',
      dyes: 'fluors',
      ignoredReadings: 'ignoredSuggestions',
    }),
    cards: cards.map(card => (isObject(card) ? upgradeCard(card, materialTypes) : card)),
    lotMemory: upgradeLotMemory(protocol['lotMemory']),
  };
}

export const savedWordsFileSchema = z
  .looseObject({ version: z.literal(SAVED_WORDS_FILE_VERSION), protocol: z.looseObject({}) })
  .transform(file => ({
    ...file,
    version: PROTOCOL_FILE_VERSION,
    protocol: upgradeProtocol(file.protocol),
  }));
