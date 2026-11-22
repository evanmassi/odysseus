import { withGreekLetters } from '@odysseus/shared-schemas';

import { createId } from '../ids/createId';

import { BIO_GROUP, SOURCE_FIELDS, fieldKey } from './materialCatalog';
import { findNamed, listedMaterials, nameWithoutNotes } from './materialLookup';

import type { FieldChoice } from './materialSectionFields';
import type {
  FieldDefinition,
  MaterialItem,
  MaterialSource,
  MaterialSources,
  Protocol,
} from '@odysseus/shared-schemas';

export const SOURCES_LABEL = 'Donors';
export const DONOR_ID_FIELD = 'donor-id';
const LOT_FIELD = 'lot-vial';
const DONOR_KEY_OF_MATERIAL_KEY: Readonly<Record<string, string>> = {
  lot: LOT_FIELD,
  vendor: 'source',
};

export function donorListName(material: MaterialItem): string {
  const label = material.sources?.label.trim();
  return label ? label : SOURCES_LABEL;
}

export const donorTargetsOf = (
  protocol: Pick<Protocol, 'blocks'>
): Array<{ value: string; label: string }> =>
  listedMaterials(protocol)
    .filter(item => item.group === BIO_GROUP)
    .map(item => ({ value: item.id, label: `${item.name} · ${donorListName(item)}` }));

export const STARTING_SOURCE_FIELDS: readonly string[] = SOURCE_FIELDS.map(
  definition => definition.key
);

export const sourceFields = (sources: MaterialSources): FieldDefinition[] => [
  ...SOURCE_FIELDS,
  ...sources.customFields,
];

export const sourceColumns = (sources: MaterialSources): FieldDefinition[] =>
  sources.shownFields.flatMap(key => sourceFields(sources).filter(field => field.key === key));

export function startSources(
  item: MaterialItem,
  startingFields: readonly string[],
  learned: readonly FieldDefinition[]
): void {
  item.sources ??= {
    label: SOURCES_LABEL,
    shownFields: [...startingFields],
    customFields: learned
      .filter(definition => startingFields.includes(definition.key))
      .map(definition => ({ ...definition })),
    rows: [],
  };
}

export function addSource(
  sources: MaterialSources,
  name: string,
  recalled?: Pick<MaterialSource, 'values' | 'units'>
): MaterialSource {
  const source: MaterialSource = {
    id: createId(),
    name: withGreekLetters(name.trim()),
    values: { ...recalled?.values },
    units: { ...recalled?.units },
  };
  sources.rows.push(source);
  for (const [key, value] of Object.entries(source.values)) {
    if (value.trim() && sourceFields(sources).some(field => field.key === key)) {
      if (!sources.shownFields.includes(key)) sources.shownFields.push(key);
    }
  }
  return source;
}

export function addSourcesNamed(
  item: MaterialItem,
  names: readonly string[],
  startingFields: readonly string[],
  learned: readonly FieldDefinition[]
): void {
  startSources(item, startingFields, learned);
  const { sources } = item;
  if (!sources) return;
  for (const name of names) {
    if (name.trim() && !findNamed(sources.rows, name, row => row.name)) addSource(sources, name);
  }
}

export function sourceFieldChoices(
  sources: MaterialSources,
  learned: readonly FieldDefinition[]
): FieldChoice[] {
  const own = sourceFields(sources);
  const remembered = learned.filter(definition => !own.some(field => field.key === definition.key));
  return [...own, ...remembered].map(definition => ({
    definition,
    isShown: sources.shownFields.includes(definition.key),
  }));
}

export function toggleSourceField(
  sources: MaterialSources,
  key: string,
  learned: readonly FieldDefinition[]
): void {
  if (sources.shownFields.includes(key)) {
    sources.shownFields = sources.shownFields.filter(shown => shown !== key);
    return;
  }
  const remembered = learned.find(definition => definition.key === key);
  const isOwn = sourceFields(sources).some(field => field.key === key);
  if (!isOwn && remembered) sources.customFields.push({ ...remembered });
  if (isOwn || remembered) sources.shownFields.push(key);
}

export function addCustomSourceField(sources: MaterialSources, label: string): void {
  const key = `custom-${fieldKey(label)}`;
  if (!sources.customFields.some(custom => custom.key === key)) {
    sources.customFields.push({
      key,
      label,
      kind: 'text',
      scope: 'protocol',
      unit: '',
      options: [],
    });
  }
  if (!sources.shownFields.includes(key)) sources.shownFields.push(key);
}

export function writeSourceField(
  sources: MaterialSources,
  source: MaterialSource,
  key: string,
  value: string
): void {
  if (!value.trim()) {
    delete source.values[key];
    return;
  }
  source.values[key] = value;
  if (!sources.shownFields.includes(key)) sources.shownFields.push(key);
}

export interface SourceMatch {
  material: MaterialItem;
  source: MaterialSource;
}

export function sourcesIn(protocol: Pick<Protocol, 'blocks'>): SourceMatch[] {
  return listedMaterials(protocol).flatMap(material =>
    (material.sources?.rows ?? []).map(source => ({ material, source }))
  );
}

export const findSource = (
  matches: readonly SourceMatch[],
  name: string
): SourceMatch | undefined => findNamed(matches, name, match => match.source.name);

function sourceSummary({ material, source }: SourceMatch): string {
  const facts = [
    [DONOR_ID_FIELD, 'ID'],
    [LOT_FIELD, 'Lot'],
  ].flatMap(([key, label]) => {
    const value = source.values[key]?.trim();
    return value ? [`${label} ${value}`] : [];
  });
  return [material.name.trim(), ...facts].join(' · ');
}

export interface SourceSummary {
  name: string;
  summary: string;
}

export const sourceSummaries = (protocol: Pick<Protocol, 'blocks'>): SourceSummary[] =>
  sourcesIn(protocol).map(match => ({ name: match.source.name, summary: sourceSummary(match) }));

export function moveIntoSources(draft: Protocol, itemId: string, targetId: string): void {
  const target = listedMaterials(draft).find(candidate => candidate.id === targetId);
  const block = draft.blocks.find(
    candidate => candidate.type === 'materials' && candidate.items.some(item => item.id === itemId)
  );
  if (!target?.sources || block?.type !== 'materials' || itemId === targetId) return;
  const item = block.items.find(candidate => candidate.id === itemId);
  if (!item) return;
  const donorKeys = new Set(sourceFields(target.sources).map(field => field.key));
  const carried = Object.entries(item.values).flatMap(([key, value]) => {
    const donorKey = DONOR_KEY_OF_MATERIAL_KEY[key] ?? key;
    return value.trim() && donorKeys.has(donorKey) ? [[key, donorKey] as const] : [];
  });
  block.items = block.items.filter(candidate => candidate.id !== itemId);
  if (findNamed(target.sources.rows, item.name, row => row.name)) return;
  addSource(target.sources, nameWithoutNotes(item.name), {
    values: Object.fromEntries(carried.map(([key, donorKey]) => [donorKey, item.values[key]])),
    units: Object.fromEntries(
      carried.flatMap(([key, donorKey]) => (item.units[key] ? [[donorKey, item.units[key]]] : []))
    ),
  });
}
