/**
 * Attribute Display Rows
 *
 * One label/value row per attribute an item actually carries, for the read-only panels. A
 * multi-select joins its options into a single line, and an attribute with no value is dropped
 * rather than shown blank.
 */

import type {
  AttributeDefinition,
  AttributeOption,
  AttributeSummary,
} from '@odysseus/shared-schemas';

export interface AttributeDisplayRow {
  id: string;
  name: string;
  display: string;
}

export function toAttributeDisplayRows(
  definitions: AttributeDefinition[],
  options: AttributeOption[],
  values: AttributeSummary[]
): AttributeDisplayRow[] {
  return definitions
    .map(definition => {
      const forDefinition = values.filter(value => value.definitionId === definition.id);
      const optionLabels = forDefinition
        .map(value => options.find(option => option.id === value.valueOptionId)?.value ?? '')
        .filter(Boolean);
      const scalar = forDefinition.find(
        value => value.valueText !== null || value.valueNumber !== null
      );
      const display =
        optionLabels.length > 0
          ? optionLabels.join(', ')
          : (scalar?.valueText ?? scalar?.valueNumber?.toString());
      return { id: definition.id, name: definition.name, display };
    })
    .filter((row): row is AttributeDisplayRow => !!row.display);
}
