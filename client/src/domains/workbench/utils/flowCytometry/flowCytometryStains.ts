import { createId } from '../ids/createId';

import type { PanelLayout, PanelMarker } from './flowCytometryPanel';
import type { Stain } from '@odysseus/shared-schemas';

export interface MarkerColumn {
  marker: PanelMarker;
  color: string;
  laserColor: string;
  label: string;
}

const markerLabel = (marker: PanelMarker): string =>
  [marker.markerName, marker.fluor].filter(Boolean).join(' ') ||
  ([marker.material?.name.trim()].find(Boolean) ?? 'Marker');

export const markerColumns = (layout: PanelLayout): MarkerColumn[] =>
  layout.lasers.flatMap(laser =>
    laser.slots.flatMap(slot =>
      slot.markers.map(marker => ({
        marker,
        color: marker.fluorColor ?? slot.color,
        laserColor: laser.color,
        label: markerLabel(marker),
      }))
    )
  );

const newStain = (name: string, rowIds: string[]): Stain => ({
  id: createId(),
  name,
  rowIds,
  plus: [],
});

const rowIdsOf = (columns: readonly MarkerColumn[]) => columns.map(column => column.marker.row.id);

export const fullStain = (columns: readonly MarkerColumn[]): Stain =>
  newStain('Full stain', rowIdsOf(columns));

export const unstainedControl = (): Stain => newStain('Unstained', []);

export const emptyStain = (): Stain => newStain('New stain', []);

export const singleStains = (columns: readonly MarkerColumn[]): Stain[] =>
  columns.map(column => newStain(`Single ${column.label}`, [column.marker.row.id]));

export function fmoStain(
  columns: readonly MarkerColumn[],
  leftOutRowId: string
): Stain | undefined {
  const leftOut = columns.find(column => column.marker.row.id === leftOutRowId);
  if (!leftOut) return undefined;
  return newStain(
    `FMO ${[leftOut.marker.markerName].find(Boolean) ?? leftOut.label}`,
    rowIdsOf(columns.filter(column => column !== leftOut))
  );
}
