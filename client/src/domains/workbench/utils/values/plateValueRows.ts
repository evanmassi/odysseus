import { normalizeVesselMap, type Protocol, type VesselMapBlock } from '@odysseus/shared-schemas';

import { removeSeries } from '../vessels/seriesEdits';
import {
  plateAmounts,
  vesselCounts,
  type PlateAmount,
  type VesselCount,
} from '../vessels/vesselMapNames';

export type PlateRowSource =
  | { kind: 'count'; count: VesselCount }
  | { kind: 'amount'; amount: PlateAmount };

export interface PlateValueRow {
  id: string;
  plateId: string;
  name: string;
  source: PlateRowSource;
}

export function plateValueRows(plate: VesselMapBlock): PlateValueRow[] {
  const counts = vesselCounts(plate)
    .filter(count => count.kind !== 'total' || count.count > 1)
    .map(
      (count): PlateValueRow => ({
        id: `${plate.id}:${count.key}`,
        plateId: plate.id,
        name: count.name,
        source: { kind: 'count', count },
      })
    );
  const amounts = plateAmounts(plate).map(
    (amount): PlateValueRow => ({
      id: `${plate.id}:${amount.key}`,
      plateId: plate.id,
      name: amount.name,
      source: { kind: 'amount', amount },
    })
  );
  return [...counts, ...amounts];
}

function plateOf(draft: Protocol, plateId: string): VesselMapBlock | undefined {
  const plate = draft.blocks.find(candidate => candidate.id === plateId);
  return plate?.type === 'plate' ? plate : undefined;
}

function editPlate(draft: Protocol, plateId: string, change: (plate: VesselMapBlock) => void) {
  const plate = plateOf(draft, plateId);
  if (!plate) return;
  change(plate);
  normalizeVesselMap(plate);
}

export function setPlateRowValue(draft: Protocol, row: PlateValueRow, typed: string): void {
  editPlate(draft, row.plateId, plate => {
    const { source } = row;
    if (source.kind === 'count') {
      const { key, tally } = source.count;
      if (typed.trim() && typed.trim() !== String(tally)) plate.counts[key] = typed.trim();
      else delete plate.counts[key];
      return;
    }
    const from = source.amount.source;
    if (from.kind === 'wells') {
      for (const key of from.keys) {
        const cell = plate.cells[key]?.[from.lineId];
        if (cell) cell.amount = typed;
      }
    } else if (from.kind === 'series') {
      const series = plate.series[from.seriesId];
      if (series && 'start' in series) series[from.field] = typed;
    }
  });
}

export function setPlateRowUnit(draft: Protocol, row: PlateValueRow, unit: string): void {
  if (row.source.kind !== 'amount') return;
  const from = row.source.amount.source;
  editPlate(draft, row.plateId, plate => {
    if (from.kind === 'wells') {
      for (const key of from.keys) {
        const cell = plate.cells[key]?.[from.lineId];
        if (cell) cell.unit = unit;
      }
    } else if (from.kind === 'series' && from.field === 'start') {
      const series = plate.series[from.seriesId];
      if (series && 'start' in series) series.unit = unit;
    }
  });
}

export const canRemovePlateRow = (row: PlateValueRow) =>
  row.source.kind === 'amount' || row.source.count.kind === 'value';

export function removePlateRow(draft: Protocol, row: PlateValueRow): void {
  editPlate(draft, row.plateId, plate => {
    const { source } = row;
    if (source.kind === 'count') {
      for (const lines of Object.values(plate.cells)) {
        for (const cell of Object.values(lines)) {
          if (cell.valueId === source.count.key) delete cell.valueId;
        }
      }
      return;
    }
    const from = source.amount.source;
    if (from.kind !== 'wells') return removeSeries(plate, from.seriesId);
    for (const key of from.keys) {
      const cell = plate.cells[key]?.[from.lineId];
      if (!cell) continue;
      delete cell.amount;
      delete cell.unit;
    }
  });
}
