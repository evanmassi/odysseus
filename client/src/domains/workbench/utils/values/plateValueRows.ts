import { normalizePlateMap, type Protocol, type PlateMap } from '@odysseus/shared-schemas';

import {
  plateAmounts,
  plateMapCounts,
  type PlateAmount,
  type PlateMapCount,
} from '../plateMap/plateMapNames';
import { removeSeries } from '../plateMap/seriesEdits';

export type PlateRowSource =
  | { kind: 'count'; count: PlateMapCount }
  | { kind: 'amount'; amount: PlateAmount };

export interface PlateValueRow {
  id: string;
  plateId: string;
  name: string;
  source: PlateRowSource;
}

export function plateValueRows(
  plateMap: PlateMap,
  seriesById: Protocol['series']
): PlateValueRow[] {
  const counts = plateMapCounts(plateMap)
    .filter(count => count.kind !== 'total' || count.count > 1)
    .map(
      (count): PlateValueRow => ({
        id: `${plateMap.id}:${count.key}`,
        plateId: plateMap.id,
        name: count.name,
        source: { kind: 'count', count },
      })
    );
  const amounts = plateAmounts(plateMap, seriesById).map(
    (amount): PlateValueRow => ({
      id: `${plateMap.id}:${amount.key}`,
      plateId: plateMap.id,
      name: amount.name,
      source: { kind: 'amount', amount },
    })
  );
  return [...counts, ...amounts];
}

const plateOf = (draft: Protocol, plateId: string): PlateMap | undefined =>
  draft.plateMaps.find(plateMap => plateMap.id === plateId);

function editPlate(draft: Protocol, plateId: string, change: (plateMap: PlateMap) => void) {
  const plateMap = plateOf(draft, plateId);
  if (!plateMap) return;
  change(plateMap);
  normalizePlateMap(plateMap);
}

export function setPlateRowValue(draft: Protocol, row: PlateValueRow, typed: string): void {
  editPlate(draft, row.plateId, plateMap => {
    const { source } = row;
    if (source.kind === 'count') {
      const { key, tally } = source.count;
      if (typed.trim() && typed.trim() !== String(tally)) plateMap.counts[key] = typed.trim();
      else delete plateMap.counts[key];
      return;
    }
    const from = source.amount.source;
    if (from.kind === 'wells') {
      for (const key of from.keys) {
        const entry = plateMap.samples[key]?.[from.lineId];
        if (entry) entry.amount = typed;
      }
    } else if (from.kind === 'series') {
      const series = draft.series[from.seriesId];
      if (series && 'top' in series) series[from.field] = typed;
    }
  });
}

export function setPlateRowUnit(draft: Protocol, row: PlateValueRow, unit: string): void {
  if (row.source.kind !== 'amount') return;
  const from = row.source.amount.source;
  editPlate(draft, row.plateId, plateMap => {
    if (from.kind === 'wells') {
      for (const key of from.keys) {
        const entry = plateMap.samples[key]?.[from.lineId];
        if (entry) entry.unit = unit;
      }
    } else if (from.kind === 'series' && from.field === 'top') {
      const series = draft.series[from.seriesId];
      if (series && 'top' in series) series.unit = unit;
    }
  });
}

export const canRemovePlateRow = (row: PlateValueRow) =>
  row.source.kind === 'amount' || row.source.count.kind === 'value';

export function removePlateRow(draft: Protocol, row: PlateValueRow): void {
  editPlate(draft, row.plateId, plateMap => {
    const { source } = row;
    if (source.kind === 'count') {
      for (const lines of Object.values(plateMap.samples)) {
        for (const entry of Object.values(lines)) {
          if (entry.valueId === source.count.key) delete entry.valueId;
        }
      }
      return;
    }
    const from = source.amount.source;
    if (from.kind !== 'wells') return removeSeries(plateMap, from.seriesId);
    for (const key of from.keys) {
      const entry = plateMap.samples[key]?.[from.lineId];
      if (!entry) continue;
      delete entry.amount;
      delete entry.unit;
    }
  });
}
