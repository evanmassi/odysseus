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
  materialValueId,
} from '../materials/materialCatalog';
import { shortNameOf } from '../materials/materialLookup';
import { recipeCalculationNames } from '../materials/materialRecipeCalculations';
import { materialSampleCounts, plateAmounts, plateMapCounts } from '../plateMap/plateMapNames';
import { perLabwareKind, WELLS } from '../terms/termList';
import { joinValueName, lowerLead } from '../values/valueNames';

import { nameKey, type BoardName } from './boardCalculation';

import type { MaterialItem, Protocol, ProtocolCard } from '@odysseus/shared-schemas';

type CardOf<Type extends ProtocolCard['type']> = Extract<ProtocolCard, { type: Type }>;

const tableRowLabel = (card: CardOf<'table'>, row: CardOf<'table'>['items'][number]) =>
  card.columns
    .slice(1)
    .filter(column => !column.isHidden && column.kind === 'text')
    .slice(0, 2)
    .map(column => (row.cells[column.id] ?? '').trim())
    .filter(Boolean)
    .join(' ');

function tableNames(card: CardOf<'table'>): BoardName[] {
  if (!card.isNamed) return [];
  const [nameColumn] = card.columns;
  const numberColumns = card.columns.filter(column => column.kind === 'number');
  return card.items.flatMap(row => {
    const rowName = (row.cells[nameColumn.id] ?? '').trim();
    if (!rowName) return [];
    const [firstNumber] = numberColumns;
    const item: BoardName = {
      kind: 'item',
      id: row.id,
      name: rowName,
      groupTitle: card.title,
      hint: firstNumber ? `${rowName} ${firstNumber.name.toLowerCase()}` : '',
      label: tableRowLabel(card, row),
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
  card: CardOf<'materials'>,
  cellMaterialIds: ReadonlySet<string>
): BoardName[] {
  return card.items
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
        isSetAside: item.isSetAside,
      };
      const values = numbers.map(
        (definition): BoardName => ({
          kind: 'value',
          id: materialValueId(item.id, definition.key),
          name: fieldName(item, definition),
          value: item.values[definition.key] ?? '',
          unit: fieldUnit(item, definition),
          isSetAside: item.isSetAside,
        })
      );
      return [entry, ...values];
    });
}

function valueNames(
  card: CardOf<'values'>,
  materialsById: ReadonlyMap<string, MaterialItem>
): BoardName[] {
  const valueRowName = (valueRowId: string | undefined) => {
    const valueRow = card.rows.find(candidate => candidate.id === valueRowId);
    if (!valueRow) return undefined;
    if ('mixName' in valueRow) return valueRow.mixName.trim();
    return materialsById.get(valueRow.materialId)?.name.trim() ?? valueRow.materialName ?? '';
  };
  return card.items.flatMap((item): BoardName[] => {
    if ('materialField' in item) return [];
    const owner = valueRowName(item.row);
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

function plateMapNames(card: CardOf<'plateMap'>): BoardName[] {
  const counts = plateMapCounts(card).map(
    (count): BoardName => ({
      kind: 'count',
      id: `${card.id}:${count.key}`,
      name: count.name,
      count: count.count,
    })
  );
  const amounts = plateAmounts(card).map(
    (amount): BoardName => ({
      kind: 'value',
      id: `${card.id}:${amount.key}`,
      name: amount.name,
      value: amount.value,
      unit: amount.unit,
    })
  );
  return [...counts, ...amounts];
}

const calculationNames = (card: CardOf<'calculations'>): BoardName[] =>
  card.items.map(item => ({
    kind: 'calculation',
    id: item.id,
    name: item.name,
    formula: item.formula,
    unit: item.unit,
  }));

function wellCountNames(
  protocol: Protocol,
  taken: readonly BoardName[],
  materials: readonly MaterialItem[]
) {
  const takenKeys = new Set(taken.map(entry => nameKey(entry.name)));
  const plateMaps = protocol.cards.filter(
    (card): card is CardOf<'plateMap'> => card.type === 'plateMap'
  );
  return [...materialSampleCounts(plateMaps, materials)].flatMap(([material, byNoun]) =>
    [...byNoun].flatMap(([noun, count]): BoardName[] => {
      const plural = lowerLead(perLabwareKind(WELLS, noun).word);
      const name = `${material.name.trim()} ${plural}`;
      return takenKeys.has(nameKey(name))
        ? []
        : [{ kind: 'count', id: `${material.id}:${plural}`, name, count }];
    })
  );
}

export function collectBoardNames(protocol: Protocol): BoardName[] {
  const materials = protocol.cards
    .flatMap(card => (card.type === 'materials' ? card.items : []))
    .filter(item => item.name.trim());
  const materialsById = new Map(materials.map(item => [item.id, item]));
  const subjects = countSubjects(protocol);
  const cellMaterialIds = new Set(subjects.map(subject => subject.material.id));
  const namesOf = (card: ProtocolCard): BoardName[] => {
    switch (card.type) {
      case 'table':
        return tableNames(card);
      case 'materials':
        return materialNames(card, cellMaterialIds);
      case 'values':
        return valueNames(card, materialsById);
      case 'plateMap':
        return plateMapNames(card);
      case 'calculations':
        return calculationNames(card);
      default:
        return [];
    }
  };
  const cardNames = protocol.cards.flatMap(card =>
    namesOf(card).map(entry => ({ ...entry, originCardId: card.id }))
  );
  const materialsCardId = protocol.cards.find(card => card.type === 'materials')?.id;
  const ownNames = [
    ...cardNames,
    ...wellCountNames(protocol, cardNames, materials),
    ...cellCountNames(subjects, cardNames, materialsCardId),
  ];
  const generated = [
    ...ownNames,
    ...recipeCalculationNames(protocol, ownNames),
    ...dilutionCalculationNames(protocol, ownNames),
    ...cellCalculationNames(protocol, ownNames),
  ];
  return [...generated, ...flowCytometryCalculationNames(protocol, generated)];
}
