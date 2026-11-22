import {
  LABWARE_KIND_PLURALS,
  labwareOf,
  wordsForTypes,
  type LabwareWords,
} from './labwareCatalog';

import type { ProtocolCard, PlateMapCard } from '@odysseus/shared-schemas';

type Plate = PlateMapCard['plates'][number];

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

export const plateMapTabs = (card: PlateMapCard): PlateMapTab[] => [
  ...card.plates.map((plate): PlateMapTab => ({ kind: 'plate', id: plate.id, plate })),
  ...(card.sets.length ? [{ kind: 'otherLabware' as const, id: OTHER_LABWARE_TAB_ID }] : []),
];

export function activeTabOf(card: PlateMapCard): PlateMapTab {
  const tabs = plateMapTabs(card);
  return tabs[Math.min(card.activeTab, tabs.length - 1)];
}

export const plateNameOf = (card: PlateMapCard, plate: Plate) =>
  plate.name || `Plate ${card.plates.indexOf(plate) + 1}`;

export const otherLabwareTabNameOf = (card: PlateMapCard) =>
  card.shelfName?.trim() ? card.shelfName : otherLabwareKinds(card);

function kindsList(words: readonly string[]): string {
  const [first = '', ...rest] = words;
  const listed = [first[0]?.toUpperCase() + first.slice(1), ...rest];
  return listed.length > 1
    ? `${listed.slice(0, -1).join(', ')} & ${listed[listed.length - 1]}`
    : listed.join('');
}

const otherLabwarePlurals = (card: Pick<PlateMapCard, 'sets'>) => [
  ...new Set(card.sets.map(set => LABWARE_KIND_PLURALS[labwareOf(set.vessel).kind])),
];

export const otherLabwareKinds = (card: Pick<PlateMapCard, 'sets'>): string =>
  kindsList(otherLabwarePlurals(card));

export const tabWords = (card: PlateMapCard, tab: PlateMapTab): LabwareWords =>
  wordsForTypes(tab.kind === 'plate' ? [tab.plate.vessel] : card.sets.map(set => set.vessel));

const AUTOMATIC_TITLES = new Set(['', 'vessel map', 'plate map']);

export function labwareKinds(card: Pick<PlateMapCard, 'plates' | 'sets'>): string {
  if (!card.sets.length) return 'Plate map';
  return kindsList([...(card.plates.length ? ['plates'] : []), ...otherLabwarePlurals(card)]);
}

export const labwareTitle = (card: PlateMapCard): string =>
  AUTOMATIC_TITLES.has(card.title.trim().toLowerCase()) ? labwareKinds(card) : card.title.trim();

export function labwareTitleOf(cards: readonly ProtocolCard[], cardId?: string): string {
  const plateMaps = cards.filter((card): card is PlateMapCard => card.type === 'plate');
  const plateMap =
    plateMaps.find(card => card.id === cardId) ??
    (plateMaps.length === 1 ? plateMaps[0] : undefined);
  return plateMap ? labwareTitle(plateMap) : 'Plate map';
}

function plateSheet(plate: Plate): PlateMapSheet {
  const labware = labwareOf(plate.vessel);
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

function otherLabwareSheet(card: PlateMapCard): PlateMapSheet {
  const numbered = new Map<string, number>();
  const positions = card.sets.flatMap((set, row) => {
    const labware = labwareOf(set.vessel);
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
  const cols = Math.max(0, ...card.sets.map(set => set.count));
  return { isPlate: false, rows: card.sets.length, cols, positions };
}

export const sheetOf = (card: PlateMapCard, tab: PlateMapTab): PlateMapSheet =>
  tab.kind === 'plate' ? plateSheet(tab.plate) : otherLabwareSheet(card);
