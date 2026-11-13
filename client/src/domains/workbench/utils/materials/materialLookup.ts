import { firstBlockOrNew } from '../blocks/createBlock';

import { normalizeMaterialKey } from './materialKey';

import type { MaterialItem, Protocol } from '@odysseus/shared-schemas';

export const nameWithoutNotes = (name: string): string =>
  name
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const withoutNotes = (name: string) => normalizeMaterialKey(nameWithoutNotes(name));

export function findNamed<Item>(
  items: readonly Item[],
  name: string,
  nameOf: (item: Item) => string
): Item | undefined {
  const key = normalizeMaterialKey(name);
  const bare = withoutNotes(name);
  if (!key) return undefined;
  return (
    items.find(item => normalizeMaterialKey(nameOf(item)) === key) ??
    (bare ? items.find(item => withoutNotes(nameOf(item)) === bare) : undefined)
  );
}

export const listedMaterials = (protocol: Pick<Protocol, 'blocks'>): MaterialItem[] =>
  protocol.blocks
    .flatMap(block => (block.type === 'materials' ? block.items : []))
    .filter(item => !item.isDropped && item.name.trim());

export const materialNamed = (
  protocol: Pick<Protocol, 'blocks'>,
  name: string
): MaterialItem | undefined => findNamed(listedMaterials(protocol), name, item => item.name);

export function ensureMaterial(
  draft: Protocol,
  name: string,
  createMaterial: (name: string) => MaterialItem
): MaterialItem {
  const existing = materialNamed(draft, name);
  if (existing) return existing;
  const block = firstBlockOrNew(draft, 'materials');
  const created = createMaterial(name);
  block.items.push(created);
  block.foldedGroups = block.foldedGroups.filter(group => group !== created.group);
  return created;
}
