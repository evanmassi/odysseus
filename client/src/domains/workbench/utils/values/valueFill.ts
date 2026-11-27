import { addRoutedValue } from './valueEdits';
import { joinValueName } from './valueNames';
import { writeValueSource, writeValueSourceUnit } from './valueSources';
import { cellSource } from './valueTable';

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

export function fillBlanks(
  draft: Protocol,
  targets: readonly FillTarget[],
  value: string,
  unit: string
): void {
  for (const target of targets) {
    if (target.kind === 'slot') {
      addRoutedValue(draft, {
        ...target.routed,
        line: { ...target.routed.line, value, unit },
      });
      continue;
    }
    const { cell } = target;
    const source = cellSource(cell);
    if (!source) continue;
    writeValueSource(draft, source, value);
    if (cell.units === undefined || cell.units.includes(unit)) {
      writeValueSourceUnit(draft, source, unit);
    }
  }
}
