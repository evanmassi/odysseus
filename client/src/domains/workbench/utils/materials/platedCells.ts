import {
  lineValueOf,
  type MaterialItem,
  type ExperimentDonor,
  type Protocol,
} from '@odysseus/shared-schemas';

import { calculateBoard, nameKey } from '../formulas/boardCalculation';
import { cellCount } from '../plateMap/cellRatios';
import { labwareOf, labwareTypeAt } from '../plateMap/labwareCatalog';
import { SAMPLE_NOUNS, type SampleNoun } from '../terms/termList';

import { findDonor, donorsIn } from './materialDonors';
import { findMaterial, listedMaterials, nameWithoutNotes } from './materialLookup';

const NO_NAMES = calculateBoard([]);

export interface CellPlacement {
  noun: SampleNoun;
  wells: number;
  cells: number;
  perWell: Set<number>;
}

export interface PlatedCells {
  subject: string;
  material: MaterialItem;
  donor: ExperimentDonor | undefined;
  placements: CellPlacement[];
}

export function platedCells(protocol: Pick<Protocol, 'materials' | 'plateMaps'>): PlatedCells[] {
  const materials = listedMaterials(protocol).filter(item => !item.isSetAside);
  const matches = donorsIn(protocol);
  const plated = new Map<string, PlatedCells>();
  const plates = protocol.plateMaps;
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
          placements: [],
        };
        const noun = labwareOf(labwareTypeAt(plateMap, key)).kind;
        let placement = entry.placements.find(candidate => candidate.noun === noun);
        if (!placement) {
          placement = { noun, wells: 0, cells: 0, perWell: new Set<number>() };
          entry.placements.push(placement);
        }
        placement.wells += 1;
        placement.cells += count;
        placement.perWell.add(count);
        plated.set(nameKey(subject), entry);
      }
    }
  }
  const order = (placement: CellPlacement) => SAMPLE_NOUNS.indexOf(placement.noun);
  return [...plated.values()].map(entry => ({
    ...entry,
    placements: [...entry.placements].sort((a, b) => order(a) - order(b)),
  }));
}
