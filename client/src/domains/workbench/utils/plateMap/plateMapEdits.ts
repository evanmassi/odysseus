import { BOARD_COLUMNS } from '../cards/boardGeometry';
import { createId } from '../ids/createId';

import { labwareOf, type LabwareType } from './labwareCatalog';
import { cardColumnsFor } from './labwareSizing';
import { isWellFilled } from './wellSelection';

import type { PlateMapTab } from './plateMapTabs';
import type { PlateMapCard } from '@odysseus/shared-schemas';

export type Labware = Pick<PlateMapCard, 'plates' | 'sets'>;
type PlateFormat = PlateMapCard['plates'][number]['vessel'];

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

export const wellsLostTo = (card: PlateMapCard, labware: Labware): number =>
  Object.keys(card.cells).filter(key => isWellFilled(card, key) && !wellFits(labware, key)).length;

export function applyLabware(card: PlateMapCard, labware: Labware): void {
  const onlyFormatBefore = card.plates.length === 1 ? card.plates[0].vessel : undefined;
  card.plates = labware.plates;
  card.sets = labware.sets;
  for (const key of Object.keys(card.cells)) {
    if (!wellFits(labware, key)) delete card.cells[key];
  }
  for (const key of Object.keys(card.stain)) {
    if (!wellFits(labware, key)) delete card.stain[key];
  }
  for (const [key, position] of Object.entries(card.stainedIn)) {
    if (!wellFits(labware, key) || !wellFits(labware, position)) delete card.stainedIn[key];
  }
  card.activeTab = Math.min(card.activeTab, card.plates.length + (card.sets.length ? 1 : 0) - 1);
  const [onlyPlate] = card.plates;
  if (card.plates.length === 1 && onlyPlate.vessel !== onlyFormatBefore) {
    card.w = cardColumnsFor(onlyPlate.vessel);
    card.x = Math.min(card.x, BOARD_COLUMNS - card.w);
  }
}

export const withoutPlate = (labware: Labware, plateId: string): Labware => ({
  plates: labware.plates.filter(plate => plate.id !== plateId),
  sets: labware.sets,
});

type Plate = PlateMapCard['plates'][number];
type Series = PlateMapCard['series'][string];

const copyOfSeries = (series: Series): Series => ({
  ...series,
  ...('points' in series && { points: [...series.points] }),
  ...(series.prep && { prep: { ...series.prep } }),
});

export function duplicatePlateAsTab(card: PlateMapCard, plate: Plate): void {
  const copy: Plate = { ...plate, id: createId(), name: plate.name ? `${plate.name} copy` : '' };
  card.plates.splice(card.plates.indexOf(plate) + 1, 0, copy);
  const freshSeries = new Map<string, string>();
  const seriesCopyOf = (seriesId: string) => {
    const known = freshSeries.get(seriesId);
    if (known) return known;
    const fresh = createId();
    freshSeries.set(seriesId, fresh);
    card.series[fresh] = copyOfSeries(card.series[seriesId]);
    return fresh;
  };
  const prefix = `${plate.id}:`;
  for (const [key, lines] of Object.entries(card.cells)) {
    if (!key.startsWith(prefix)) continue;
    const copied = Object.fromEntries(
      Object.entries(lines).map(([lineId, entry]) => [
        lineId,
        entry.seriesId === undefined
          ? { ...entry }
          : { ...entry, seriesId: seriesCopyOf(entry.seriesId) },
      ])
    );
    card.cells[`${copy.id}:${key.slice(prefix.length)}`] = copied;
  }
  const copied = (key: string) => `${copy.id}:${key.slice(prefix.length)}`;
  for (const [key, stainId] of Object.entries(card.stain)) {
    if (key.startsWith(prefix)) card.stain[copied(key)] = stainId;
  }
  for (const [key, position] of Object.entries(card.stainedIn)) {
    if (key.startsWith(prefix)) card.stainedIn[copied(key)] = copied(position);
  }
  card.activeTab = card.plates.indexOf(copy);
}

export function duplicateOfTab(card: PlateMapCard, tab: PlateMapTab): PlateMapCard {
  const renames = new Map<string, string>();
  const copy = structuredClone(card);
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
    copy.shelfName = card.shelfName ? `${card.shelfName} copy` : undefined;
    copy.sets = card.sets.map(set => {
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
  const fitsBeside = card.x + card.w * 2 <= BOARD_COLUMNS;
  copy.x = fitsBeside ? card.x + card.w : card.x;
  copy.y = fitsBeside ? card.y : card.y + card.h;
  return copy;
}
