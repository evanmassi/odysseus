import { forgetStainOf, isAtHome, stainOccupants, stainSpotOf } from './stainLayout';
import { isWellFilled } from './wellSelection';

import type { VesselSheet } from './vesselTabs';
import type { VesselMapBlock } from '@odysseus/shared-schemas';

export function moveAssayWells(
  block: VesselMapBlock,
  sheet: VesselSheet,
  cutKeys: ReadonlySet<string>,
  landing: readonly string[]
): void {
  const leaving = sheet.spots.filter(spot => cutKeys.has(spot.key)).map(spot => spot.key);
  const replaced = new Set(landing.filter(key => !cutKeys.has(key) && isWellFilled(block, key)));
  forgetStainOf(block, replaced);
  for (const key of replaced) delete block.cells[key];

  const occupants = stainOccupants(block, sheet);
  const destination = new Map(leaving.map((key, index) => [key, landing[index]]));
  const travelsWithStain = new Set(
    leaving.filter(key => isWellFilled(block, key) && isAtHome(occupants, key))
  );
  for (let isSettled = false; !isSettled; ) {
    isSettled = true;
    for (const key of travelsWithStain) {
      const arriving = occupants.get(destination.get(key) ?? '') ?? [];
      if (arriving.every(well => travelsWithStain.has(well))) continue;
      travelsWithStain.delete(key);
      isSettled = false;
    }
  }

  const moved = leaving.map(key => ({
    to: destination.get(key) ?? key,
    cells: block.cells[key],
    spot: stainSpotOf(block, key),
    mix: block.stain[key],
    travels: travelsWithStain.has(key),
  }));
  for (const { spot, travels } of moved) {
    if (travels) delete block.stain[spot];
  }
  for (const key of leaving) {
    delete block.cells[key];
    delete block.stainedIn[key];
  }
  for (const { to, cells, spot, mix, travels } of moved) {
    if (cells) block.cells[to] = cells;
    if (travels) {
      if (mix) block.stain[to] = mix;
      else delete block.stain[to];
    } else if (cells && spot !== to) {
      block.stainedIn[to] = spot;
    }
  }
}
