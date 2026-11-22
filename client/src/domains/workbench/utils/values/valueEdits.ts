import { createId } from '../ids/createId';
import {
  fieldLabel,
  fieldName,
  fieldUnit,
  materialFields,
  UNIT_PER_ITEM,
} from '../materials/materialCatalog';
import { writeMaterialField } from '../materials/materialItems';

import { parseValueLine, settledLine } from './valueLines';

import type { RoutedValue } from './valueRouting';
import type { ValueSuggestion } from './valueSuggestions';
import type {
  FieldDefinition,
  MaterialItem,
  Protocol,
  ValuesCard,
  ValueRow,
} from '@odysseus/shared-schemas';

type ValueItem = ValuesCard['items'][number];

interface LinkedValue {
  material: MaterialItem;
  field: FieldDefinition;
  value: string;
  unit: string;
  label: string;
  name: string;
  units: readonly string[];
}

export type RemovedValues =
  | { kind: 'item'; item: ValueItem; index: number; label: string }
  | { kind: 'row'; valueRow: ValueRow; items: ValueItem[]; index: number; label: string };

export const materialsById = (protocol: Pick<Protocol, 'blocks'>): Map<string, MaterialItem> =>
  new Map(
    protocol.blocks
      .flatMap(card => (card.type === 'materials' ? card.items : []))
      .map(item => [item.id, item])
  );

export function linkedValueOf(
  card: ValuesCard,
  item: ValueItem,
  materials: ReadonlyMap<string, MaterialItem>
): LinkedValue | undefined {
  if (!('materialField' in item)) return undefined;
  const valueRow = card.sections.find(candidate => candidate.id === item.section);
  const material =
    valueRow && 'materialId' in valueRow ? materials.get(valueRow.materialId) : undefined;
  const field =
    material && materialFields(material).find(definition => definition.key === item.materialField);
  if (!material || !field) return undefined;
  return {
    material,
    field,
    value: material.values[field.key] ?? '',
    unit: fieldUnit(material, field),
    label: fieldLabel(material, field),
    name: fieldName(material, field),
    units: field.unit === UNIT_PER_ITEM ? (field.units ?? []) : [],
  };
}

export const valuesInRow = (card: ValuesCard, valueRowId: string): ValueItem[] =>
  card.items.filter(item => (item.section ?? '') === valueRowId);

export function valueRowName(
  valueRow: ValueRow,
  materials: ReadonlyMap<string, MaterialItem>
): string {
  if ('mixName' in valueRow) return valueRow.mixName.trim();
  return materials.get(valueRow.materialId)?.name.trim() ?? valueRow.materialName ?? '';
}

function valuesCard(draft: Protocol, cardId: string): ValuesCard | undefined {
  const card = draft.blocks.find(candidate => candidate.id === cardId);
  return card?.type === 'values' ? card : undefined;
}

function editTarget(draft: Protocol, cardId: string, itemId: string) {
  const card = valuesCard(draft, cardId);
  const item = card?.items.find(candidate => candidate.id === itemId);
  if (!card || !item) return undefined;
  return { card, item, linked: linkedValueOf(card, item, materialsById(draft)) };
}

export function insertAfterPeers(card: ValuesCard, valueRowId: string, added: ValueItem[]) {
  const last = valuesInRow(card, valueRowId).at(-1);
  card.items.splice(last ? card.items.indexOf(last) + 1 : card.items.length, 0, ...added);
}

export function renameValue(draft: Protocol, cardId: string, itemId: string, name: string): void {
  const target = editTarget(draft, cardId, itemId);
  if (!target) return;
  if (target.linked) {
    const { material, field } = target.linked;
    const column = [...materialsById(draft).values()].filter(
      peer =>
        peer.group === material.group && materialFields(peer).some(each => each.key === field.key)
    );
    for (const peer of column) {
      if (name.trim()) peer.fieldLabels[field.key] = name;
      else delete peer.fieldLabels[field.key];
    }
  } else if (!('materialField' in target.item)) target.item.name = name;
}

export function setValueAmount(
  draft: Protocol,
  cardId: string,
  itemId: string,
  value: string
): void {
  const target = editTarget(draft, cardId, itemId);
  if (!target) return;
  if (target.linked) target.linked.material.values[target.linked.field.key] = value;
  else if (!('materialField' in target.item)) target.item.value = value;
}

export function setValueUnit(draft: Protocol, cardId: string, itemId: string, unit: string): void {
  const target = editTarget(draft, cardId, itemId);
  if (!target) return;
  if (target.linked) target.linked.material.units[target.linked.field.key] = unit;
  else if (!('materialField' in target.item)) target.item.unit = unit;
}

export function addValueLines(
  draft: Protocol,
  cardId: string,
  lines: readonly string[],
  valueRowId: string
) {
  const card = valuesCard(draft, cardId);
  if (!card) return undefined;
  const added = lines.flatMap(line => {
    const parsed = parseValueLine(line);
    return parsed
      ? [{ id: createId(), ...settledLine(parsed), ...(valueRowId && { section: valueRowId }) }]
      : [];
  });
  insertAfterPeers(card, valueRowId, added);
  return added.length === 1 && !added[0].value ? added[0].id : undefined;
}

