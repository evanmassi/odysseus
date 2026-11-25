import {
  LABWARE_KIND_PLURALS,
  labwareOf,
  wordsForTypes,
  type LabwareWords,
} from './labwareCatalog';

import type { ShownPlateMap } from './shownPlateMap';
import type { PlateMap } from '@odysseus/shared-schemas';

type Plate = PlateMap['plates'][number];

export type PlateMapTab =
  | { kind: 'plate'; id: string; plate: Plate }
  | { kind: 'otherLabware'; id: string };

export interface PlateMapPosition {
  key: string;
  label: string;
  row: number;
  col: number;
}

export interface PlateMapSheet {
  isPlate: boolean;
  rows: number;
  cols: number;
  positions: PlateMapPosition[];
}

const OTHER_LABWARE_TAB_ID = 'otherLabware';
const ROW_LETTERS = 'ABCDEFGHIJKLMNOP';

export const rowLetter = (row: number) => ROW_LETTERS[row];

export const plateMapTabs = (card: PlateMap): PlateMapTab[] => [
  ...card.plates.map((plate): PlateMapTab => ({ kind: 'plate', id: plate.id, plate })),
  ...(card.otherLabware.length
    ? [{ kind: 'otherLabware' as const, id: OTHER_LABWARE_TAB_ID }]
    : []),
];

export function activeTabOf(card: ShownPlateMap): PlateMapTab {
  const tabs = plateMapTabs(card);
  return tabs[Math.min(card.activeTab, tabs.length - 1)];
}

export const plateNameOf = (card: PlateMap, plate: Plate) =>
  plate.name || `Plate ${card.plates.indexOf(plate) + 1}`;

export const otherLabwareTabNameOf = (card: PlateMap) =>
  card.otherLabwareTabName?.trim() ? card.otherLabwareTabName : otherLabwareKinds(card);

function kindsList(words: readonly string[]): string {
  const [first = '', ...rest] = words;
  const listed = [first[0]?.toUpperCase() + first.slice(1), ...rest];
  return listed.length > 1
    ? `${listed.slice(0, -1).join(', ')} & ${listed[listed.length - 1]}`
    : listed.join('');
}

const otherLabwarePlurals = (card: Pick<PlateMap, 'otherLabware'>) => [
  ...new Set(card.otherLabware.map(set => LABWARE_KIND_PLURALS[labwareOf(set.labware).kind])),
];

export const otherLabwareKinds = (card: Pick<PlateMap, 'otherLabware'>): string =>
  kindsList(otherLabwarePlurals(card));

export const tabWords = (card: PlateMap, tab: PlateMapTab): LabwareWords =>
  wordsForTypes(
    tab.kind === 'plate' ? [tab.plate.labware] : card.otherLabware.map(set => set.labware)
  );

export function labwareKinds(card: Pick<PlateMap, 'plates' | 'otherLabware'>): string {
  if (!card.otherLabware.length) return 'Plate map';
  return kindsList([...(card.plates.length ? ['plates'] : []), ...otherLabwarePlurals(card)]);
}

export const labwareTitle = (card: PlateMap): string => card.title.trim() || labwareKinds(card);

export function labwareTitleOf(plateMaps: readonly PlateMap[], plateMapId?: string): string {
  const plateMap =
    plateMaps.find(candidate => candidate.id === plateMapId) ??
    (plateMaps.length === 1 ? plateMaps[0] : undefined);
  return plateMap ? labwareTitle(plateMap) : 'Plate map';
}

function plateSheet(plate: Plate): PlateMapSheet {
  const labware = labwareOf(plate.labware);
  const rows = 'rows' in labware ? labware.rows : 1;
  const cols = 'cols' in labware ? labware.cols : 1;
  const positions = Array.from({ length: rows * cols }, (_, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const label = `${rowLetter(row)}${col + 1}`;
    return { key: `${plate.id}:${label}`, label, row, col };
  });
  return { isPlate: true, rows, cols, positions };
}

function otherLabwareSheet(card: PlateMap): PlateMapSheet {
  const numbered = new Map<string, number>();
  const positions = card.otherLabware.flatMap((set, row) => {
    const labware = labwareOf(set.labware);
    const prefix = 'prefix' in labware ? labware.prefix : '';
    const before = numbered.get(prefix) ?? 0;
    numbered.set(prefix, before + set.count);
    return Array.from({ length: set.count }, (_, col) => ({
      key: `${set.id}#${col}:1`,
      label: `${prefix}${before + col + 1}`,
      row,
      col,
    }));
  });
  const cols = Math.max(0, ...card.otherLabware.map(set => set.count));
  return { isPlate: false, rows: card.otherLabware.length, cols, positions };
}

export const sheetOf = (card: PlateMap, tab: PlateMapTab): PlateMapSheet =>
  tab.kind === 'plate' ? plateSheet(tab.plate) : otherLabwareSheet(card);
