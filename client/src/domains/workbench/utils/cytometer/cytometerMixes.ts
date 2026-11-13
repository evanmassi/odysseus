import { createId } from '../ids/createId';

import type { PanelLayout, PanelStain } from './cytometerPanel';
import type { CytometerBlock } from '@odysseus/shared-schemas';

type Mix = CytometerBlock['mixes'][number];

export interface MixColumn {
  stain: PanelStain;
  color: string;
  laserColor: string;
  label: string;
}

const stainLabel = (stain: PanelStain): string =>
  [stain.marker, stain.fluorochrome].filter(Boolean).join(' ') ||
  ([stain.material?.name.trim()].find(Boolean) ?? 'Stain');

export const mixColumns = (layout: PanelLayout): MixColumn[] =>
  layout.lasers.flatMap(laser =>
    laser.slots.flatMap(slot =>
      slot.stains.map(stain => ({
        stain,
        color: stain.dyeColor ?? slot.color,
        laserColor: laser.color,
        label: stainLabel(stain),
      }))
    )
  );

const newMix = (name: string, rowIds: string[]): Mix => ({
  id: createId(),
  name,
  rowIds,
  plus: [],
});

const rowIdsOf = (columns: readonly MixColumn[]) => columns.map(column => column.stain.row.id);

export const fullStainMix = (columns: readonly MixColumn[]): Mix =>
  newMix('Full Stain', rowIdsOf(columns));

export const unstainedMix = (): Mix => newMix('Unstained', []);

export const emptyMix = (): Mix => newMix('New mix', []);

export const singleStainMixes = (columns: readonly MixColumn[]): Mix[] =>
  columns.map(column => newMix(`Single ${column.label}`, [column.stain.row.id]));

export function fmoMix(columns: readonly MixColumn[], leftOutRowId: string): Mix | undefined {
  const leftOut = columns.find(column => column.stain.row.id === leftOutRowId);
  if (!leftOut) return undefined;
  return newMix(
    `FMO ${[leftOut.stain.marker].find(Boolean) ?? leftOut.label}`,
    rowIdsOf(columns.filter(column => column !== leftOut))
  );
}
