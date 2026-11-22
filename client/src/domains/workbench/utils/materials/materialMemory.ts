import { normalizeMaterialKey, renamedFieldKey } from '@odysseus/shared-schemas';

import { DONOR_ID_FIELD, STARTING_DONOR_FIELDS } from './materialDonors';
import { type MaterialKnowledge, type RememberedMaterialType } from './materialGuesser';
import { UNSORTED_GROUP } from './materialItems';

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

export interface KnownDonor {
  name: string;
  material: string;
  values: Record<string, string>;
  units: Record<string, string>;
}

export interface LabMemory {
  knownTypes: Record<string, RememberedMaterialType>;
  materials: Record<string, RememberedMaterial>;
  fields: Record<string, FieldDefinition[]>;
  startingFields: Record<string, string[]>;
  fluors: Record<string, ProtocolFluor>;
  donors: Record<string, KnownDonor>;
  donorFields: FieldDefinition[];
  startingDonorFields: Record<string, string[]>;
}

export const EMPTY_LAB_MEMORY: LabMemory = {
  knownTypes: {},
  materials: {},
  fields: {},
  startingFields: {},
  fluors: {},
  donors: {},
  donorFields: [],
  startingDonorFields: {},
};

type SavedRecord = Record<string, unknown>;

const recordOf = (value: unknown): SavedRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as SavedRecord)
    : {};

const mapValues = (value: unknown, upgrade: (entry: unknown) => unknown) =>
  Object.fromEntries(Object.entries(recordOf(value)).map(([key, entry]) => [key, upgrade(entry)]));

const withFieldKeys = (value: unknown, materialType = '') =>
  Object.fromEntries(
    Object.entries(recordOf(value)).map(([key, entry]) => [
      renamedFieldKey(key, materialType),
      entry,
    ])
  );

const fieldKeyList = (value: unknown, materialType = '') =>
  Array.isArray(value)
    ? value.map(key => (typeof key === 'string' ? renamedFieldKey(key, materialType) : key))
    : [];

const definitionsWithFieldKeys = (value: unknown) =>
  Array.isArray(value)
    ? value.map(definition => {
        const saved = recordOf(definition);
        return typeof saved['key'] === 'string'
          ? { ...saved, key: renamedFieldKey(saved['key'], '') }
          : saved;
      })
    : [];

export function upgradeLabMemory(saved: unknown): LabMemory {
  const memory = recordOf(saved);
  return {
    ...EMPTY_LAB_MEMORY,
    knownTypes: recordOf(memory['kinds']),
    materials: mapValues(memory['materials'], entry => {
      const material = recordOf(entry);
      const type = typeof material['type'] === 'string' ? material['type'] : '';
      return {
        ...material,
        values: withFieldKeys(material['values'], type),
        units: withFieldKeys(material['units'], type),
        shownFields: fieldKeyList(material['shownFields'], type),
        customFields: definitionsWithFieldKeys(material['customFields']),
      };
    }),
    fields: mapValues(memory['fields'], definitionsWithFieldKeys),
    startingFields: mapValues(memory['startingFields'], keys => fieldKeyList(keys)),
    fluors: recordOf(memory['dyes']),
    donors: mapValues(memory['sources'], entry => {
      const donor = recordOf(entry);
      return {
        ...donor,
        values: withFieldKeys(donor['values']),
        units: withFieldKeys(donor['units']),
      };
    }),
    donorFields: definitionsWithFieldKeys(memory['sourceFields']),
    startingDonorFields: mapValues(memory['startingSourceFields'], keys => fieldKeyList(keys)),
  } as LabMemory;
}

const kindKey = (group: string, type: string) => `${group}|${type}`;

export const learnedFields = (
  memory: LabMemory,
  item: Pick<MaterialItem, 'group' | 'type'>
): readonly FieldDefinition[] => memory.fields[kindKey(item.group, item.type)] ?? [];

export const startingDonorFieldsOf = (memory: LabMemory, group: string): readonly string[] =>
  memory.startingDonorFields[group] ?? STARTING_DONOR_FIELDS;

export type PinnedFields = 'startingFields' | 'startingDonorFields';

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
  return {
    ...memory,
    knownTypes: { ...memory.knownTypes, [normalizeMaterialKey(name)]: { group, type } },
  };
}

