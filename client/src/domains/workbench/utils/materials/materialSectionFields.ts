import { fieldKey, materialFields, materialGroup } from './materialCatalog';
import { showMaterialField } from './materialItems';
import { learnedFields, type LabMemory } from './materialMemory';

import type { FieldDefinition, MaterialItem } from '@odysseus/shared-schemas';

export interface FieldChoice {
  definition: FieldDefinition;
  isShown: boolean;
}

interface FieldTally {
  definition: FieldDefinition;
  count: number;
  isCore: boolean;
}

export function fieldChoices(
  items: readonly MaterialItem[],
  shownKeys: ReadonlySet<string>,
  memory: LabMemory
): FieldChoice[] {
  const tallies = new Map<string, FieldTally>();
  for (const item of items) {
    const { core } = materialGroup(item.group);
    for (const definition of materialFields(item)) {
      const tally = tallies.get(definition.key) ?? {
        definition,
        count: 0,
        isCore: core.includes(definition),
      };
      tally.count += 1;
      tallies.set(definition.key, tally);
    }
  }
  for (const item of items) {
    for (const definition of learnedFields(memory, item)) {
      if (!tallies.has(definition.key)) {
        tallies.set(definition.key, { definition, count: 0, isCore: false });
      }
    }
  }
  return [...tallies.values()]
    .sort((x, y) => Number(x.isCore) - Number(y.isCore) || y.count - x.count)
    .map(({ definition }) => ({ definition, isShown: shownKeys.has(definition.key) }));
}

interface FieldChoiceSearch {
  visible: FieldChoice[];
  enterChoice?: FieldChoice;
  canAddCustom: boolean;
}

export function searchFieldChoices(
  choices: readonly FieldChoice[],
  query: string
): FieldChoiceSearch {
  const typed = query.trim().toLowerCase();
  const visible = choices.filter(choice => choice.definition.label.toLowerCase().includes(typed));
  const exact = visible.find(choice => choice.definition.label.toLowerCase() === typed);
  return {
    visible,
    enterChoice: exact ?? (visible.length === 1 ? visible[0] : undefined),
    canAddCustom: !!typed && !exact,
  };
}

export function hideSectionField(items: MaterialItem[], key: string): void {
  for (const item of items) item.shownFields = item.shownFields.filter(shown => shown !== key);
}

export function toggleSectionField(items: MaterialItem[], key: string, memory: LabMemory): void {
  if (items.some(item => item.shownFields.includes(key))) {
    hideSectionField(items, key);
    return;
  }
  const learned = items
    .flatMap(item => learnedFields(memory, item))
    .find(definition => definition.key === key);
  for (const item of items) {
    const hasField = materialFields(item).some(definition => definition.key === key);
    if (!hasField && learned) item.customFields.push({ ...learned });
    if (hasField || learned) showMaterialField(item, key);
  }
}

export function addCustomSectionField(items: MaterialItem[], label: string): void {
  const definition: FieldDefinition = {
    key: `custom-${fieldKey(label)}`,
    label,
    kind: 'text',
    scope: 'protocol',
    unit: '',
    options: [],
  };
  for (const item of items) {
    if (!item.customFields.some(custom => custom.key === definition.key)) {
      item.customFields.push({ ...definition });
    }
    showMaterialField(item, definition.key);
  }
}
