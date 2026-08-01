/**
 * Attribute Scope
 *
 * Which attributes an item type offers. An empty scope means every type, so a lab that never
 * scopes anything sees its whole palette on every item — and a catalog with no type
 * discriminator at all sees exactly the unscoped ones.
 */

import type { AttributeDefinition } from '@odysseus/shared-schemas';

export function appliesToType(
  definition: AttributeDefinition,
  itemType: string | undefined
): boolean {
  return (
    definition.appliesToTypes.length === 0 ||
    (!!itemType && definition.appliesToTypes.includes(itemType))
  );
}

/** Scoped attributes the incoming type would strand — the form clears these on a type change. */
export function scopedOutOfType(
  definitions: AttributeDefinition[],
  nextType: string | undefined
): AttributeDefinition[] {
  return definitions.filter(
    definition => definition.appliesToTypes.length > 0 && !appliesToType(definition, nextType)
  );
}