function learnDonors(memory: LabMemory, items: readonly MaterialItem[]): LabMemory {
  const knownDonors = { ...memory.donors };
  const donorFields = [...memory.donorFields];
  let hasLearned = false;
  for (const item of items) {
    if (!item.donors || item.isSetAside) continue;
    for (const row of item.donors.rows) {
      const donorId = row.values[DONOR_ID_FIELD]?.trim();
      if (!donorId) continue;
      const learned = {
        name: row.name,
        material: item.name.trim(),
        values: { ...row.values },
        units: { ...row.units },
      };
      const key = normalizeMaterialKey(donorId);
      if (JSON.stringify(knownDonors[key]) !== JSON.stringify(learned)) {
        knownDonors[key] = learned;
        hasLearned = true;
      }
    }
    for (const definition of item.donors.customFields) {
      const isShown = item.donors.shownFields.includes(definition.key);
      if (isShown && !donorFields.some(known => known.key === definition.key)) {
        donorFields.push({ ...definition });
        hasLearned = true;
      }
    }
  }
  return hasLearned ? { ...memory, donors: knownDonors, donorFields: donorFields } : memory;
}

export function learnFromMaterials(memory: LabMemory, items: readonly MaterialItem[]): LabMemory {
  return learnDonors(learnMaterials(memory, items), items);
}

function learnMaterials(memory: LabMemory, items: readonly MaterialItem[]): LabMemory {
  const materials = { ...memory.materials };
  const fields = { ...memory.fields };
  let hasLearned = false;
  for (const item of items) {
    if (!item.name.trim() || item.isSetAside || item.group === UNSORTED_GROUP) continue;
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

const DONOR_OFFER_LIMIT = 6;

export function knownDonors(
  memory: LabMemory,
  typed: string,
  listed: readonly { values: Record<string, string> }[]
): KnownDonor[] {
  const query = normalizeMaterialKey(typed);
  if (!query) return [];
  const listedIds = new Set(
    listed.map(row => normalizeMaterialKey(row.values[DONOR_ID_FIELD] ?? '')).filter(Boolean)
  );
  return Object.entries(memory.donors)
    .filter(
      ([key, knownDonor]) =>
        !listedIds.has(key) &&
        (key.includes(query) || normalizeMaterialKey(knownDonor.name).includes(query))
    )
    .map(([, knownDonor]) => knownDonor)
    .slice(0, DONOR_OFFER_LIMIT);
}

export function rememberFluors(memory: LabMemory, fluors: readonly ProtocolFluor[]): LabMemory {
  const remembered = { ...memory.fluors };
  let hasLearned = false;
  for (const fluor of fluors) {
    const key = normalizeMaterialKey(fluor.name);
    if (JSON.stringify(remembered[key]) !== JSON.stringify(fluor)) {
      remembered[key] = fluor;
      hasLearned = true;
    }
  }
  return hasLearned ? { ...memory, fluors: remembered } : memory;
}

export function materialKnowledge(
  memory: LabMemory,
  protocol: Pick<Protocol, 'cards' | 'fluors'>
): MaterialKnowledge {
  const fileFluorKeys = new Set(protocol.fluors.map(fluor => normalizeMaterialKey(fluor.name)));
  const rememberedFluors = Object.values(memory.fluors).filter(
    fluor => !fileFluorKeys.has(normalizeMaterialKey(fluor.name))
  );
  return {
    knownTypes: knownTypes(memory, protocol),
    fluors: [...protocol.fluors, ...rememberedFluors],
  };
}

function knownTypes(
  memory: LabMemory,
  protocol: Pick<Protocol, 'cards'>
): Map<string, RememberedMaterialType> {
  const known = new Map<string, RememberedMaterialType>();
  for (const [key, material] of Object.entries(memory.materials)) {
    known.set(key, {
      group: material.group,
      type: material.type,
      why: 'from your earlier protocols',
    });
  }
  for (const card of protocol.cards) {
    if (card.type !== 'materials') continue;
    for (const item of card.items) {
      if (!item.name.trim() || item.group === UNSORTED_GROUP) continue;
      known.set(normalizeMaterialKey(item.name), {
        group: item.group,
        type: item.type,
        why: 'already in this protocol',
      });
    }
  }
  for (const [key, kind] of Object.entries(memory.knownTypes)) known.set(key, kind);
  return known;
}
