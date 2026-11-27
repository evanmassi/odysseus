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
import { linkOwner, ownerNamed } from '../materials/plateLinks';
import { materialSampleCounts, plateAmounts, plateMapCounts } from '../plateMap/plateMapNames';
import { boardKind } from '../terms/savedTerms';
import { perLabwareKind, WELLS } from '../terms/termList';
import { termOfName } from '../terms/termLookup';
import { valueRowName } from '../values/valueEdits';
import { GENERAL, joinValueName, lowerLead } from '../values/valueNames';

import { nameKey, type BoardName } from './boardCalculation';
import { calculationFullName } from './calculationEdits';

import type { CardTarget } from '../cards/createCard';
import type {
  MaterialItem,
  PlateLine,
  PlateMap,
  Protocol,
  ProtocolCalculations,
  ProtocolValues,
  SavedTerm,
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
    const values = numbers.map((definition): BoardName => {
      const unit = fieldUnit(item, definition);
      const term = termOfName(definition.nameByUnit?.[unit] ?? definition.label, unit);
      return {
        kind: 'value',
        id: materialValueId(item.id, definition.key),
        name: fieldName(item, definition),
        value: item.values[definition.key] ?? '',
        unit,
        isSetAside: item.isSetAside,
        kindOf: boardKind(term, item.id),
      };
    });
    return [entry, ...values];
  });
}

const looseOwner = (protocol: Protocol, term: SavedTerm | undefined) =>
  term?.of ? ownerNamed(protocol, term.of) : GENERAL;

function valueNames(
  protocol: Protocol,
  values: ProtocolValues,
  materialsById: ReadonlyMap<string, MaterialItem>
): BoardName[] {
  return values.items.flatMap((item): BoardName[] => {
    if ('materialField' in item) return [];
    const valueRow = values.rows.find(candidate => candidate.id === item.row);
    const owner = !valueRow
      ? looseOwner(protocol, item.term)
      : 'materialId' in valueRow
        ? valueRow.materialId
        : valueRow.id;
    return [
      {
        kind: 'value',
        id: item.id,
        name: valueRow
          ? joinValueName(valueRowName(valueRow, materialsById), item.name)
          : item.name,
        value: item.value,
        unit: item.unit,
        kindOf: boardKind(item.term, owner),
      },
    ];
  });
}

function plateMapNames(protocol: Protocol, plateMap: PlateMap): BoardName[] {
  const ownerOf = (painted: PlateLine['values'][number] | undefined, subject: string) =>
    painted ? linkOwner(protocol, painted, subject) : GENERAL;
  const counts = plateMapCounts(plateMap).map(
    (count): BoardName => ({
      kind: 'count',
      id: `${plateMap.id}:${count.key}`,
      name: count.name,
      count: count.count,
      kindOf: boardKind(count.term, ownerOf(count.painted, count.subject)),
    })
  );
  const amounts = plateAmounts(plateMap).map(
    (amount): BoardName => ({
      kind: 'value',
      id: `${plateMap.id}:${amount.key}`,
      name: amount.name,
      value: amount.value,
      unit: amount.unit,
      kindOf: boardKind(amount.term, ownerOf(amount.painted, amount.subject)),
    })
  );
  return [...counts, ...amounts];
}

const calculationNames = (
  protocol: Protocol,
  calculations: ProtocolCalculations,
  materialsById: ReadonlyMap<string, MaterialItem>
): BoardName[] =>
  calculations.items.map(item => ({
    kind: 'calculation',
    id: item.id,
    name: calculationFullName(item, materialsById),
    formula: item.formula,
    unit: item.unit,
    kindOf: boardKind(item.term, item.materialId ?? looseOwner(protocol, item.term)),
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
        : [
            {
              kind: 'count',
              id: `${material.id}:${plural}`,
              name,
              count,
              kindOf: { term: WELLS.key, noun, owner: material.id },
            },
          ];
    })
  );
}

const setIn = (entries: readonly BoardName[], origin: CardTarget) =>
  entries.map(entry => ({ ...entry, origin }));

export function collectBoardNames(protocol: Protocol): BoardName[] {
  const materials = protocol.materials.items.filter(item => item.name.trim());
  const materialsById = new Map(materials.map(item => [item.id, item]));
  const subjects = countSubjects(protocol);
  const cellMaterialIds = new Set(subjects.map(subject => subject.material.id));
  const cardNames = [
    ...setIn(materialNames(materials, cellMaterialIds), { type: 'materials' }),
    ...setIn(valueNames(protocol, protocol.values, materialsById), { type: 'values' }),
    ...setIn(calculationNames(protocol, protocol.calculations, materialsById), {
      type: 'calculations',
    }),
    ...protocol.plateMaps.flatMap(plateMap =>
      setIn(plateMapNames(protocol, plateMap), { type: 'plateMap', shows: plateMap.id })
    ),
  ];
  const ownNames = [
    ...cardNames,
    ...wellCountNames(protocol, cardNames, materials),
    ...cellCountNames(subjects, cardNames),
  ];
  const generated = [
    ...ownNames,
    ...recipeCalculationNames(protocol, ownNames),
    ...dilutionCalculationNames(protocol, ownNames),
    ...cellCalculationNames(protocol, ownNames),
  ];
  return [...generated, ...flowCytometryCalculationNames(protocol, generated)];
}
