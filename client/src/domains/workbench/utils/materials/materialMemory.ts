import { normalizeMaterialKey, type RememberedMaterialKind } from './materialGuesser';
import { UNSORTED_GROUP } from './materialItems';

import type { FieldDefinition, MaterialItem, Protocol } from '@odysseus/shared-schemas';

export interface RememberedMaterial {
  group: string;
  type: string;
  values: Record<string, string>;
  units: Record<string, string>;
  customFields: FieldDefinition[];
  shownFields: string[];
}

export interface LabMemory {
  kinds: Record<string, RememberedMaterialKind>;
  materials: Record<string, RememberedMaterial>;
  fields: Record<string, FieldDefinition[]>;
  startingFields: Record<string, string[]>;
}

export const EMPTY_LAB_MEMORY: LabMemory = {
  kinds: {},
  materials: {},
  fields: {},
  startingFields: {},
};

const kindKey = (group: string, type: string) => `${group}|${type}`;

export const learnedFields = (
  memory: LabMemory,
  item: Pick<MaterialItem, 'group' | 'type'>
): readonly FieldDefinition[] => memory.fields[kindKey(item.group, item.type)] ?? [];

export function toggleStartingField(
  memory: LabMemory,
  group: string,
  key: string,
  current: readonly string[]
): LabMemory {
  const next = current.includes(key) ? current.filter(each => each !== key) : [...current, key];
  return { ...memory, startingFields: { ...memory.startingFields, [group]: next } };
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

export function learnFromMaterials(memory: LabMemory, items: readonly MaterialItem[]): LabMemory {
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

export function rememberedKinds(
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