export function addSuggestedValue(
  draft: Protocol,
  cardId: string,
  valueRowId: string,
  suggestion: ValueSuggestion
): string | undefined {
  const card = valuesCard(draft, cardId);
  if (!card) return undefined;
  const id = createId();
  if (suggestion.kind === 'field') {
    insertAfterPeers(card, valueRowId, [
      { id, section: valueRowId, materialField: suggestion.materialField },
    ]);
    const valueRow = card.sections.find(candidate => candidate.id === valueRowId);
    const material =
      valueRow && 'materialId' in valueRow
        ? materialsById(draft).get(valueRow.materialId)
        : undefined;
    if (material && !material.shownFields.includes(suggestion.materialField)) {
      material.shownFields.push(suggestion.materialField);
    }
  } else {
    const { name, value, unit } = suggestion;
    insertAfterPeers(card, valueRowId, [{ id, section: valueRowId, name, value, unit }]);
  }
  return id;
}

export function addValueRow(
  draft: Protocol,
  cardId: string,
  materialId: string | undefined
): string | undefined {
  const card = valuesCard(draft, cardId);
  if (!card) return undefined;
  const id = createId();
  card.sections.push(materialId ? { id, materialId } : { id, mixName: '' });
  return id;
}

function materialRowId(draft: Protocol, cardId: string, materialId: string) {
  const existing = valuesCard(draft, cardId)?.sections.find(
    valueRow => 'materialId' in valueRow && valueRow.materialId === materialId
  );
  return existing?.id ?? addValueRow(draft, cardId, materialId);
}

export function addRoutedValue(
  draft: Protocol,
  cardId: string,
  { line, destination }: RoutedValue
): string | undefined {
  const card = valuesCard(draft, cardId);
  if (!card) return undefined;
  if (destination.kind === 'general') {
    const id = createId();
    insertAfterPeers(card, '', [{ id, ...line }]);
    return id;
  }
  const { materialId } = destination;
  const mixRowId = destination.kind === 'row' ? destination.valueRowId : undefined;
  const valueRowId = materialId ? materialRowId(draft, cardId, materialId) : mixRowId;
  if (!valueRowId) return undefined;
  if (destination.kind === 'row') {
    const { label } = destination;
    return addSuggestedValue(draft, cardId, valueRowId, {
      kind: 'value',
      name: label,
      value: line.value,
      unit: line.unit,
      label,
    });
  }
  const material = materialsById(draft).get(destination.materialId);
  if (!material) return undefined;
  const { field } = destination;
  if (line.value) {
    writeMaterialField(material, field, line.value);
    if (line.unit && field.unit === UNIT_PER_ITEM) material.units[field.key] = line.unit;
  }
  const linked = card.items.find(
    item =>
      'materialField' in item && item.section === valueRowId && item.materialField === field.key
  );
  return (
    linked?.id ??
    addSuggestedValue(draft, cardId, valueRowId, {
      kind: 'field',
      materialField: field.key,
      label: field.label,
    })
  );
}

export function renameValueRow(
  draft: Protocol,
  cardId: string,
  valueRowId: string,
  name: string
): void {
  const valueRow = valuesCard(draft, cardId)?.sections.find(
    candidate => candidate.id === valueRowId
  );
  if (!valueRow) return;
  if ('mixName' in valueRow) {
    valueRow.mixName = name;
    return;
  }
  const material = materialsById(draft).get(valueRow.materialId);
  if (material) material.name = name;
}

export function removeValue(
  draft: Protocol,
  cardId: string,
  itemId: string
): RemovedValues | undefined {
  const card = valuesCard(draft, cardId);
  const item = card?.items.find(candidate => candidate.id === itemId);
  if (!card || !item) return undefined;
  const linked = linkedValueOf(card, item, materialsById(draft));
  const label = (linked ? linked.label : 'name' in item ? item.name : '') || 'a value';
  const index = valuesInRow(card, item.section ?? '').indexOf(item);
  card.items = card.items.filter(candidate => candidate.id !== itemId);
  return { kind: 'item', item: { ...item }, index, label };
}

export function removeValueRow(
  draft: Protocol,
  cardId: string,
  valueRowId: string
): RemovedValues | undefined {
  const card = valuesCard(draft, cardId);
  const valueRow = card?.sections.find(candidate => candidate.id === valueRowId);
  if (!card || !valueRow) return undefined;
  const items = card.items.filter(item => item.section === valueRowId).map(item => ({ ...item }));
  const label = `${valueRowName(valueRow, materialsById(draft)) || 'mix'} row`;
  const index = card.sections.indexOf(valueRow);
  card.sections = card.sections.filter(candidate => candidate.id !== valueRowId);
  card.items = card.items.filter(item => item.section !== valueRowId);
  return { kind: 'row', valueRow: { ...valueRow }, items, index, label };
}

export function restoreValues(draft: Protocol, cardId: string, removed: RemovedValues): void {
  const card = valuesCard(draft, cardId);
  if (!card) return;
  if (removed.kind === 'row') {
    card.sections.splice(Math.min(removed.index, card.sections.length), 0, removed.valueRow);
    card.items.push(...removed.items);
    return;
  }
  const peers = valuesInRow(card, removed.item.section ?? '');
  const before = peers[removed.index];
  const last = peers.at(-1);
  const at = before
    ? card.items.indexOf(before)
    : last
      ? card.items.indexOf(last) + 1
      : card.items.length;
  card.items.splice(at, 0, removed.item);
}
