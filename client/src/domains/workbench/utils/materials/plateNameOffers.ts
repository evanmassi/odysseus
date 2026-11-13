import { normalizeMaterialKey } from './materialKey';
import { findNamed, listedMaterials, nameWithoutNotes } from './materialLookup';

import type { Protocol } from '@odysseus/shared-schemas';

export interface PlateNameOffer {
  key: string;
  name: string;
  color: string | undefined;
  wellCount: number;
}

const CONDITION_WORDS =
  /\b(only|untreated|unstimulated)\b|^no\s|^(samples?|controls?|standards?|blanks?|empty|edge|none)$/i;
const SHORTEST_MENTION = 3;

export const plateOfferKey = (name: string): string => `plate:${normalizeMaterialKey(name)}`;

function mixNames(protocol: Pick<Protocol, 'blocks'>): string[] {
  return protocol.blocks.flatMap(block =>
    block.type === 'values'
      ? block.sections.flatMap(section => ('mixName' in section ? [section.mixName] : []))
      : []
  );
}

export function plateNameOffers(
  protocol: Pick<Protocol, 'blocks' | 'ignoredReadings'>
): PlateNameOffer[] {
  const materials = listedMaterials(protocol);
  const mixes = mixNames(protocol);
  const materialKeys = materials
    .map(material => normalizeMaterialKey(material.name))
    .filter(key => key.length >= SHORTEST_MENTION);
  const ignored = new Set(protocol.ignoredReadings);
  const offers = new Map<string, PlateNameOffer>();
  for (const plate of protocol.blocks) {
    if (plate.type !== 'plate') continue;
    for (const line of plate.lines) {
      for (const value of line.values) {
        const name = value.text.trim();
        const key = plateOfferKey(name);
        const wellCount = Object.values(plate.cells).filter(
          lines => lines[line.id]?.valueId === value.id
        ).length;
        const nameKey = normalizeMaterialKey(name);
        const isSkipped =
          !nameKey ||
          !wellCount ||
          ignored.has(key) ||
          CONDITION_WORDS.test(name) ||
          findNamed(materials, name, material => material.name) !== undefined ||
          findNamed(mixes, name, mix => mix) !== undefined ||
          materialKeys.some(materialKey => nameKey.includes(materialKey));
        if (isSkipped) continue;
        const existing = offers.get(key);
        offers.set(key, {
          key,
          name: existing?.name ?? name,
          color: existing?.color ?? value.color,
          wellCount: (existing?.wellCount ?? 0) + wellCount,
        });
      }
    }
  }
  return [...offers.values()];
}

export function linkPlateName(draft: Protocol, name: string, materialId: string): void {
  const material = listedMaterials(draft).find(candidate => candidate.id === materialId);
  if (!material) return;
  const oldName = material.name.trim();
  const notesAt = oldName.indexOf('(');
  const notes = notesAt < 0 ? '' : oldName.slice(notesAt + 1, oldName.lastIndexOf(')')).trim();
  const kept = [nameWithoutNotes(oldName), notes].filter(Boolean).join(', ');
  material.name = `${name.trim()} (${kept})`;
}
