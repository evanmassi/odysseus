import { VESSEL_PLURALS, vesselOf, wordsForTypes, type VesselWords } from './vesselCatalog';

import type { ProtocolBlock, VesselMapBlock } from '@odysseus/shared-schemas';

type Plate = VesselMapBlock['plates'][number];

export type VesselTab = { kind: 'plate'; id: string; plate: Plate } | { kind: 'shelf'; id: string };

export interface VesselSpot {
  key: string;
  label: string;
  row: number;
  col: number;
}

export interface VesselSheet {
  isPlate: boolean;
  rows: number;
  cols: number;
  spots: VesselSpot[];
}

const SHELF_TAB_ID = 'shelf';
const ROW_LETTERS = 'ABCDEFGHIJKLMNOP';

export const rowLetter = (row: number) => ROW_LETTERS[row];

export const vesselTabs = (block: VesselMapBlock): VesselTab[] => [
  ...block.plates.map((plate): VesselTab => ({ kind: 'plate', id: plate.id, plate })),
  ...(block.sets.length ? [{ kind: 'shelf' as const, id: SHELF_TAB_ID }] : []),
];

export function activeTabOf(block: VesselMapBlock): VesselTab {
  const tabs = vesselTabs(block);
  return tabs[Math.min(block.activeTab, tabs.length - 1)];
}

export const plateNameOf = (block: VesselMapBlock, plate: Plate) =>
  plate.name || `Plate ${block.plates.indexOf(plate) + 1}`;

export const shelfNameOf = (block: VesselMapBlock) =>
  block.shelfName?.trim() ? block.shelfName : shelfKinds(block);

function kindsList(words: readonly string[]): string {
  const [first = '', ...rest] = words;
  const listed = [first[0]?.toUpperCase() + first.slice(1), ...rest];
  return listed.length > 1
    ? `${listed.slice(0, -1).join(', ')} & ${listed[listed.length - 1]}`
    : listed.join('');
}

const shelfPlurals = (block: Pick<VesselMapBlock, 'sets'>) => [
  ...new Set(block.sets.map(set => VESSEL_PLURALS[vesselOf(set.vessel).noun])),
];

export const shelfKinds = (block: Pick<VesselMapBlock, 'sets'>): string =>
  kindsList(shelfPlurals(block));

export const tabWords = (block: VesselMapBlock, tab: VesselTab): VesselWords =>
  wordsForTypes(tab.kind === 'plate' ? [tab.plate.vessel] : block.sets.map(set => set.vessel));

const AUTOMATIC_TITLES = new Set(['', 'vessel map', 'plate map']);

export function labwareKinds(block: Pick<VesselMapBlock, 'plates' | 'sets'>): string {
  if (!block.sets.length) return 'Plate map';
  return kindsList([...(block.plates.length ? ['plates'] : []), ...shelfPlurals(block)]);
}

export const labwareTitle = (block: VesselMapBlock): string =>
  AUTOMATIC_TITLES.has(block.title.trim().toLowerCase()) ? labwareKinds(block) : block.title.trim();

export function labwareTitleOf(blocks: readonly ProtocolBlock[], cardId?: string): string {
  const cards = blocks.filter((block): block is VesselMapBlock => block.type === 'plate');
  const card =
    cards.find(block => block.id === cardId) ?? (cards.length === 1 ? cards[0] : undefined);
  return card ? labwareTitle(card) : 'Plate map';
}

function plateSheet(plate: Plate): VesselSheet {
  const vessel = vesselOf(plate.vessel);
  const rows = 'rows' in vessel ? vessel.rows : 1;
  const cols = 'cols' in vessel ? vessel.cols : 1;
  const spots = Array.from({ length: rows * cols }, (_, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const label = `${rowLetter(row)}${col + 1}`;
    return { key: `${plate.id}:${label}`, label, row, col };
  });
  return { isPlate: true, rows, cols, spots };
}

function shelfSheet(block: VesselMapBlock): VesselSheet {
  const numbered = new Map<string, number>();
  const spots = block.sets.flatMap((set, row) => {
    const vessel = vesselOf(set.vessel);
    const prefix = 'prefix' in vessel ? vessel.prefix : '';
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
  return { isPlate: false, rows: block.sets.length, cols, spots };
}

export const sheetOf = (block: VesselMapBlock, tab: VesselTab): VesselSheet =>
  tab.kind === 'plate' ? plateSheet(tab.plate) : shelfSheet(block);
