import {
  lineValueOf,
  type MaterialItem,
  type ExperimentDonor,
  type Protocol,
  type PlateMapCard,
} from '@odysseus/shared-schemas';

import { calculateBoard, nameKey } from '../formulas/boardCalculation';
import { cellCount } from '../plateMap/cellRatios';

import { findDonor, donorsIn } from './materialDonors';
import { findMaterial, listedMaterials, nameWithoutNotes } from './materialLookup';

const NO_NAMES = calculateBoard([]);

export interface PlatedCells {
  subject: string;
  material: MaterialItem;
  donor: ExperimentDonor | undefined;
  wells: number;
  cells: number;
  perWell: Set<number>;
}

export function platedCells(protocol: Pick<Protocol, 'cards'>): PlatedCells[] {
  const materials = listedMaterials(protocol).filter(item => !item.isSetAside);
  const matches = donorsIn(protocol);
  const plated = new Map<string, PlatedCells>();
  const plates = protocol.cards.filter((card): card is PlateMapCard => card.type === 'plateMap');
  for (const plateMap of plates) {
    for (const [key, lines] of Object.entries(plateMap.samples)) {
      for (const line of plateMap.lines) {
        const text = lineValueOf(line, lines[line.id])?.text.trim();
        const count = text ? cellCount(plateMap, key, line, NO_NAMES) : undefined;
        if (!text || count === undefined) continue;
        const found = findDonor(matches, text);
        const material = found?.material ?? findMaterial(materials, text);
        if (!material) continue;
        const subject = found ? found.donor.name.trim() : nameWithoutNotes(material.name);
        const entry = plated.get(nameKey(subject)) ?? {
          subject,
          material,
          donor: found?.donor,
          wells: 0,
          cells: 0,
          perWell: new Set<number>(),
        };
        entry.wells += 1;
        entry.cells += count;
        entry.perWell.add(count);
        plated.set(nameKey(subject), entry);
      }
    }
  }
  return [...plated.values()];
}
