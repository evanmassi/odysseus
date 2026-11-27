import { prepRoundToId } from '../dilutions/dilutionCalculations';
import { dilutionRuns, type SeriesRef } from '../dilutions/dilutionRuns';
import { CELL_COUNTS, countId, type CountSubject } from '../materials/cellCounts';
import {
  CELL_COUNT_FIELDS,
  materialFields,
  materialValueId,
  type CellCount,
} from '../materials/materialCatalog';
import { writeDonorField } from '../materials/materialDonors';
import { writeMaterialField } from '../materials/materialItems';
import { editRecipeEntry } from '../materials/materialRecipe';
import { recipeAmountId } from '../materials/materialRecipeCalculations';
import { setPrepSetting } from '../plateMap/seriesEdits';

import {
  plateValueRows,
  setPlateRowUnit,
  setPlateRowValue,
  type PlateValueRow,
} from './plateValueRows';
import { materialsById, setValueAmount, setValueUnit } from './valueEdits';

import type { FieldDefinition, Protocol } from '@odysseus/shared-schemas';

type SavedNumbers = Pick<Protocol, 'materials' | 'values' | 'plateMaps'>;

export type ValueSource =
  | { kind: 'item'; itemId: string }
  | { kind: 'material'; materialId: string; field: FieldDefinition }
  | { kind: 'donor'; materialId: string; donorId: string; field: FieldDefinition }
  | { kind: 'plate'; row: PlateValueRow }
  | { kind: 'recipe'; materialId: string; entryId: string }
  | { kind: 'roundTo'; members: SeriesRef[] };

const COUNT_FIELDS: readonly FieldDefinition[] = Object.values(CELL_COUNT_FIELDS);

export const isCellCountSource = (source: ValueSource): boolean =>
  (source.kind === 'material' || source.kind === 'donor') &&
  COUNT_FIELDS.some(field => field.key === source.field.key);

export function countSource(
  { material, donor }: Pick<CountSubject, 'material' | 'donor'>,
  count: CellCount
): ValueSource {
  const field = CELL_COUNT_FIELDS[count];
  return donor
    ? { kind: 'donor', materialId: material.id, donorId: donor.id, field }
    : { kind: 'material', materialId: material.id, field };
}

function materialSourceOf(protocol: SavedNumbers, id: string): ValueSource | undefined {
  for (const material of protocol.materials.items) {
    const fields = [...materialFields(material), ...COUNT_FIELDS];
    const field = fields.find(definition => materialValueId(material.id, definition.key) === id);
    if (field) return { kind: 'material', materialId: material.id, field };
    const entry = material.recipe.find(
      candidate => recipeAmountId(material.id, candidate.id) === id
    );
    if (entry) return { kind: 'recipe', materialId: material.id, entryId: entry.id };
    for (const donor of material.donors?.rows ?? []) {
      const count = CELL_COUNTS.find(candidate => countId({ material, donor }, candidate) === id);
      if (count) return countSource({ material, donor }, count);
    }
  }
  return undefined;
}

export function valueSourceOf(protocol: SavedNumbers, id: string): ValueSource | undefined {
  if (protocol.values.items.some(item => item.id === id && 'name' in item)) {
    return { kind: 'item', itemId: id };
  }
  const material = materialSourceOf(protocol, id);
  if (material) return material;
  for (const plateMap of protocol.plateMaps) {
    const row = plateValueRows(plateMap).find(candidate => candidate.id === id);
    if (row) return { kind: 'plate', row };
  }
  const run = dilutionRuns(protocol).find(candidate => prepRoundToId(candidate) === id);
  return run && { kind: 'roundTo', members: run.members };
}

export function writeValueSource(draft: Protocol, source: ValueSource, value: string): void {
  switch (source.kind) {
    case 'item':
      setValueAmount(draft, source.itemId, value);
      return;
    case 'plate':
      setPlateRowValue(draft, source.row, value);
      return;
    case 'recipe':
      editRecipeEntry(draft, source.materialId, source.entryId, { amount: value });
      return;
    case 'roundTo':
      for (const { plateId, seriesId } of source.members) {
        setPrepSetting(draft, plateId, seriesId, 'roundTo', value);
      }
      return;
  }
  const material = materialsById(draft).get(source.materialId);
  if (!material) return;
  if (source.kind === 'material') {
    writeMaterialField(material, source.field, value);
    return;
  }
  const donor = material.donors?.rows.find(row => row.id === source.donorId);
  if (material.donors && donor) writeDonorField(material.donors, donor, source.field.key, value);
}

export function writeValueSourceUnit(draft: Protocol, source: ValueSource, unit: string): void {
  if (source.kind === 'item') setValueUnit(draft, source.itemId, unit);
  else if (source.kind === 'plate') setPlateRowUnit(draft, source.row, unit);
  else if (source.kind === 'recipe') {
    editRecipeEntry(draft, source.materialId, source.entryId, { unit });
  }
}
