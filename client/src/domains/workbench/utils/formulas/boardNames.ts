import { cardIdShowing, firstCardIdOf } from '../cards/createCard';
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
import { valueRowName } from '../values/valueEdits';
import { joinValueName, lowerLead } from '../values/valueNames';

import { nameKey, type BoardName } from './boardCalculation';

import type {
  MaterialItem,
  PlateMap,
  Protocol,
  ProtocolCalculations,
  ProtocolValues,
} from '@odysseus/shared-schemas';

function materialNames(
  materials: readonly MaterialItem[],
  cellMaterialIds: ReadonlySet<string>
): BoardName[] {
  return materials.flatMap(item => {
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
  values: ProtocolValues,
  materialsById: ReadonlyMap<string, MaterialItem>
): BoardName[] {
  return values.items.flatMap((item): BoardName[] => {
    if ('materialField' in item) return [];
    const valueRow = values.rows.find(candidate => candidate.id === item.row);
    return [
      {
        kind: 'value',
        id: item.id,
        name: valueRow
          ? joinValueName(valueRowName(valueRow, materialsById), item.name)
          : item.name,
        value: item.value,
        unit: item.unit,
      },
    ];
  });
}

function plateMapNames(plateMap: PlateMap): BoardName[] {
  const counts = plateMapCounts(plateMap).map(
    (count): BoardName => ({
      kind: 'count',
      id: `${plateMap.id}:${count.key}`,
      name: count.name,
      count: count.count,
    })
  );
  const amounts = plateAmounts(plateMap).map(
    (amount): BoardName => ({
      kind: 'value',
      id: `${plateMap.id}:${amount.key}`,
      name: amount.name,
      value: amount.value,
      unit: amount.unit,
    })
  );
  return [...counts, ...amounts];
}

const calculationNames = (calculations: ProtocolCalculations): BoardName[] =>
  calculations.items.map(item => ({
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
  return [...materialSampleCounts(protocol.plateMaps, materials)].flatMap(([material, byNoun]) =>
    [...byNoun].flatMap(([noun, count]): BoardName[] => {
      const plural = lowerLead(perLabwareKind(WELLS, noun).word);
      const name = `${material.name.trim()} ${plural}`;
      return takenKeys.has(nameKey(name))
        ? []
        : [{ kind: 'count', id: `${material.id}:${plural}`, name, count }];
    })
  );
}

const fromCard = (entries: readonly BoardName[], originCardId: string | undefined) =>
  entries.map(entry => ({ ...entry, originCardId }));

export function collectBoardNames(protocol: Protocol): BoardName[] {
  const materials = protocol.materials.items.filter(item => item.name.trim());
  const materialsById = new Map(materials.map(item => [item.id, item]));
  const subjects = countSubjects(protocol);
  const cellMaterialIds = new Set(subjects.map(subject => subject.material.id));
  const materialsCardId = firstCardIdOf(protocol, 'materials');
  const cardNames = [
    ...fromCard(materialNames(materials, cellMaterialIds), materialsCardId),
    ...fromCard(valueNames(protocol.values, materialsById), firstCardIdOf(protocol, 'values')),
    ...fromCard(calculationNames(protocol.calculations), firstCardIdOf(protocol, 'calculations')),
    ...protocol.plateMaps.flatMap(plateMap =>
      fromCard(plateMapNames(plateMap), cardIdShowing(protocol, plateMap.id))
    ),
  ];
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
