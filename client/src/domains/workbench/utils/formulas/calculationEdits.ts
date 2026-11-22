import { BLOCK_TYPES } from '../blocks/blockTypes';
import { createBlock } from '../blocks/createBlock';
import { createId } from '../ids/createId';

import { nameWithin } from './formulaScopes';
import { AUTO_UNIT } from './quantities';

import type {
  CalculationsBlock,
  MaterialItem,
  Protocol,
  ValuesBlock,
} from '@odysseus/shared-schemas';

type CalculationItem = CalculationsBlock['items'][number];

function calculationsBlock(draft: Protocol, blockId: string): CalculationsBlock | undefined {
  const block = draft.blocks.find(candidate => candidate.id === blockId);
  return block?.type === 'formula' ? block : undefined;
}

export function insertCalculation(
  draft: Protocol,
  blockId: string,
  calculation: Omit<CalculationItem, 'id' | 'unit'>,
  sectionOf: (item: CalculationItem) => string | undefined,
  section: string | undefined
): string | undefined {
  const block = calculationsBlock(draft, blockId);
  if (!block) return undefined;
  const id = createId();
  const last = block.items.reduce(
    (found, item, index) => (sectionOf(item) === section ? index : found),
    -1
  );
  block.items.splice(last < 0 ? block.items.length : last + 1, 0, {
    id,
    ...calculation,
    unit: AUTO_UNIT,
  });
  return id;
}

export function updateCalculation(
  draft: Protocol,
  blockId: string,
  itemId: string,
  change: Partial<Omit<CalculationItem, 'id'>>
) {
  const item = calculationsBlock(draft, blockId)?.items.find(candidate => candidate.id === itemId);
  if (item) Object.assign(item, change);
}

export function removeCalculation(draft: Protocol, blockId: string, itemId: string): void {
  const block = calculationsBlock(draft, blockId);
  if (block) block.items = block.items.filter(item => item.id !== itemId);
}

export function setCalculationSection(
  draft: Protocol,
  blockId: string,
  materialId: string,
  isShown: boolean
): void {
  const block = calculationsBlock(draft, blockId);
  if (!block) return;
  block.materialSections = isShown
    ? [...new Set([...block.materialSections, materialId])]
    : block.materialSections.filter(id => id !== materialId);
}

export function addNamedValue(
  draft: Protocol,
  name: string,
  material: MaterialItem | undefined,
  pageId: string
): void {
  let values = draft.blocks.find((block): block is ValuesBlock => block.type === 'values');
  if (!values) {
    const [w, h] = BLOCK_TYPES.values.size;
    const bottom = Math.max(
      0,
      ...draft.blocks.filter(block => block.page === pageId).map(block => block.y + block.h)
    );
    values = createBlock('values', { page: pageId, x: 0, y: bottom, w, h }) as ValuesBlock;
    draft.blocks.push(values);
  }
  let valueRow =
    material &&
    values.sections.find(
      candidate => 'materialId' in candidate && candidate.materialId === material.id
    );
  if (material && !valueRow) {
    valueRow = { id: createId(), materialId: material.id };
    values.sections.push(valueRow);
  }
  const item = {
    id: createId(),
    name: nameWithin(name, material),
    value: '',
    unit: '',
    ...(valueRow && { section: valueRow.id }),
  };
  const peers = values.items.filter(
    candidate => (candidate.section ?? '') === (valueRow?.id ?? '')
  );
  const last = peers.at(-1);
  values.items.splice(last ? values.items.indexOf(last) + 1 : values.items.length, 0, item);
}
