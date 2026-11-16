import { withGreekLetters } from '@odysseus/shared-schemas';

import { formatNumber, readNumber } from '../formulas/quantities';
import { createId } from '../ids/createId';

import { SOURCE_FIELDS, fieldKey } from './materialCatalog';
import { findNamed, listedMaterials } from './materialLookup';

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
const TOTAL_FIELD = 'total-count';
const VIABILITY_FIELD = 'viability';
const LIVE_FIELD = 'live-count';
const PERCENT = 100;

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

interface WorkedOutCount {
  key: string;
  value: string;
}

export function workedOutCount(source: MaterialSource): WorkedOutCount | undefined {
  const typed = (key: string) => readNumber(source.values[key] ?? '');
  const total = typed(TOTAL_FIELD);
  const viability = typed(VIABILITY_FIELD);
  const live = typed(LIVE_FIELD);
  const known = [total, viability, live].filter(value => value !== undefined).length;
  if (known !== 2) return undefined;
  if (live === undefined && total !== undefined && viability !== undefined) {
    return { key: LIVE_FIELD, value: formatNumber((total * viability) / PERCENT) };
  }
  if (total === undefined && live !== undefined && viability) {
    return { key: TOTAL_FIELD, value: formatNumber((live * PERCENT) / viability) };
  }
  if (viability === undefined && live !== undefined && total) {
    return { key: VIABILITY_FIELD, value: formatNumber((live * PERCENT) / total) };
  }
  return undefined;
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
