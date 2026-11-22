import {
  LABWARE_KIND_PLURALS,
  labwareOf,
  wordsForTypes,
  type LabwareWords,
} from './labwareCatalog';

import type { ProtocolBlock, PlateMapBlock } from '@odysseus/shared-schemas';

type Plate = PlateMapBlock['plates'][number];

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

export const plateMapTabs = (block: PlateMapBlock): PlateMapTab[] => [
  ...block.plates.map((plate): PlateMapTab => ({ kind: 'plate', id: plate.id, plate })),
  ...(block.sets.length ? [{ kind: 'otherLabware' as const, id: OTHER_LABWARE_TAB_ID }] : []),
];

export function activeTabOf(block: PlateMapBlock): PlateMapTab {
  const tabs = plateMapTabs(block);
  return tabs[Math.min(block.activeTab, tabs.length - 1)];
}

export const plateNameOf = (block: PlateMapBlock, plate: Plate) =>
  plate.name || `Plate ${block.plates.indexOf(plate) + 1}`;

export const otherLabwareTabNameOf = (block: PlateMapBlock) =>
  block.shelfName?.trim() ? block.shelfName : otherLabwareKinds(block);

function kindsList(words: readonly string[]): string {
  const [first = '', ...rest] = words;
  const listed = [first[0]?.toUpperCase() + first.slice(1), ...rest];
  return listed.length > 1
    ? `${listed.slice(0, -1).join(', ')} & ${listed[listed.length - 1]}`
    : listed.join('');
}

const otherLabwarePlurals = (block: Pick<PlateMapBlock, 'sets'>) => [
  ...new Set(block.sets.map(set => LABWARE_KIND_PLURALS[labwareOf(set.vessel).kind])),
];

export const otherLabwareKinds = (block: Pick<PlateMapBlock, 'sets'>): string =>
  kindsList(otherLabwarePlurals(block));

export const tabWords = (block: PlateMapBlock, tab: PlateMapTab): LabwareWords =>
  wordsForTypes(tab.kind === 'plate' ? [tab.plate.vessel] : block.sets.map(set => set.vessel));

const AUTOMATIC_TITLES = new Set(['', 'vessel map', 'plate map']);

export function labwareKinds(block: Pick<PlateMapBlock, 'plates' | 'sets'>): string {
  if (!block.sets.length) return 'Plate map';
  return kindsList([...(block.plates.length ? ['plates'] : []), ...otherLabwarePlurals(block)]);
}

export const labwareTitle = (block: PlateMapBlock): string =>
  AUTOMATIC_TITLES.has(block.title.trim().toLowerCase()) ? labwareKinds(block) : block.title.trim();

export function labwareTitleOf(blocks: readonly ProtocolBlock[], cardId?: string): string {
  const cards = blocks.filter((block): block is PlateMapBlock => block.type === 'plate');
  const card =
    cards.find(block => block.id === cardId) ?? (cards.length === 1 ? cards[0] : undefined);
  return card ? labwareTitle(card) : 'Plate map';
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

function otherLabwareSheet(block: PlateMapBlock): PlateMapSheet {
  const numbered = new Map<string, number>();
  const positions = block.sets.flatMap((set, row) => {
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
  const cols = Math.max(0, ...block.sets.map(set => set.count));
  return { isPlate: false, rows: block.sets.length, cols, positions };
}

export const sheetOf = (block: PlateMapBlock, tab: PlateMapTab): PlateMapSheet =>
  tab.kind === 'plate' ? plateSheet(tab.plate) : otherLabwareSheet(block);
