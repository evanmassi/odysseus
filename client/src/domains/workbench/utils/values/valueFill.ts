import { editRecipeEntry } from '../materials/materialRecipe';

import { setPlateRowUnit, setPlateRowValue } from './plateValueRows';
import { addRoutedValue, setValueAmount, setValueUnit } from './valueEdits';
import { joinValueName } from './valueNames';

import type { RoutedValue } from './valueRouting';
import type {
  ValueTableCell,
  ValueTableColumn,
  ValueTableGroup,
  ValueTableRow,
} from './valueTable';
import type { Protocol } from '@odysseus/shared-schemas';

export type FillTarget =
  | { kind: 'cell'; cell: ValueTableCell }
  | { kind: 'slot'; routed: RoutedValue };

export const canAddToRow = (row: ValueTableRow): boolean =>
  !row.isSubRow && (row.section !== undefined || row.material !== undefined);

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
      sectionId: row.section?.id,
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
    if (!cell.isEditable || cell.value.trim()) return [];
    return cell.source.kind === 'need'
      ? [{ kind: 'slot', routed: cell.source.routed }]
      : [{ kind: 'cell', cell }];
  });
}

export function writeCellValue(
  draft: Protocol,
  blockId: string,
  cell: ValueTableCell,
  value: string
): void {
  const { source } = cell;
  if (source.kind === 'item') setValueAmount(draft, blockId, source.itemId, value);
  else if (source.kind === 'plate') setPlateRowValue(draft, source.row, value);
  else if (source.kind === 'recipe') {
    editRecipeEntry(draft, source.materialId, source.entryId, { amount: value });
  }
}

export function writeCellUnit(
  draft: Protocol,
  blockId: string,
  cell: ValueTableCell,
  unit: string
): void {
  const { source } = cell;
  if (source.kind === 'item') setValueUnit(draft, blockId, source.itemId, unit);
  else if (source.kind === 'plate') setPlateRowUnit(draft, source.row, unit);
  else if (source.kind === 'recipe') {
    editRecipeEntry(draft, source.materialId, source.entryId, { unit });
  }
}

export function fillBlanks(
  draft: Protocol,
  blockId: string,
  targets: readonly FillTarget[],
  value: string,
  unit: string
): void {
  for (const target of targets) {
    if (target.kind === 'slot') {
      addRoutedValue(draft, blockId, {
        ...target.routed,
        line: { ...target.routed.line, value, unit },
      });
      continue;
    }
    const { cell } = target;
    writeCellValue(draft, blockId, cell, value);
    if (cell.units === undefined || cell.units.includes(unit)) {
      writeCellUnit(draft, blockId, cell, unit);
    }
  }
}
