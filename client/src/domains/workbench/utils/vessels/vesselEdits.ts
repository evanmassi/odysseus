import { BOARD_COLUMNS } from '../blocks/boardGeometry';
import { createId } from '../ids/createId';

import { vesselOf, type VesselType } from './vesselCatalog';
import { cardColumnsFor } from './vesselSizing';
import { isWellFilled } from './wellSelection';

import type { VesselTab } from './vesselTabs';
import type { VesselMapBlock } from '@odysseus/shared-schemas';

export type Vessels = Pick<VesselMapBlock, 'plates' | 'sets'>;
type PlateFormat = VesselMapBlock['plates'][number]['vessel'];

const MOST_OF_A_KIND = 48;
const ROW_LETTERS = 'ABCDEFGHIJKLMNOP';

const isPlateType = (type: VesselType): type is PlateFormat => 'rows' in vesselOf(type);

export function vesselCountOf(vessels: Vessels, type: VesselType): number {
  if (isPlateType(type)) return vessels.plates.filter(plate => plate.vessel === type).length;
  return vessels.sets.find(set => set.vessel === type)?.count ?? 0;
}

export function withVesselCount(vessels: Vessels, type: VesselType, wanted: number): Vessels {
  const count = Math.max(0, Math.min(MOST_OF_A_KIND, Math.round(wanted) || 0));
  if (isPlateType(type)) {
    const same = vessels.plates.filter(plate => plate.vessel === type);
    const added = Array.from({ length: Math.max(0, count - same.length) }, () => ({
      id: createId(),
      vessel: type,
      name: '',
    }));
    const dropped = new Set(same.slice(count).map(plate => plate.id));
    return {
      plates: [...vessels.plates.filter(plate => !dropped.has(plate.id)), ...added],
      sets: vessels.sets,
    };
  }
  const { plates } = vessels;
  const existing = vessels.sets.find(set => set.vessel === type);
  if (!count) return { plates, sets: vessels.sets.filter(set => set !== existing) };
  if (existing) {
    return { plates, sets: vessels.sets.map(set => (set === existing ? { ...set, count } : set)) };
  }
  return { plates, sets: [...vessels.sets, { id: createId(), vessel: type, count }] };
}

export const hasAnyVessel = (vessels: Vessels) => vessels.plates.length + vessels.sets.length > 0;

function wellFits(vessels: Vessels, key: string): boolean {
  const [owner, position] = key.split(':');
  const plate = vessels.plates.find(candidate => candidate.id === owner);
  if (plate) {
    const vessel = vesselOf(plate.vessel);
    const row = ROW_LETTERS.indexOf(position[0]);
    const col = Number(position.slice(1));
    return 'rows' in vessel && row >= 0 && row < vessel.rows && col >= 1 && col <= vessel.cols;
  }
  const [setId, index] = owner.split('#');
  const set = vessels.sets.find(candidate => candidate.id === setId);
  return position === '1' && !!set && Number(index) < set.count;
}

export const wellsLostTo = (block: VesselMapBlock, vessels: Vessels): number =>
  Object.keys(block.cells).filter(key => isWellFilled(block, key) && !wellFits(vessels, key))
    .length;

export function applyVessels(block: VesselMapBlock, vessels: Vessels): void {
  const onlyFormatBefore = block.plates.length === 1 ? block.plates[0].vessel : undefined;
  block.plates = vessels.plates;
  block.sets = vessels.sets;
  for (const key of Object.keys(block.cells)) {
    if (!wellFits(vessels, key)) delete block.cells[key];
  }
  block.activeTab = Math.min(
    block.activeTab,
    block.plates.length + (block.sets.length ? 1 : 0) - 1
  );
  const [onlyPlate] = block.plates;
  if (block.plates.length === 1 && onlyPlate.vessel !== onlyFormatBefore) {
    block.w = cardColumnsFor(onlyPlate.vessel);
    block.x = Math.min(block.x, BOARD_COLUMNS - block.w);
  }
}

export const withoutPlate = (vessels: Vessels, plateId: string): Vessels => ({
  plates: vessels.plates.filter(plate => plate.id !== plateId),
  sets: vessels.sets,
});

export function duplicateOfTab(block: VesselMapBlock, tab: VesselTab): VesselMapBlock {
  const renames = new Map<string, string>();
  const copy = structuredClone(block);
  copy.id = createId();
  if (tab.kind === 'plate') {
    const plate = {
      ...tab.plate,
      id: createId(),
      name: tab.plate.name ? `${tab.plate.name} copy` : '',
    };
    renames.set(`${tab.plate.id}:`, `${plate.id}:`);
    copy.plates = [plate];
    copy.sets = [];
    delete copy.shelfName;
  } else {
    copy.plates = [];
    copy.shelfName = block.shelfName ? `${block.shelfName} copy` : undefined;
    copy.sets = block.sets.map(set => {
      const fresh = { ...set, id: createId() };
      renames.set(`${set.id}#`, `${fresh.id}#`);
      return fresh;
    });
  }
  copy.cells = Object.fromEntries(
    Object.entries(copy.cells).flatMap(([key, lines]) => {
      const prefix = [...renames.keys()].find(from => key.startsWith(from));
      return prefix ? [[`${renames.get(prefix)}${key.slice(prefix.length)}`, lines]] : [];
    })
  );
  copy.counts = {};
  copy.activeTab = 0;
  const fitsBeside = block.x + block.w * 2 <= BOARD_COLUMNS;
  copy.x = fitsBeside ? block.x + block.w : block.x;
  copy.y = fitsBeside ? block.y : block.y + block.h;
  return copy;
}
