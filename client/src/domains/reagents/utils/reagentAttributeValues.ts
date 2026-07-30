/**
 * Reagent Attribute Values
 *
 * Turns the stored value rows into one draft per attribute and back again. A multi-select
 * attribute stores a row per chosen option, so drafts aggregate by definition, and the
 * server replaces a definition's values wholesale — an empty draft is how a value clears.
 */

import type {
  AttributeDefinition,
  ReagentAttributeValue,
  SetReagentAttributeValueRequest,
} from '@odysseus/shared-schemas';

export interface AttributeValueDraft {
  optionIds: string[];
  text?: string;
  number?: number;
}

export type AttributeDrafts = Record<string, AttributeValueDraft>;

export const EMPTY_DRAFT: AttributeValueDraft = { optionIds: [] };

export function draftsFromValues(values: ReagentAttributeValue[]): AttributeDrafts {
  return values.reduce<AttributeDrafts>((drafts, value) => {
    const draft = drafts[value.definitionId] ?? { optionIds: [] };
    if (value.valueOptionId) draft.optionIds = [...draft.optionIds, value.valueOptionId];
    if (value.valueText !== null) draft.text = value.valueText;
    if (value.valueNumber !== null) draft.number = value.valueNumber;
    drafts[value.definitionId] = draft;
    return drafts;
  }, {});
}

export function isDraftPopulated(draft: AttributeValueDraft): boolean {
  return draft.optionIds.length > 0 || !!draft.text?.trim() || draft.number !== undefined;
}

function isSameDraft(a: AttributeValueDraft | undefined, b: AttributeValueDraft | undefined) {
  const left = a ?? EMPTY_DRAFT;
  const right = b ?? EMPTY_DRAFT;
  return (
    left.optionIds.length === right.optionIds.length &&
    left.optionIds.every(id => right.optionIds.includes(id)) &&
    (left.text ?? '') === (right.text ?? '') &&
    left.number === right.number
  );
}

function toRequest(
  definitionId: string,
  draft: AttributeValueDraft,
  valueType: AttributeDefinition['valueType']
): SetReagentAttributeValueRequest {
  if (valueType === 'select' || valueType === 'multi_select') {
    return { definitionId, valueOptionIds: draft.optionIds };
  }
  if (valueType === 'number') {
    return { definitionId, valueNumber: draft.number };
  }
  return { definitionId, valueText: draft.text?.trim() ?? undefined };
}

/** One request per attribute whose draft differs from what was loaded, cleared ones included. */
export function changedAttributeRequests(
  original: AttributeDrafts,
  current: AttributeDrafts,
  definitions: AttributeDefinition[]
): SetReagentAttributeValueRequest[] {
  const definitionById = new Map(definitions.map(definition => [definition.id, definition]));

  return [...new Set([...Object.keys(original), ...Object.keys(current)])]
    .filter(definitionId => !isSameDraft(original[definitionId], current[definitionId]))
    .flatMap(definitionId => {
      const definition = definitionById.get(definitionId);
      if (!definition) return [];
      return [toRequest(definitionId, current[definitionId] ?? EMPTY_DRAFT, definition.valueType)];
    });
}
