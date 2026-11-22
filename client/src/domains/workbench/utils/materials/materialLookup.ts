import { normalizeMaterialKey } from '@odysseus/shared-schemas';

import { firstCardOrNew } from '../cards/createCard';

import { SHORT_NAME_FIELD } from './materialCatalog';

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

export const shortNameOf = (item: MaterialItem): string =>
  item.shownFields.includes(SHORT_NAME_FIELD) ? (item.values[SHORT_NAME_FIELD] ?? '').trim() : '';

export const displayNameOf = (item: MaterialItem): string => shortNameOf(item) || item.name.trim();

export const findMaterial = (
  materials: readonly MaterialItem[],
  name: string
): MaterialItem | undefined =>
  findNamed(materials, name, item => item.name) ??
  findNamed(materials.filter(shortNameOf), name, shortNameOf);

export const listedMaterials = (protocol: Pick<Protocol, 'blocks'>): MaterialItem[] =>
  protocol.blocks
    .flatMap(card => (card.type === 'materials' ? card.items : []))
    .filter(item => !item.isDropped && item.name.trim());

export const materialNamed = (
  protocol: Pick<Protocol, 'blocks'>,
  name: string
): MaterialItem | undefined => findMaterial(listedMaterials(protocol), name);

export function ensureMaterial(
  draft: Protocol,
  name: string,
  createMaterial: (name: string) => MaterialItem
): MaterialItem {
  const existing = materialNamed(draft, name);
  if (existing) return existing;
  const card = firstCardOrNew(draft, 'materials');
  const created = createMaterial(name);
  card.items.push(created);
  card.foldedGroups = card.foldedGroups.filter(group => group !== created.group);
  return created;
}
