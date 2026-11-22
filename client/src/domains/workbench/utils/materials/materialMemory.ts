import { normalizeMaterialKey } from '@odysseus/shared-schemas';

import { type MaterialKnowledge, type RememberedMaterialKind } from './materialGuesser';
import { UNSORTED_GROUP } from './materialItems';
import { DONOR_ID_FIELD, STARTING_SOURCE_FIELDS } from './materialSources';

import type {
  FieldDefinition,
  MaterialItem,
  Protocol,
  ProtocolFluor,
} from '@odysseus/shared-schemas';

export interface RememberedMaterial {
  group: string;
  type: string;
  values: Record<string, string>;
  units: Record<string, string>;
  customFields: FieldDefinition[];
  shownFields: string[];
}

export interface RememberedSource {
  name: string;
  material: string;
  values: Record<string, string>;
  units: Record<string, string>;
}

export interface LabMemory {
  kinds: Record<string, RememberedMaterialKind>;
  materials: Record<string, RememberedMaterial>;
  fields: Record<string, FieldDefinition[]>;
  startingFields: Record<string, string[]>;
  dyes: Record<string, ProtocolFluor>;
  sources: Record<string, RememberedSource>;
  sourceFields: FieldDefinition[];
  startingSourceFields: Record<string, string[]>;
}

export const EMPTY_LAB_MEMORY: LabMemory = {
  kinds: {},
  materials: {},
  fields: {},
  startingFields: {},
  dyes: {},
  sources: {},
  sourceFields: [],
  startingSourceFields: {},
};

const kindKey = (group: string, type: string) => `${group}|${type}`;

export const learnedFields = (
  memory: LabMemory,
  item: Pick<MaterialItem, 'group' | 'type'>
): readonly FieldDefinition[] => memory.fields[kindKey(item.group, item.type)] ?? [];

export const startingSourceFieldsOf = (memory: LabMemory, group: string): readonly string[] =>
  memory.startingSourceFields[group] ?? STARTING_SOURCE_FIELDS;

export type PinnedFields = 'startingFields' | 'startingSourceFields';

export function toggleStartingField(
  memory: LabMemory,
  pins: PinnedFields,
  group: string,
  key: string,
  current: readonly string[]
): LabMemory {
  const next = current.includes(key) ? current.filter(each => each !== key) : [...current, key];
  return { ...memory, [pins]: { ...memory[pins], [group]: next } };
}

export function rememberKind(
  memory: LabMemory,
  name: string,
  group: string,
  type: string
): LabMemory {
  if (!name.trim()) return memory;
  return { ...memory, kinds: { ...memory.kinds, [normalizeMaterialKey(name)]: { group, type } } };
}

function learnSources(memory: LabMemory, items: readonly MaterialItem[]): LabMemory {
  const sources = { ...memory.sources };
  const sourceFields = [...memory.sourceFields];
  let hasLearned = false;
  for (const item of items) {
    if (!item.sources || item.isDropped) continue;
    for (const row of item.sources.rows) {
      const donorId = row.values[DONOR_ID_FIELD]?.trim();
      if (!donorId) continue;
      const learned = {
        name: row.name,
        material: item.name.trim(),
        values: { ...row.values },
        units: { ...row.units },
      };
      const key = normalizeMaterialKey(donorId);
      if (JSON.stringify(sources[key]) !== JSON.stringify(learned)) {
        sources[key] = learned;
        hasLearned = true;
      }
    }
    for (const definition of item.sources.customFields) {
      const isShown = item.sources.shownFields.includes(definition.key);
      if (isShown && !sourceFields.some(known => known.key === definition.key)) {
        sourceFields.push({ ...definition });
        hasLearned = true;
      }
    }
  }
  return hasLearned ? { ...memory, sources, sourceFields } : memory;
}

export function learnFromMaterials(memory: LabMemory, items: readonly MaterialItem[]): LabMemory {
  return learnSources(learnMaterials(memory, items), items);
}

