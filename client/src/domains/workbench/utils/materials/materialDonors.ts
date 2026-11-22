import { withGreekLetters } from '@odysseus/shared-schemas';

import { createId } from '../ids/createId';

import { BIO_GROUP, DONOR_FIELDS, fieldKey } from './materialCatalog';
import { findNamed, listedMaterials, nameWithoutNotes } from './materialLookup';

import type { FieldChoice } from './materialSectionFields';
import type {
  FieldDefinition,
  MaterialItem,
  ExperimentDonor,
  ExperimentDonors,
  Protocol,
} from '@odysseus/shared-schemas';

export const DONORS_LABEL = 'Donors';
export const DONOR_ID_FIELD = 'donor-id';
const DONOR_LOT_FIELD = 'lot-vial';
const DONOR_KEY_OF_MATERIAL_KEY: Readonly<Record<string, string>> = {
  lot: DONOR_LOT_FIELD,
};

export function donorListName(material: MaterialItem): string {
  const label = material.donors?.label.trim();
  return label ? label : DONORS_LABEL;
}

export const donorTargetsOf = (
  protocol: Pick<Protocol, 'cards'>
): Array<{ value: string; label: string }> =>
  listedMaterials(protocol)
    .filter(item => item.group === BIO_GROUP)
    .map(item => ({ value: item.id, label: `${item.name} · ${donorListName(item)}` }));

export const STARTING_DONOR_FIELDS: readonly string[] = DONOR_FIELDS.map(
  definition => definition.key
);

export const donorFields = (donors: ExperimentDonors): FieldDefinition[] => [
  ...DONOR_FIELDS,
  ...donors.customFields,
];

export const donorColumns = (donors: ExperimentDonors): FieldDefinition[] =>
  donors.shownFields.flatMap(key => donorFields(donors).filter(field => field.key === key));

export function startDonors(
  item: MaterialItem,
  startingFields: readonly string[],
  learned: readonly FieldDefinition[]
): void {
  item.donors ??= {
    label: DONORS_LABEL,
    shownFields: [...startingFields],
    customFields: learned
      .filter(definition => startingFields.includes(definition.key))
      .map(definition => ({ ...definition })),
    rows: [],
  };
}

export function addDonor(
  donors: ExperimentDonors,
  name: string,
  recalled?: Pick<ExperimentDonor, 'values' | 'units'>
): ExperimentDonor {
  const donor: ExperimentDonor = {
    id: createId(),
    name: withGreekLetters(name.trim()),
    values: { ...recalled?.values },
    units: { ...recalled?.units },
  };
  donors.rows.push(donor);
  for (const [key, value] of Object.entries(donor.values)) {
    if (value.trim() && donorFields(donors).some(field => field.key === key)) {
      if (!donors.shownFields.includes(key)) donors.shownFields.push(key);
    }
  }
  return donor;
}

export function addDonorsNamed(
  item: MaterialItem,
  names: readonly string[],
  startingFields: readonly string[],
  learned: readonly FieldDefinition[]
): void {
  startDonors(item, startingFields, learned);
  const { donors: donors } = item;
  if (!donors) return;
  for (const name of names) {
    if (name.trim() && !findNamed(donors.rows, name, row => row.name)) addDonor(donors, name);
  }
}

export function donorFieldChoices(
  donors: ExperimentDonors,
  learned: readonly FieldDefinition[]
): FieldChoice[] {
  const own = donorFields(donors);
  const remembered = learned.filter(definition => !own.some(field => field.key === definition.key));
  return [...own, ...remembered].map(definition => ({
    definition,
    isShown: donors.shownFields.includes(definition.key),
  }));
}

export function toggleDonorField(
  donors: ExperimentDonors,
  key: string,
  learned: readonly FieldDefinition[]
): void {
  if (donors.shownFields.includes(key)) {
    donors.shownFields = donors.shownFields.filter(shown => shown !== key);
    return;
  }
  const remembered = learned.find(definition => definition.key === key);
  const isOwn = donorFields(donors).some(field => field.key === key);
  if (!isOwn && remembered) donors.customFields.push({ ...remembered });
  if (isOwn || remembered) donors.shownFields.push(key);
}

export function addCustomDonorField(donors: ExperimentDonors, label: string): void {
  const key = `custom-${fieldKey(label)}`;
  if (!donors.customFields.some(custom => custom.key === key)) {
    donors.customFields.push({
      key,
      label,
      kind: 'text',
      scope: 'protocol',
      unit: '',
      options: [],
    });
  }
  if (!donors.shownFields.includes(key)) donors.shownFields.push(key);
}

export function writeDonorField(
  donors: ExperimentDonors,
  donor: ExperimentDonor,
  key: string,
  value: string
): void {
  if (!value.trim()) {
    delete donor.values[key];
    return;
  }
  donor.values[key] = value;
  if (!donors.shownFields.includes(key)) donors.shownFields.push(key);
}

export interface KnownDonorMatch {
  material: MaterialItem;
  donor: ExperimentDonor;
}

export function donorsIn(protocol: Pick<Protocol, 'cards'>): KnownDonorMatch[] {
  return listedMaterials(protocol).flatMap(material =>
    (material.donors?.rows ?? []).map(donor => ({ material, donor }))
  );
}

export const findDonor = (
  matches: readonly KnownDonorMatch[],
  name: string
): KnownDonorMatch | undefined => findNamed(matches, name, match => match.donor.name);

function donorSummary({ material, donor }: KnownDonorMatch): string {
  const facts = [
    [DONOR_ID_FIELD, 'ID'],
    [DONOR_LOT_FIELD, 'Lot'],
  ].flatMap(([key, label]) => {
    const value = donor.values[key]?.trim();
    return value ? [`${label} ${value}`] : [];
  });
  return [material.name.trim(), ...facts].join(' · ');
}

export interface DonorSummary {
  name: string;
  summary: string;
}

export const donorSummaries = (protocol: Pick<Protocol, 'cards'>): DonorSummary[] =>
  donorsIn(protocol).map(match => ({ name: match.donor.name, summary: donorSummary(match) }));

export function moveIntoDonors(draft: Protocol, itemId: string, targetId: string): void {
  const target = listedMaterials(draft).find(candidate => candidate.id === targetId);
  const card = draft.cards.find(
    candidate => candidate.type === 'materials' && candidate.items.some(item => item.id === itemId)
  );
  if (!target?.donors || card?.type !== 'materials' || itemId === targetId) return;
  const item = card.items.find(candidate => candidate.id === itemId);
  if (!item) return;
  const donorKeys = new Set(donorFields(target.donors).map(field => field.key));
  const carried = Object.entries(item.values).flatMap(([key, value]) => {
    const donorKey = DONOR_KEY_OF_MATERIAL_KEY[key] ?? key;
    return value.trim() && donorKeys.has(donorKey) ? [[key, donorKey] as const] : [];
  });
  card.items = card.items.filter(candidate => candidate.id !== itemId);
  if (findNamed(target.donors.rows, item.name, row => row.name)) return;
  addDonor(target.donors, nameWithoutNotes(item.name), {
    values: Object.fromEntries(carried.map(([key, donorKey]) => [donorKey, item.values[key]])),
    units: Object.fromEntries(
      carried.flatMap(([key, donorKey]) => (item.units[key] ? [[donorKey, item.units[key]]] : []))
    ),
  });
}
