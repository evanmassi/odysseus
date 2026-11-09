import { firstBlockOrNew } from '../blocks/createBlock';

import { normalizeMaterialKey } from './materialGuesser';

import type { MaterialItem, Protocol } from '@odysseus/shared-schemas';

const withoutNotes = (name: string) => normalizeMaterialKey(name.replace(/\([^)]*\)/g, ' '));

export function materialNamed(protocol: Protocol, name: string): MaterialItem | undefined {
  const listed = protocol.blocks
    .flatMap(block => (block.type === 'materials' ? block.items : []))
    .filter(item => !item.isDropped);
  const key = normalizeMaterialKey(name);
  return (
    listed.find(item => normalizeMaterialKey(item.name) === key) ??
    listed.find(item => withoutNotes(item.name) === withoutNotes(name))
  );
}

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
