/**
 * Reagent Attribute Scope
 *
 * Which attributes a reagent type offers. An empty scope means every type, so a lab that never
 * scopes anything sees its whole palette on every reagent.
 */

import type { AttributeDefinition } from '@odysseus/shared-schemas';

export function appliesToReagentType(
  definition: AttributeDefinition,
  reagentType: string | undefined
): boolean {
  return (
    definition.appliesToTypes.length === 0 ||
    (!!reagentType && definition.appliesToTypes.includes(reagentType))
  );
}

/** Scoped attributes the incoming type would strand — the form clears these on a type change. */
export function scopedOutOfType(
  definitions: AttributeDefinition[],
  nextType: string | undefined
): AttributeDefinition[] {
  return definitions.filter(
    definition =>
      definition.appliesToTypes.length > 0 && !appliesToReagentType(definition, nextType)
  );
}
