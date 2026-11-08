import {
  normalizeVesselMap,
  type MaterialItem,
  type Protocol,
  type ValuesBlock,
  type VesselMapBlock,
} from '@odysseus/shared-schemas';

import { normalizeMaterialKey } from '../materials/materialGuesser';
import { removeSeries } from '../vessels/seriesEdits';
import {
  plateAmounts,
  vesselCounts,
  type PlateAmount,
  type VesselCount,
} from '../vessels/vesselMapNames';

import { joinValueName } from './valueNames';

export type PlateRowSource =
  | { kind: 'count'; count: VesselCount }
  | { kind: 'amount'; amount: PlateAmount };

export interface PlateValueRow {
  id: string;
  plateId: string;
  sectionId: string;
  name: string;
  source: PlateRowSource;
}

const VESSEL_PLURAL_ENDING = /\s+(?:wells|flasks|dishes|tubes|vessels)$/i;

const isVesselMap = (block: Protocol['blocks'][number]): block is VesselMapBlock =>
  block.type === 'plate';

function plateFor(protocol: Protocol, material: MaterialItem): VesselMapBlock | undefined {
  const plates = protocol.blocks.filter(isVesselMap);
  const key = normalizeMaterialKey(material.name);
  return (
    plates.find(plate => key && normalizeMaterialKey(plate.title).includes(key)) ??
    (plates.length === 1 ? plates[0] : undefined)
  );
}

export function plateValueRows(
  protocol: Protocol,
  block: ValuesBlock,
  materials: ReadonlyMap<string, MaterialItem>
): PlateValueRow[] {
  const valuesBlocks = protocol.blocks.filter(
    (candidate): candidate is ValuesBlock => candidate.type === 'values'
  );
  const materialSections = valuesBlocks.flatMap(values =>
    values.sections.flatMap(section => {
      const material = 'materialId' in section ? materials.get(section.materialId) : undefined;
      return material ? [{ values, section, material }] : [];
    })
  );
  return protocol.blocks.filter(isVesselMap).flatMap(plate => {
    const plateSections = materialSections.filter(
      ({ material }) => material.type === 'Plate' && plateFor(protocol, material) === plate
    );
    const counts = plateSections
      .filter(({ values }) => values.id === block.id)
      .flatMap(({ section }) =>
        vesselCounts(plate)
          .filter(count => count.kind !== 'total' || count.count > 1)
          .map(
            (count): PlateValueRow => ({
              id: `${plate.id}:${count.key}`,
              plateId: plate.id,
              sectionId: section.id,
              name: count.name,
              source: { kind: 'count', count },
            })
          )
      );
    const amounts = plateAmounts(plate).flatMap((amount): PlateValueRow[] => {
      const subject = normalizeMaterialKey(amount.subject);
      const home =
        materialSections.find(({ material }) => normalizeMaterialKey(material.name) === subject) ??
        plateSections[0];
      if ((home?.values.id ?? valuesBlocks[0]?.id) !== block.id) return [];
      return [
        {
          id: `${plate.id}:${amount.key}`,
          plateId: plate.id,
          sectionId: home?.section.id ?? '',
          name: amount.name,
          source: { kind: 'amount', amount },
        },
      ];
    });
    return [...counts, ...amounts];
  });
}

export function labelInSection(name: string, ownerName: string): string {
  const prefix = `${ownerName.toLowerCase()} `;
  if (!ownerName || !name.toLowerCase().startsWith(prefix)) return name;
  const rest = name.slice(prefix.length);
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

function plateOf(draft: Protocol, plateId: string): VesselMapBlock | undefined {
  const plate = draft.blocks.find(candidate => candidate.id === plateId);
  return plate && isVesselMap(plate) ? plate : undefined;
}

function editPlate(draft: Protocol, plateId: string, change: (plate: VesselMapBlock) => void) {
  const plate = plateOf(draft, plateId);
  if (!plate) return;
  change(plate);
  normalizeVesselMap(plate);
}

export function renamePlateRow(
  draft: Protocol,
  row: PlateValueRow,
  typed: string,
  ownerName: string
): void {
  editPlate(draft, row.plateId, plate => {
    const { source } = row;
    if (source.kind === 'amount') {
      const full = typed.trim() && joinValueName(ownerName, typed.trim());
      if (full && full !== source.amount.automaticName) plate.amountNames[source.amount.key] = full;
      else delete plate.amountNames[source.amount.key];
      return;
    }
    const text = typed.replace(VESSEL_PLURAL_ENDING, '').trim();
    const value = plate.lines
      .flatMap(line => line.values)
      .find(candidate => candidate.id === source.count.key);
    if (value && text) value.text = text;
  });
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
