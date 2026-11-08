import { VESSEL_PLURALS, vesselOf } from './vesselCatalog';

import type { VesselMapBlock } from '@odysseus/shared-schemas';

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
  block.shelfName?.trim() ? block.shelfName : 'Group 1';

export function shelfKinds(block: VesselMapBlock): string {
  const words = [...new Set(block.sets.map(set => VESSEL_PLURALS[vesselOf(set.vessel).noun]))];
  return words
    .map((word, index) => (index ? word : word[0].toUpperCase() + word.slice(1)))
    .join(' & ');
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
