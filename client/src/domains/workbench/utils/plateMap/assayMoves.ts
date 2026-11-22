import { forgetStainOf, isAtHome, stainSamples, stainPositionOf } from './stainLayout';
import { isWellFilled } from './wellSelection';

import type { PlateMapSheet } from './plateMapTabs';
import type { PlateMapCard } from '@odysseus/shared-schemas';

export function moveAssayWells(
  card: PlateMapCard,
  sheet: PlateMapSheet,
  cutKeys: ReadonlySet<string>,
  landing: readonly string[]
): void {
  const leaving = sheet.positions
    .filter(position => cutKeys.has(position.key))
    .map(position => position.key);
  const replaced = new Set(landing.filter(key => !cutKeys.has(key) && isWellFilled(card, key)));
  forgetStainOf(card, replaced);
  for (const key of replaced) delete card.samples[key];

  const samples = stainSamples(card, sheet);
  const destination = new Map(leaving.map((key, index) => [key, landing[index]]));
  const travelsWithStain = new Set(
    leaving.filter(key => isWellFilled(card, key) && isAtHome(samples, key))
  );
  for (let isSettled = false; !isSettled; ) {
    isSettled = true;
    for (const key of travelsWithStain) {
      const arriving = samples.get(destination.get(key) ?? '') ?? [];
      if (arriving.every(well => travelsWithStain.has(well))) continue;
      travelsWithStain.delete(key);
      isSettled = false;
    }
  }

  const moved = leaving.map(key => ({
    to: destination.get(key) ?? key,
    samples: card.samples[key],
    position: stainPositionOf(card, key),
    stainId: card.stain[key],
    travels: travelsWithStain.has(key),
  }));
  for (const { position, travels } of moved) {
    if (travels) delete card.stain[position];
  }
  for (const key of leaving) {
    delete card.samples[key];
    delete card.stainedIn[key];
  }
  for (const { to, samples: cells, position, stainId: stainId, travels } of moved) {
    if (cells) card.samples[to] = cells;
    if (travels) {
      if (stainId) card.stain[to] = stainId;
      else delete card.stain[to];
    } else if (cells && position !== to) {
      card.stainedIn[to] = position;
    }
  }
}
