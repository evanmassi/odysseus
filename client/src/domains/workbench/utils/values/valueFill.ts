import { CELL_COUNT_FIELDS } from '../materials/materialCatalog';
import { writeDonorField } from '../materials/materialDonors';
import { writeMaterialField } from '../materials/materialItems';
import { editRecipeEntry } from '../materials/materialRecipe';

import { setPlateRowUnit, setPlateRowValue } from './plateValueRows';
import { addRoutedValue, materialsById, setValueAmount, setValueUnit } from './valueEdits';
import { joinValueName } from './valueNames';

import type { RoutedValue } from './valueRouting';
import type { ValueCell, ValueTableColumn, ValueTableGroup, ValueTableRow } from './valueTable';
import type { Protocol } from '@odysseus/shared-schemas';

export type FillTarget = { kind: 'cell'; cell: ValueCell } | { kind: 'slot'; routed: RoutedValue };

export const canAddToRow = (row: ValueTableRow): boolean =>
  !row.isSubRow && (row.valueRow !== undefined || row.material !== undefined);

export const columnUnit = (group: ValueTableGroup, key: string): string =>
  group.rows.flatMap(row => row.cells).find(cell => cell.columnKey === key && cell.unit)?.unit ??
  '';

export function slotRoute(
  group: ValueTableGroup,
  row: ValueTableRow,
  column: ValueTableColumn
): RoutedValue {
  return {
    line: { name: column.label, value: '', unit: columnUnit(group, column.key) },
    destination: {
      kind: 'row',
      shownOwner: row.shownName,
      materialId: row.material?.id,
      valueRowId: row.valueRow?.id,
      label: column.label,
    },
    fullName: joinValueName(row.name, column.label),
  };
}

export function fillTargets(group: ValueTableGroup, key: string): FillTarget[] {
  const column = group.columns.find(candidate => candidate.key === key);
  if (!column) return [];
  return group.rows.flatMap((row): FillTarget[] => {
    const cell = row.cells.find(candidate => candidate.columnKey === key);
    if (!cell) {
      return column.origin === 'typed' && canAddToRow(row)
        ? [{ kind: 'slot', routed: slotRoute(group, row, column) }]
        : [];
    }
    if (!cell.isEditable || cell.value.trim() || cell.workedValue) return [];
    return cell.linkedTo.kind === 'need'
      ? [{ kind: 'slot', routed: cell.linkedTo.routed }]
      : [{ kind: 'cell', cell }];
  });
}

type CountSource = Extract<ValueCell['linkedTo'], { kind: 'count' }>;

function writeCount(draft: Protocol, { materialId, donorId, count }: CountSource, value: string) {
  const material = materialsById(draft).get(materialId);
  const field = CELL_COUNT_FIELDS[count];
  if (!material) return;
  if (!donorId) {
    writeMaterialField(material, field, value);
    return;
  }
  const donor = material.sources?.rows.find(row => row.id === donorId);
  if (material.sources && donor) writeDonorField(material.sources, donor, field.key, value);
}

export function writeCellValue(
  draft: Protocol,
  cardId: string,
  cell: ValueCell,
  value: string
): void {
  const link = cell.linkedTo;
  if (link.kind === 'item') setValueAmount(draft, cardId, link.itemId, value);
  else if (link.kind === 'count') writeCount(draft, link, value);
  else if (link.kind === 'plate') setPlateRowValue(draft, link.row, value);
  else if (link.kind === 'recipe') {
    editRecipeEntry(draft, link.materialId, link.entryId, { amount: value });
  }
}

export function writeCellUnit(
  draft: Protocol,
  cardId: string,
  cell: ValueCell,
  unit: string
): void {
  const link = cell.linkedTo;
  if (link.kind === 'item') setValueUnit(draft, cardId, link.itemId, unit);
  else if (link.kind === 'plate') setPlateRowUnit(draft, link.row, unit);
  else if (link.kind === 'recipe') {
    editRecipeEntry(draft, link.materialId, link.entryId, { unit });
  }
}

export function fillBlanks(
  draft: Protocol,
  cardId: string,
  targets: readonly FillTarget[],
  value: string,
  unit: string
): void {
  for (const target of targets) {
    if (target.kind === 'slot') {
      addRoutedValue(draft, cardId, {
        ...target.routed,
        line: { ...target.routed.line, value, unit },
      });
      continue;
    }
    const { cell } = target;
    writeCellValue(draft, cardId, cell, value);
    if (cell.units === undefined || cell.units.includes(unit)) {
      writeCellUnit(draft, cardId, cell, unit);
    }
  }
}
