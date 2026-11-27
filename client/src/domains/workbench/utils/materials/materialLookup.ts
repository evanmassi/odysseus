import { normalizeMaterialKey } from '@odysseus/shared-schemas';

import { firstCardOrNew } from '../cards/createCard';

import { SHORT_NAME_FIELD } from './materialCatalog';

import type { MaterialItem, Protocol } from '@odysseus/shared-schemas';

const INNERMOST_NOTE = /\([^()]*\)/;

export function nameWithoutNotes(name: string): string {
  let bare = name;
  while (INNERMOST_NOTE.test(bare)) bare = bare.replace(INNERMOST_NOTE, ' ');
  return bare.replace(/\s+/g, ' ').trim();
}

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

export const listedMaterials = (protocol: Pick<Protocol, 'materials'>): MaterialItem[] =>
  protocol.materials.items.filter(item => !item.isSetAside && item.name.trim());

export const materialNamed = (
  protocol: Pick<Protocol, 'materials'>,
  name: string
): MaterialItem | undefined => findMaterial(listedMaterials(protocol), name);

export function ensureMaterial(
  draft: Protocol,
  name: string,
  createMaterial: (name: string) => MaterialItem
): MaterialItem {
  const existing = materialNamed(draft, name);
  if (existing) return existing;
  const created = createMaterial(name);
  draft.materials.items.push(created);
  firstCardOrNew(draft, 'materials');
  unfoldGroup(draft, created.group);
  return created;
}

export function unfoldGroup(draft: Pick<Protocol, 'cards'>, group: string): void {
  for (const card of draft.cards) {
    if (card.type === 'materials') {
      card.foldedGroups = card.foldedGroups.filter(folded => folded !== group);
    }
  }
}
