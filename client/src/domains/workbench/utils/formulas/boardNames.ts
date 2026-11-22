import { dilutionCalculationNames } from '../dilutions/dilutionCalculations';
import { flowCytometryCalculationNames } from '../flowCytometry/flowCytometryNames';
import { cellCalculationNames } from '../materials/cellCalculations';
import { cellCountNames, countSubjects } from '../materials/cellCounts';
import {
  CELL_COUNT_KEYS,
  fieldName,
  fieldUnit,
  materialFields,
  materialGroup,
  materialLabel,
} from '../materials/materialCatalog';
import { shortNameOf } from '../materials/materialLookup';
import { recipeCalculationNames } from '../materials/materialRecipeCalculations';
import { materialWellCounts, plateAmounts, plateMapCounts } from '../plateMap/plateMapNames';
import { joinValueName } from '../values/valueNames';

import { nameKey, type BoardName } from './boardCalculation';

import type { MaterialItem, Protocol, ProtocolBlock } from '@odysseus/shared-schemas';

type BlockOf<Type extends ProtocolBlock['type']> = Extract<ProtocolBlock, { type: Type }>;

const tableRowLabel = (block: BlockOf<'list'>, row: BlockOf<'list'>['items'][number]) =>
  block.columns
    .slice(1)
    .filter(column => !column.isHidden && column.kind === 'text')
    .slice(0, 2)
    .map(column => (row.cells[column.id] ?? '').trim())
    .filter(Boolean)
    .join(' ');

function tableNames(block: BlockOf<'list'>): BoardName[] {
  if (!block.isNamed) return [];
  const [nameColumn] = block.columns;
  const numberColumns = block.columns.filter(column => column.kind === 'number');
  return block.items.flatMap(row => {
    const rowName = (row.cells[nameColumn.id] ?? '').trim();
    if (!rowName) return [];
    const [firstNumber] = numberColumns;
    const item: BoardName = {
      kind: 'item',
      id: row.id,
      name: rowName,
      groupTitle: block.title,
      hint: firstNumber ? `${rowName} ${firstNumber.name.toLowerCase()}` : '',
      label: tableRowLabel(block, row),
    };
    const values = numberColumns.map(
      (column): BoardName => ({
        kind: 'value',
        id: `${row.id}:${column.id}`,
        name: `${rowName} ${column.name.trim().toLowerCase()}`,
        value: row.cells[column.id] ?? '',
        unit: column.unit === '*' ? (row.units[column.id] ?? '') : column.unit,
      })
    );
    return [item, ...values];
  });
}

function materialNames(
  block: BlockOf<'materials'>,
  cellMaterialIds: ReadonlySet<string>
): BoardName[] {
  return block.items
    .filter(item => item.name.trim())
    .flatMap(item => {
      const isCounted = cellMaterialIds.has(item.id);
      const numbers = materialFields(item).filter(
        definition =>
          definition.kind === 'number' &&
          item.shownFields.includes(definition.key) &&
          !(isCounted && CELL_COUNT_KEYS.has(definition.key))
      );
      const shownName = shortNameOf(item);
      const entry: BoardName = {
        kind: 'item',
        id: item.id,
        name: item.name,
        ...(shownName && { shownName }),
        groupTitle: materialGroup(item.group).label,
        hint: numbers[0] ? fieldName(item, numbers[0]) : '',
        label: materialLabel(item),
        isDropped: item.isDropped,
      };
      const values = numbers.map(
        (definition): BoardName => ({
          kind: 'value',
          id: `${item.id}:${definition.key}`,
          name: fieldName(item, definition),
          value: item.values[definition.key] ?? '',
          unit: fieldUnit(item, definition),
          isDropped: item.isDropped,
        })
      );
      return [entry, ...values];
    });
}

function valueNames(
  block: BlockOf<'values'>,
  materialsById: ReadonlyMap<string, MaterialItem>
): BoardName[] {
  const valueRowName = (valueRowId: string | undefined) => {
    const valueRow = block.sections.find(candidate => candidate.id === valueRowId);
    if (!valueRow) return undefined;
    if ('mixName' in valueRow) return valueRow.mixName.trim();
    return materialsById.get(valueRow.materialId)?.name.trim() ?? valueRow.materialName ?? '';
  };
  return block.items.flatMap((item): BoardName[] => {
    if ('materialField' in item) return [];
    const owner = valueRowName(item.section);
    return [
      {
        kind: 'value',
        id: item.id,
        name: owner === undefined ? item.name : joinValueName(owner, item.name),
        value: item.value,
        unit: item.unit,
      },
    ];
  });
}

function vesselMapNames(block: BlockOf<'plate'>): BoardName[] {
  const counts = plateMapCounts(block).map(
    (count): BoardName => ({
      kind: 'count',
      id: `${block.id}:${count.key}`,
      name: count.name,
      count: count.count,
    })
  );
  const amounts = plateAmounts(block).map(
    (amount): BoardName => ({
      kind: 'value',
      id: `${block.id}:${amount.key}`,
      name: amount.name,
      value: amount.value,
      unit: amount.unit,
    })
  );
  return [...counts, ...amounts];
}

const calculationNames = (block: BlockOf<'formula'>): BoardName[] =>
  block.items.map(item => ({
    kind: 'calculation',
    id: item.id,
    name: item.name,
    expr: item.expr,
    unit: item.unit,
  }));

function wellCountNames(
  protocol: Protocol,
  taken: readonly BoardName[],
  materials: readonly MaterialItem[]
) {
  const takenKeys = new Set(taken.map(entry => nameKey(entry.name)));
  const plateMaps = protocol.blocks.filter(
    (block): block is BlockOf<'plate'> => block.type === 'plate'
  );
  return [...materialWellCounts(plateMaps, materials)].flatMap(([material, count]): BoardName[] => {
    const name = `${material.name.trim()} wells`;
    return takenKeys.has(nameKey(name))
      ? []
      : [{ kind: 'count', id: `${material.id}:wells`, name, count }];
  });
}

export function collectBoardNames(protocol: Protocol): BoardName[] {
  const materials = protocol.blocks
    .flatMap(block => (block.type === 'materials' ? block.items : []))
    .filter(item => item.name.trim());
  const materialsById = new Map(materials.map(item => [item.id, item]));
  const subjects = countSubjects(protocol);
  const cellMaterialIds = new Set(subjects.map(subject => subject.material.id));
  const namesOf = (block: ProtocolBlock): BoardName[] => {
    switch (block.type) {
      case 'list':
        return tableNames(block);
      case 'materials':
        return materialNames(block, cellMaterialIds);
      case 'values':
        return valueNames(block, materialsById);
      case 'plate':
        return vesselMapNames(block);
      case 'formula':
        return calculationNames(block);
      default:
        return [];
    }
  };
  const blockNames = protocol.blocks.flatMap(block =>
    namesOf(block).map(entry => ({ ...entry, sourceBlockId: block.id }))
  );
  const materialsBlockId = protocol.blocks.find(block => block.type === 'materials')?.id;
  const ownNames = [
    ...blockNames,
    ...wellCountNames(protocol, blockNames, materials),
    ...cellCountNames(subjects, blockNames, materialsBlockId),
  ];
  const generated = [
    ...ownNames,
    ...recipeCalculationNames(protocol, ownNames),
    ...dilutionCalculationNames(protocol, ownNames),
    ...cellCalculationNames(protocol, ownNames),
  ];
  return [...generated, ...flowCytometryCalculationNames(protocol, generated)];
}
