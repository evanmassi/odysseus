import { plateValueKey, type PlateLine, type Protocol } from '@odysseus/shared-schemas';

import { DONOR_ID_FIELD, donorsIn } from '../materials/materialDonors';
import { listedMaterials, nameWithoutNotes, shortNameOf } from '../materials/materialLookup';

export interface KnownName {
  text: string;
  hint: string;
  matches: string[];
}

export interface WellValueSuggestion {
  key: string;
  text: string;
  hint: string;
}

const MOST_SUGGESTIONS = 6;

export function knownNamesIn(protocol: Pick<Protocol, 'materials' | 'plateMaps'>): KnownName[] {
  const materials = listedMaterials(protocol).map(item => {
    const name = nameWithoutNotes(item.name);
    const short = shortNameOf(item);
    return { text: short || name, hint: item.type, matches: [name, short].filter(Boolean) };
  });
  const donors = donorsIn(protocol).map(({ material, donor }) => {
    const id = donor.values[DONOR_ID_FIELD]?.trim() ?? '';
    return {
      text: donor.name.trim(),
      hint: [nameWithoutNotes(material.name), id].filter(Boolean).join(' · '),
      matches: [donor.name, id].filter(Boolean),
    };
  });
  return [...donors, ...materials].filter(known => known.text);
}

export function wellValueSuggestions(
  typed: string,
  lineValues: PlateLine['values'],
  known: readonly KnownName[]
): WellValueSuggestion[] {
  const wanted = plateValueKey(typed);
  if (!wanted) return [];
  const isOffered = (text: string) => {
    const key = plateValueKey(text);
    return key.includes(wanted) && key !== wanted;
  };
  const onLine = lineValues
    .filter(value => isOffered(value.text))
    .map(value => ({ key: value.id, text: value.text, hint: '' }));
  const taken = new Set([wanted, ...onLine.map(entry => plateValueKey(entry.text))]);
  const fromMaterials: WellValueSuggestion[] = [];
  for (const entry of known) {
    const key = plateValueKey(entry.text);
    if (taken.has(key) || !entry.matches.some(match => plateValueKey(match).includes(wanted))) {
      continue;
    }
    taken.add(key);
    fromMaterials.push({ key: `known:${key}`, text: entry.text, hint: entry.hint });
  }
  return [...onLine, ...fromMaterials].slice(0, MOST_SUGGESTIONS);
}
