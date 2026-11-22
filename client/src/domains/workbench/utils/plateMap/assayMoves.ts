import { forgetStainOf, isAtHome, stainSamples, stainPositionOf } from './stainLayout';
import { isWellFilled } from './wellSelection';

import type { PlateMapSheet } from './plateMapTabs';
import type { PlateMapBlock } from '@odysseus/shared-schemas';

export function moveAssayWells(
  block: PlateMapBlock,
  sheet: PlateMapSheet,
  cutKeys: ReadonlySet<string>,
  landing: readonly string[]
): void {
  const leaving = sheet.positions
    .filter(position => cutKeys.has(position.key))
    .map(position => position.key);
  const replaced = new Set(landing.filter(key => !cutKeys.has(key) && isWellFilled(block, key)));
  forgetStainOf(block, replaced);
  for (const key of replaced) delete block.cells[key];

  const samples = stainSamples(block, sheet);
  const destination = new Map(leaving.map((key, index) => [key, landing[index]]));
  const travelsWithStain = new Set(
    leaving.filter(key => isWellFilled(block, key) && isAtHome(samples, key))
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
    cells: block.cells[key],
    position: stainPositionOf(block, key),
    stainId: block.stain[key],
    travels: travelsWithStain.has(key),
  }));
  for (const { position, travels } of moved) {
    if (travels) delete block.stain[position];
  }
  for (const key of leaving) {
    delete block.cells[key];
    delete block.stainedIn[key];
  }
  for (const { to, cells, position, stainId: stainId, travels } of moved) {
    if (cells) block.cells[to] = cells;
    if (travels) {
      if (stainId) block.stain[to] = stainId;
      else delete block.stain[to];
    } else if (cells && position !== to) {
      block.stainedIn[to] = position;
    }
  }
}