function learnMaterials(memory: LabMemory, items: readonly MaterialItem[]): LabMemory {
  const materials = { ...memory.materials };
  const fields = { ...memory.fields };
  let hasLearned = false;
  for (const item of items) {
    if (!item.name.trim() || item.isDropped || item.group === UNSORTED_GROUP) continue;
    const key = normalizeMaterialKey(item.name);
    const learned = {
      group: item.group,
      type: item.type,
      values: { ...item.values },
      units: { ...item.units },
      customFields: item.customFields.map(definition => ({ ...definition })),
      shownFields: [...item.shownFields],
    };
    if (JSON.stringify(materials[key]) !== JSON.stringify(learned)) {
      materials[key] = learned;
      hasLearned = true;
    }
    const kind = kindKey(item.group, item.type);
    const known = fields[kind] ?? [];
    const fresh = item.customFields.filter(
      definition =>
        item.shownFields.includes(definition.key) &&
        !known.some(learned => learned.key === definition.key)
    );
    if (fresh.length) {
      fields[kind] = [...known, ...fresh.map(definition => ({ ...definition }))];
      hasLearned = true;
    }
  }
  return hasLearned ? { ...memory, materials, fields } : memory;
}

const SOURCE_OFFER_LIMIT = 6;

export function knownSources(
  memory: LabMemory,
  typed: string,
  listed: readonly { values: Record<string, string> }[]
): RememberedSource[] {
  const query = normalizeMaterialKey(typed);
  if (!query) return [];
  const listedIds = new Set(
    listed.map(row => normalizeMaterialKey(row.values[DONOR_ID_FIELD] ?? '')).filter(Boolean)
  );
  return Object.entries(memory.sources)
    .filter(
      ([key, source]) =>
        !listedIds.has(key) &&
        (key.includes(query) || normalizeMaterialKey(source.name).includes(query))
    )
    .map(([, source]) => source)
    .slice(0, SOURCE_OFFER_LIMIT);
}

export function rememberFluors(memory: LabMemory, fluors: readonly ProtocolFluor[]): LabMemory {
  const remembered = { ...memory.dyes };
  let hasLearned = false;
  for (const fluor of fluors) {
    const key = normalizeMaterialKey(fluor.name);
    if (JSON.stringify(remembered[key]) !== JSON.stringify(fluor)) {
      remembered[key] = fluor;
      hasLearned = true;
    }
  }
  return hasLearned ? { ...memory, dyes: remembered } : memory;
}

export function materialKnowledge(
  memory: LabMemory,
  protocol: Pick<Protocol, 'blocks' | 'dyes'>
): MaterialKnowledge {
  const fileFluorKeys = new Set(protocol.dyes.map(fluor => normalizeMaterialKey(fluor.name)));
  const rememberedFluors = Object.values(memory.dyes).filter(
    fluor => !fileFluorKeys.has(normalizeMaterialKey(fluor.name))
  );
  return { kinds: knownKinds(memory, protocol), fluors: [...protocol.dyes, ...rememberedFluors] };
}

function knownKinds(
  memory: LabMemory,
  protocol: Pick<Protocol, 'blocks'>
): Map<string, RememberedMaterialKind> {
  const known = new Map<string, RememberedMaterialKind>();
  for (const [key, material] of Object.entries(memory.materials)) {
    known.set(key, {
      group: material.group,
      type: material.type,
      why: 'from your earlier protocols',
    });
  }
  for (const block of protocol.blocks) {
    if (block.type !== 'materials') continue;
    for (const item of block.items) {
      if (!item.name.trim() || item.group === UNSORTED_GROUP) continue;
      known.set(normalizeMaterialKey(item.name), {
        group: item.group,
        type: item.type,
        why: 'already in this protocol',
      });
    }
  }
  for (const [key, kind] of Object.entries(memory.kinds)) known.set(key, kind);
  return known;
}
