import { createId } from '../ids/createId';
import { joinValueName } from '../values/valueNames';

import { calculationMaterial, nameWithin } from './formulaScopes';
import { AUTO_UNIT } from './quantities';

import type { MaterialItem, Protocol, ProtocolCalculations } from '@odysseus/shared-schemas';

type CalculationItem = ProtocolCalculations['items'][number];
type CalculationFields = Omit<CalculationItem, 'id' | 'materialId' | 'materialName'>;

const calculationOwner = (
  item: CalculationItem,
  materials: ReadonlyMap<string, MaterialItem>
): string =>
  item.materialId === undefined
    ? ''
    : (materials.get(item.materialId)?.name.trim() ?? item.materialName ?? '');

export const calculationFullName = (
  item: CalculationItem,
  materials: ReadonlyMap<string, MaterialItem>
): string => joinValueName(calculationOwner(item, materials), item.name);

function savedName(draft: Protocol, fullName: string) {
  const named = draft.materials.items.filter(item => item.name.trim());
  const material = calculationMaterial(fullName, named);
  return {
    name: material ? nameWithin(fullName, material) : fullName,
    materialId: material?.id,
    materialName: material?.name.trim(),
  };
}

export function insertCalculation(
  draft: Protocol,
  calculation: Omit<CalculationFields, 'unit'>,
  sectionOf: (item: CalculationItem) => string | undefined,
  section: string | undefined
): string {
  const { items } = draft.calculations;
  const id = createId();
  const last = items.reduce(
    (found, item, index) => (sectionOf(item) === section ? index : found),
    -1
  );
  items.splice(last < 0 ? items.length : last + 1, 0, {
    id,
    ...calculation,
    ...savedName(draft, calculation.name),
    unit: AUTO_UNIT,
  });
  return id;
}

export function updateCalculation(
  draft: Protocol,
  itemId: string,
  change: Partial<CalculationFields>
) {
  const item = draft.calculations.items.find(candidate => candidate.id === itemId);
  if (!item) return;
  const { name, ...rest } = change;
  Object.assign(item, rest, name === undefined ? {} : savedName(draft, name));
}

export function removeCalculation(draft: Protocol, itemId: string): void {
  draft.calculations.items = draft.calculations.items.filter(item => item.id !== itemId);
}

export function setCalculationSection(draft: Protocol, materialId: string, isShown: boolean): void {
  const { calculations } = draft;
  calculations.materialSections = isShown
    ? [...new Set([...calculations.materialSections, materialId])]
    : calculations.materialSections.filter(id => id !== materialId);
}
