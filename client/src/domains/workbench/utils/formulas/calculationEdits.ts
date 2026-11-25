import { createId } from '../ids/createId';

import { AUTO_UNIT } from './quantities';

import type { Protocol, ProtocolCalculations } from '@odysseus/shared-schemas';

type CalculationItem = ProtocolCalculations['items'][number];

export function insertCalculation(
  draft: Protocol,
  calculation: Omit<CalculationItem, 'id' | 'unit'>,
  sectionOf: (item: CalculationItem) => string | undefined,
  section: string | undefined
): string {
  const { items } = draft.calculations;
  const id = createId();
  const last = items.reduce(
    (found, item, index) => (sectionOf(item) === section ? index : found),
    -1
  );
  items.splice(last < 0 ? items.length : last + 1, 0, { id, ...calculation, unit: AUTO_UNIT });
  return id;
}

export function updateCalculation(
  draft: Protocol,
  itemId: string,
  change: Partial<Omit<CalculationItem, 'id'>>
) {
  const item = draft.calculations.items.find(candidate => candidate.id === itemId);
  if (item) Object.assign(item, change);
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
