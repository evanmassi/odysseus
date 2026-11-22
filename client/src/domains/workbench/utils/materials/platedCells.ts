import {
  lineValueOf,
  type MaterialItem,
  type MaterialSource,
  type Protocol,
  type PlateMapBlock,
} from '@odysseus/shared-schemas';

import { calculateBoard, nameKey } from '../formulas/boardCalculation';
import { cellCount } from '../plateMap/cellRatios';

import { findMaterial, listedMaterials, nameWithoutNotes } from './materialLookup';
import { findSource, sourcesIn } from './materialSources';

const NO_NAMES = calculateBoard([]);

export interface PlatedCells {
  subject: string;
  material: MaterialItem;
  source: MaterialSource | undefined;
  wells: number;
  cells: number;
  perWell: Set<number>;
}

export function platedCells(protocol: Pick<Protocol, 'blocks'>): PlatedCells[] {
  const materials = listedMaterials(protocol).filter(item => !item.isDropped);
  const sources = sourcesIn(protocol);
  const plated = new Map<string, PlatedCells>();
  const plates = protocol.blocks.filter((block): block is PlateMapBlock => block.type === 'plate');
  for (const plateMap of plates) {
    for (const [key, lines] of Object.entries(plateMap.cells)) {
      for (const line of plateMap.lines) {
        const text = lineValueOf(line, lines[line.id])?.text.trim();
        const count = text ? cellCount(plateMap, key, line, NO_NAMES) : undefined;
        if (!text || count === undefined) continue;
        const donor = findSource(sources, text);
        const material = donor?.material ?? findMaterial(materials, text);
        if (!material) continue;
        const subject = donor ? donor.source.name.trim() : nameWithoutNotes(material.name);
        const entry = plated.get(nameKey(subject)) ?? {
          subject,
          material,
          source: donor?.source,
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
