import { BOARD_COLUMNS } from '../cards/boardGeometry';
import { createId } from '../ids/createId';

import { labwareOf, type LabwareType } from './labwareCatalog';
import { cardColumnsFor } from './labwareSizing';
import { isWellFilled } from './wellSelection';

import type { PlateMapTab } from './plateMapTabs';
import type { PlateMapCard } from '@odysseus/shared-schemas';

export type Labware = Pick<PlateMapCard, 'plates' | 'otherLabware'>;
type PlateFormat = PlateMapCard['plates'][number]['labware'];

const MOST_OF_A_KIND = 48;
const ROW_LETTERS = 'ABCDEFGHIJKLMNOP';

const isPlateType = (type: LabwareType): type is PlateFormat => 'rows' in labwareOf(type);

export function labwareCountOf(labware: Labware, type: LabwareType): number {
  if (isPlateType(type)) return labware.plates.filter(plate => plate.labware === type).length;
  return labware.otherLabware.find(set => set.labware === type)?.count ?? 0;
}

export function withLabwareCount(labware: Labware, type: LabwareType, wanted: number): Labware {
  const count = Math.max(0, Math.min(MOST_OF_A_KIND, Math.round(wanted) || 0));
  if (isPlateType(type)) {
    const same = labware.plates.filter(plate => plate.labware === type);
    const added = Array.from({ length: Math.max(0, count - same.length) }, () => ({
      id: createId(),
      labware: type,
      name: '',
    }));
    const dropped = new Set(same.slice(count).map(plate => plate.id));
    return {
      plates: [...labware.plates.filter(plate => !dropped.has(plate.id)), ...added],
      otherLabware: labware.otherLabware,
    };
  }
  const { plates } = labware;
  const existing = labware.otherLabware.find(set => set.labware === type);
  if (!count) return { plates, otherLabware: labware.otherLabware.filter(set => set !== existing) };
  if (existing) {
    return {
      plates,
      otherLabware: labware.otherLabware.map(set => (set === existing ? { ...set, count } : set)),
    };
  }
  return {
    plates,
    otherLabware: [...labware.otherLabware, { id: createId(), labware: type, count }],
  };
}

export const hasAnyLabware = (labware: Labware) =>
  labware.plates.length + labware.otherLabware.length > 0;

function wellFits(labware: Labware, key: string): boolean {
  const [owner, position] = key.split(':');
  const plate = labware.plates.find(candidate => candidate.id === owner);
  if (plate) {
    const plateLabware = labwareOf(plate.labware);
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
  const set = labware.otherLabware.find(candidate => candidate.id === setId);
  return position === '1' && !!set && Number(index) < set.count;
}

export const wellsLostTo = (card: PlateMapCard, labware: Labware): number =>
  Object.keys(card.samples).filter(key => isWellFilled(card, key) && !wellFits(labware, key))
    .length;

export function applyLabware(card: PlateMapCard, labware: Labware): void {
  const onlyFormatBefore = card.plates.length === 1 ? card.plates[0].labware : undefined;
  card.plates = labware.plates;
  card.otherLabware = labware.otherLabware;
  for (const key of Object.keys(card.samples)) {
    if (!wellFits(labware, key)) delete card.samples[key];
  }
  for (const key of Object.keys(card.stain)) {
    if (!wellFits(labware, key)) delete card.stain[key];
  }
  for (const [key, position] of Object.entries(card.stainedIn)) {
    if (!wellFits(labware, key) || !wellFits(labware, position)) delete card.stainedIn[key];
  }
  card.activeTab = Math.min(
    card.activeTab,
    card.plates.length + (card.otherLabware.length ? 1 : 0) - 1
  );
  const [onlyPlate] = card.plates;
  if (card.plates.length === 1 && onlyPlate.labware !== onlyFormatBefore) {
    card.w = cardColumnsFor(onlyPlate.labware);
    card.x = Math.min(card.x, BOARD_COLUMNS - card.w);
  }
}

export const withoutPlate = (labware: Labware, plateId: string): Labware => ({
  plates: labware.plates.filter(plate => plate.id !== plateId),
  otherLabware: labware.otherLabware,
});

type Plate = PlateMapCard['plates'][number];
type Series = PlateMapCard['series'][string];

const copyOfSeries = (series: Series): Series => ({
  ...series,
  ...('typedValues' in series && { typedValues: [...series.typedValues] }),
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
  for (const [key, lines] of Object.entries(card.samples)) {
    if (!key.startsWith(prefix)) continue;
    const copied = Object.fromEntries(
      Object.entries(lines).map(([lineId, entry]) => [
        lineId,
        entry.seriesId === undefined
          ? { ...entry }
          : { ...entry, seriesId: seriesCopyOf(entry.seriesId) },
      ])
    );
    card.samples[`${copy.id}:${key.slice(prefix.length)}`] = copied;
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
    copy.otherLabware = [];
    delete copy.otherLabwareTabName;
  } else {
    copy.plates = [];
    copy.otherLabwareTabName = card.otherLabwareTabName
      ? `${card.otherLabwareTabName} copy`
      : undefined;
    copy.otherLabware = card.otherLabware.map(set => {
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
  copy.samples = renamed(copy.samples);
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
