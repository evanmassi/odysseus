import { normalizePlateMap } from '@odysseus/shared-schemas';

import { BOARD_COLUMNS } from '../cards/boardGeometry';
import { cardsShowing } from '../cards/createCard';
import { createId } from '../ids/createId';

import { labwareOf, type LabwareType } from './labwareCatalog';
import { cardColumnsFor } from './labwareSizing';
import { isWellFilled } from './wellSelection';

import type { PlateMapTab } from './plateMapTabs';
import type { PlateMap, Protocol } from '@odysseus/shared-schemas';

export type Labware = Pick<PlateMap, 'plates' | 'otherLabware'>;

export const newPlateMap = (): PlateMap => ({
  id: createId(),
  title: '',
  plates: [{ id: createId(), labware: '96', name: '' }],
  otherLabware: [],
  lines: [],
  samples: {},
  series: {},
  counts: {},
  amountNames: {},
  stain: {},
  stainedIn: {},
});
type PlateFormat = PlateMap['plates'][number]['labware'];

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

export const wellsLostTo = (plateMap: PlateMap, labware: Labware): number =>
  Object.keys(plateMap.samples).filter(
    key => isWellFilled(plateMap, key) && !wellFits(labware, key)
  ).length;

const onlyFormatOf = (plateMap: PlateMap) =>
  plateMap.plates.length === 1 ? plateMap.plates[0].labware : undefined;

export function applyLabware(
  draft: Pick<Protocol, 'cards' | 'plateMaps'>,
  plateMapId: string,
  labware: Labware
): void {
  const plateMap = draft.plateMaps.find(candidate => candidate.id === plateMapId);
  if (!plateMap) return;
  const formatBefore = onlyFormatOf(plateMap);
  plateMap.plates = labware.plates;
  plateMap.otherLabware = labware.otherLabware;
  for (const key of Object.keys(plateMap.samples)) {
    if (!wellFits(labware, key)) delete plateMap.samples[key];
  }
  for (const key of Object.keys(plateMap.stain)) {
    if (!wellFits(labware, key)) delete plateMap.stain[key];
  }
  for (const [key, position] of Object.entries(plateMap.stainedIn)) {
    if (!wellFits(labware, key) || !wellFits(labware, position)) delete plateMap.stainedIn[key];
  }
  normalizePlateMap(plateMap);
  const format = onlyFormatOf(plateMap);
  if (!format || format === formatBefore) return;
  for (const plateCard of cardsShowing(draft.cards, plateMapId)) {
    plateCard.w = cardColumnsFor(format);
    plateCard.x = Math.min(plateCard.x, BOARD_COLUMNS - plateCard.w);
  }
}

export const withoutPlate = (labware: Labware, plateId: string): Labware => ({
  plates: labware.plates.filter(plate => plate.id !== plateId),
  otherLabware: labware.otherLabware,
});

type Plate = PlateMap['plates'][number];
type Series = PlateMap['series'][string];

const copyOfSeries = (series: Series): Series => ({
  ...series,
  ...('typedValues' in series && { typedValues: [...series.typedValues] }),
  ...(series.prep && { prep: { ...series.prep } }),
});

export function duplicatePlateAsTab(plateMap: PlateMap, plate: Plate): number {
  const copy: Plate = { ...plate, id: createId(), name: plate.name ? `${plate.name} copy` : '' };
  plateMap.plates.splice(plateMap.plates.indexOf(plate) + 1, 0, copy);
  const freshSeries = new Map<string, string>();
  const seriesCopyOf = (seriesId: string) => {
    const known = freshSeries.get(seriesId);
    if (known) return known;
    const fresh = createId();
    freshSeries.set(seriesId, fresh);
    plateMap.series[fresh] = copyOfSeries(plateMap.series[seriesId]);
    return fresh;
  };
  const prefix = `${plate.id}:`;
  for (const [key, lines] of Object.entries(plateMap.samples)) {
    if (!key.startsWith(prefix)) continue;
    const copied = Object.fromEntries(
      Object.entries(lines).map(([lineId, entry]) => [
        lineId,
        entry.seriesId === undefined
          ? { ...entry }
          : { ...entry, seriesId: seriesCopyOf(entry.seriesId) },
      ])
    );
    plateMap.samples[`${copy.id}:${key.slice(prefix.length)}`] = copied;
  }
  const copied = (key: string) => `${copy.id}:${key.slice(prefix.length)}`;
  for (const [key, stainId] of Object.entries(plateMap.stain)) {
    if (key.startsWith(prefix)) plateMap.stain[copied(key)] = stainId;
  }
  for (const [key, position] of Object.entries(plateMap.stainedIn)) {
    if (key.startsWith(prefix)) plateMap.stainedIn[copied(key)] = copied(position);
  }
  return plateMap.plates.indexOf(copy);
}

export function duplicateOfTab(plateMap: PlateMap, tab: PlateMapTab): PlateMap {
  const renames = new Map<string, string>();
  const copy = structuredClone(plateMap);
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
    copy.otherLabwareTabName = plateMap.otherLabwareTabName
      ? `${plateMap.otherLabwareTabName} copy`
      : undefined;
    copy.otherLabware = plateMap.otherLabware.map(set => {
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
  return copy;
}
