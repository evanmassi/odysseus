import { BOARD_COLUMNS } from '../blocks/boardGeometry';
import { createId } from '../ids/createId';

import { labwareOf, type LabwareType } from './labwareCatalog';
import { cardColumnsFor } from './labwareSizing';
import { isWellFilled } from './wellSelection';

import type { PlateMapTab } from './plateMapTabs';
import type { PlateMapBlock } from '@odysseus/shared-schemas';

export type Labware = Pick<PlateMapBlock, 'plates' | 'sets'>;
type PlateFormat = PlateMapBlock['plates'][number]['vessel'];

const MOST_OF_A_KIND = 48;
const ROW_LETTERS = 'ABCDEFGHIJKLMNOP';

const isPlateType = (type: LabwareType): type is PlateFormat => 'rows' in labwareOf(type);

export function labwareCountOf(labware: Labware, type: LabwareType): number {
  if (isPlateType(type)) return labware.plates.filter(plate => plate.vessel === type).length;
  return labware.sets.find(set => set.vessel === type)?.count ?? 0;
}

export function withLabwareCount(labware: Labware, type: LabwareType, wanted: number): Labware {
  const count = Math.max(0, Math.min(MOST_OF_A_KIND, Math.round(wanted) || 0));
  if (isPlateType(type)) {
    const same = labware.plates.filter(plate => plate.vessel === type);
    const added = Array.from({ length: Math.max(0, count - same.length) }, () => ({
      id: createId(),
      vessel: type,
      name: '',
    }));
    const dropped = new Set(same.slice(count).map(plate => plate.id));
    return {
      plates: [...labware.plates.filter(plate => !dropped.has(plate.id)), ...added],
      sets: labware.sets,
    };
  }
  const { plates } = labware;
  const existing = labware.sets.find(set => set.vessel === type);
  if (!count) return { plates, sets: labware.sets.filter(set => set !== existing) };
  if (existing) {
    return { plates, sets: labware.sets.map(set => (set === existing ? { ...set, count } : set)) };
  }
  return { plates, sets: [...labware.sets, { id: createId(), vessel: type, count }] };
}

export const hasAnyLabware = (labware: Labware) => labware.plates.length + labware.sets.length > 0;

function wellFits(labware: Labware, key: string): boolean {
  const [owner, position] = key.split(':');
  const plate = labware.plates.find(candidate => candidate.id === owner);
  if (plate) {
    const plateLabware = labwareOf(plate.vessel);
    const row = ROW_LETTERS.indexOf(position[0]);
    const col = Number(position.slice(1));
    return (
      'rows' in plateLabware &&
      row >= 0 &&
      row < plateLabware.rows &&
      col >= 1 &&
      col <= plateLabware.cols
    );
  }
  const [setId, index] = owner.split('#');
  const set = labware.sets.find(candidate => candidate.id === setId);
  return position === '1' && !!set && Number(index) < set.count;
}

export const wellsLostTo = (block: PlateMapBlock, labware: Labware): number =>
  Object.keys(block.cells).filter(key => isWellFilled(block, key) && !wellFits(labware, key))
    .length;

export function applyLabware(block: PlateMapBlock, labware: Labware): void {
  const onlyFormatBefore = block.plates.length === 1 ? block.plates[0].vessel : undefined;
  block.plates = labware.plates;
  block.sets = labware.sets;
  for (const key of Object.keys(block.cells)) {
    if (!wellFits(labware, key)) delete block.cells[key];
  }
  for (const key of Object.keys(block.stain)) {
    if (!wellFits(labware, key)) delete block.stain[key];
  }
  for (const [key, position] of Object.entries(block.stainedIn)) {
    if (!wellFits(labware, key) || !wellFits(labware, position)) delete block.stainedIn[key];
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

export const withoutPlate = (labware: Labware, plateId: string): Labware => ({
  plates: labware.plates.filter(plate => plate.id !== plateId),
  sets: labware.sets,
});

type Plate = PlateMapBlock['plates'][number];
type Series = PlateMapBlock['series'][string];

const copyOfSeries = (series: Series): Series => ({
  ...series,
  ...('points' in series && { points: [...series.points] }),
  ...(series.prep && { prep: { ...series.prep } }),
});

export function duplicatePlateAsTab(block: PlateMapBlock, plate: Plate): void {
  const copy: Plate = { ...plate, id: createId(), name: plate.name ? `${plate.name} copy` : '' };
  block.plates.splice(block.plates.indexOf(plate) + 1, 0, copy);
  const freshSeries = new Map<string, string>();
  const seriesCopyOf = (seriesId: string) => {
    const known = freshSeries.get(seriesId);
    if (known) return known;
    const fresh = createId();
    freshSeries.set(seriesId, fresh);
    block.series[fresh] = copyOfSeries(block.series[seriesId]);
    return fresh;
  };
  const prefix = `${plate.id}:`;
  for (const [key, lines] of Object.entries(block.cells)) {
    if (!key.startsWith(prefix)) continue;
    const copied = Object.fromEntries(
      Object.entries(lines).map(([lineId, entry]) => [
        lineId,
        entry.seriesId === undefined
          ? { ...entry }
          : { ...entry, seriesId: seriesCopyOf(entry.seriesId) },
      ])
    );
    block.cells[`${copy.id}:${key.slice(prefix.length)}`] = copied;
  }
  const copied = (key: string) => `${copy.id}:${key.slice(prefix.length)}`;
  for (const [key, stainId] of Object.entries(block.stain)) {
    if (key.startsWith(prefix)) block.stain[copied(key)] = stainId;
  }
  for (const [key, position] of Object.entries(block.stainedIn)) {
    if (key.startsWith(prefix)) block.stainedIn[copied(key)] = copied(position);
  }
  block.activeTab = block.plates.indexOf(copy);
}

export function duplicateOfTab(block: PlateMapBlock, tab: PlateMapTab): PlateMapBlock {
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
  const renamedKey = (key: string) => {
    const prefix = [...renames.keys()].find(from => key.startsWith(from));
    return prefix && `${renames.get(prefix)}${key.slice(prefix.length)}`;
  };
  const renamed = <Value>(record: Record<string, Value>): Record<string, Value> =>
    Object.fromEntries(
      Object.entries(record).flatMap(([key, value]) => {
        const fresh = renamedKey(key);
        return fresh ? [[fresh, value]] : [];
      })
    );
  copy.cells = renamed(copy.cells);
  copy.stain = renamed(copy.stain);
  copy.stainedIn = Object.fromEntries(
    Object.entries(copy.stainedIn).flatMap(([key, position]) => {
      const [freshKey, freshPosition] = [renamedKey(key), renamedKey(position)];
      return freshKey && freshPosition ? [[freshKey, freshPosition]] : [];
    })
  );
  copy.counts = {};
  copy.activeTab = 0;
  const fitsBeside = block.x + block.w * 2 <= BOARD_COLUMNS;
  copy.x = fitsBeside ? block.x + block.w : block.x;
  copy.y = fitsBeside ? block.y : block.y + block.h;
  return copy;
}
