import { cardShowing, openCard } from '../cards/createCard';
import { nameWithin } from '../formulas/formulaScopes';
import { createId } from '../ids/createId';
import {
  fieldLabel,
  fieldName,
  fieldUnit,
  materialFields,
  materialValueId,
  UNIT_PER_ITEM,
} from '../materials/materialCatalog';
import { writeMaterialField } from '../materials/materialItems';

import { parseValueLine, settledLine, type ParsedValueLine } from './valueLines';

import type { RoutedValue } from './valueRouting';
import type { ValueSuggestion } from './valueSuggestions';
import type {
  FieldDefinition,
  MaterialItem,
  Protocol,
  ProtocolValues,
  ValueItem,
  ValueRow,
} from '@odysseus/shared-schemas';

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

export const materialsById = (protocol: Pick<Protocol, 'materials'>): Map<string, MaterialItem> =>
  new Map(protocol.materials.items.map(item => [item.id, item]));

export function linkedValueOf(
  values: ProtocolValues,
  item: ValueItem,
  materials: ReadonlyMap<string, MaterialItem>
): LinkedValue | undefined {
  if (!('materialField' in item)) return undefined;
  const valueRow = values.rows.find(candidate => candidate.id === item.row);
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

export const valuesInRow = (values: ProtocolValues, valueRowId: string): ValueItem[] =>
  values.items.filter(item => (item.row ?? '') === valueRowId);

export function valueRowName(
  valueRow: ValueRow,
  materials: ReadonlyMap<string, MaterialItem>
): string {
  if ('mixName' in valueRow) return valueRow.mixName.trim();
  return materials.get(valueRow.materialId)?.name.trim() ?? valueRow.materialName ?? '';
}

function editTarget(draft: Protocol, itemId: string) {
  const item = draft.values.items.find(candidate => candidate.id === itemId);
  if (!item) return undefined;
  return { item, linked: linkedValueOf(draft.values, item, materialsById(draft)) };
}

export function insertAfterPeers(values: ProtocolValues, valueRowId: string, added: ValueItem[]) {
  const last = valuesInRow(values, valueRowId).at(-1);
  values.items.splice(last ? values.items.indexOf(last) + 1 : values.items.length, 0, ...added);
}

export function renameValue(draft: Protocol, itemId: string, name: string): void {
  const target = editTarget(draft, itemId);
  if (!target) return;
  if (target.linked) {
    const { material, field } = target.linked;
    const column = draft.materials.items.filter(
      peer =>
        peer.group === material.group && materialFields(peer).some(each => each.key === field.key)
    );
    for (const peer of column) {
      if (name.trim()) peer.fieldLabels[field.key] = name;
      else delete peer.fieldLabels[field.key];
    }
  } else if (!('materialField' in target.item)) target.item.name = name;
}

export function setValueAmount(draft: Protocol, itemId: string, value: string): void {
  const target = editTarget(draft, itemId);
  if (!target) return;
  if (target.linked) target.linked.material.values[target.linked.field.key] = value;
  else if (!('materialField' in target.item)) target.item.value = value;
}

export function setValueUnit(draft: Protocol, itemId: string, unit: string): void {
  const target = editTarget(draft, itemId);
  if (!target) return;
  if (target.linked) target.linked.material.units[target.linked.field.key] = unit;
  else if (!('materialField' in target.item)) target.item.unit = unit;
}

export function addValueLines(
  draft: Protocol,
  lines: readonly string[],
  valueRowId: string
): string | undefined {
  const added = lines.flatMap(line => {
    const parsed = parseValueLine(line);
    return parsed
      ? [{ id: createId(), ...settledLine(parsed), ...(valueRowId && { row: valueRowId }) }]
      : [];
  });
  insertAfterPeers(draft.values, valueRowId, added);
  return added.length === 1 && !added[0].value ? added[0].id : undefined;
}

export function addSuggestedValue(
  draft: Protocol,
  valueRowId: string,
  suggestion: ValueSuggestion
): string {
  const id = createId();
  if (suggestion.kind === 'field') {
    insertAfterPeers(draft.values, valueRowId, [
      { id, row: valueRowId, materialField: suggestion.materialField },
    ]);
    const valueRow = draft.values.rows.find(candidate => candidate.id === valueRowId);
    const material =
      valueRow && 'materialId' in valueRow
        ? materialsById(draft).get(valueRow.materialId)
        : undefined;
    if (material && !material.shownFields.includes(suggestion.materialField)) {
      material.shownFields.push(suggestion.materialField);
    }
  } else {
    const { name, value, unit } = suggestion;
    insertAfterPeers(draft.values, valueRowId, [{ id, row: valueRowId, name, value, unit }]);
  }
  return id;
}

export function addValueRow(draft: Protocol, materialId: string | undefined): string {
  const id = createId();
  draft.values.rows.push(materialId ? { id, materialId } : { id, mixName: '' });
  return id;
}

export function materialRowId(draft: Protocol, materialId: string): string {
  const existing = draft.values.rows.find(
    valueRow => 'materialId' in valueRow && valueRow.materialId === materialId
  );
  return existing?.id ?? addValueRow(draft, materialId);
}

function showValuesOnPage(draft: Protocol, pageId: string): void {
  const values = { type: 'values' } as const;
  if (!cardShowing(draft, values, pageId)) openCard(draft, values, pageId);
}

export function addNamedValue(
  draft: Protocol,
  line: ParsedValueLine,
  material: MaterialItem | undefined,
  pageId: string
): void {
  showValuesOnPage(draft, pageId);
  const valueRowId = material ? materialRowId(draft, material.id) : '';
  insertAfterPeers(draft.values, valueRowId, [
    {
      id: createId(),
      ...line,
      name: nameWithin(line.name, material),
      ...(valueRowId && { row: valueRowId }),
    },
  ]);
}

export function addRoutedValue(draft: Protocol, { line, destination }: RoutedValue) {
  if (destination.kind === 'general') {
    const id = createId();
    insertAfterPeers(draft.values, '', [{ id, ...line }]);
    return id;
  }
  const { materialId } = destination;
  const mixRowId = destination.kind === 'row' ? destination.valueRowId : undefined;
  const valueRowId = materialId ? materialRowId(draft, materialId) : mixRowId;
  if (!valueRowId) return undefined;
  if (destination.kind === 'row') {
    const { label } = destination;
    return addSuggestedValue(draft, valueRowId, {
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
  const linked = draft.values.items.find(
    item => 'materialField' in item && item.row === valueRowId && item.materialField === field.key
  );
  return (
    linked?.id ??
    addSuggestedValue(draft, valueRowId, {
      kind: 'field',
      materialField: field.key,
      label: field.label,
    })
  );
}

export type ValueRowTarget =
  | { kind: 'material'; materialId: string }
  | { kind: 'row'; valueRowId: string };

export function moveValueToRow(draft: Protocol, itemId: string, target: ValueRowTarget): void {
  const item = draft.values.items.find(candidate => candidate.id === itemId);
  if (!item || 'materialField' in item) return;
  const valueRowId =
    target.kind === 'material' ? materialRowId(draft, target.materialId) : target.valueRowId;
  if (!valueRowId) return;
  const moved = { ...item, row: valueRowId };
  draft.values.items.splice(draft.values.items.indexOf(item), 1);
  insertAfterPeers(draft.values, valueRowId, [moved]);
}

export function renameValueRow(draft: Protocol, valueRowId: string, name: string): void {
  const valueRow = draft.values.rows.find(candidate => candidate.id === valueRowId);
  if (!valueRow) return;
  if ('mixName' in valueRow) {
    valueRow.mixName = name;
    return;
  }
  const material = materialsById(draft).get(valueRow.materialId);
  if (material) material.name = name;
}

export function removeValue(draft: Protocol, itemId: string): RemovedValues | undefined {
  const { values } = draft;
  const item = values.items.find(candidate => candidate.id === itemId);
  if (!item) return undefined;
  const linked = linkedValueOf(values, item, materialsById(draft));
  const label = (linked ? linked.label : 'name' in item ? item.name : '') || 'a value';
  const index = valuesInRow(values, item.row ?? '').indexOf(item);
  values.items = values.items.filter(candidate => candidate.id !== itemId);
  return { kind: 'item', item: { ...item }, index, label };
}

export function removeValueRow(draft: Protocol, valueRowId: string): RemovedValues | undefined {
  const { values } = draft;
  const valueRow = values.rows.find(candidate => candidate.id === valueRowId);
  if (!valueRow) return undefined;
  const items = values.items.filter(item => item.row === valueRowId).map(item => ({ ...item }));
  const label = `${valueRowName(valueRow, materialsById(draft)) || 'mix'} row`;
  const index = values.rows.indexOf(valueRow);
  values.rows = values.rows.filter(candidate => candidate.id !== valueRowId);
  values.items = values.items.filter(item => item.row !== valueRowId);
  return { kind: 'row', valueRow: { ...valueRow }, items, index, label };
}

export function restoreValues(draft: Protocol, removed: RemovedValues): void {
  const { values } = draft;
  if (removed.kind === 'row') {
    values.rows.splice(Math.min(removed.index, values.rows.length), 0, removed.valueRow);
    values.items.push(...removed.items);
    return;
  }
  const peers = valuesInRow(values, removed.item.row ?? '');
  const before = peers[removed.index];
  const last = peers.at(-1);
  const at = before
    ? values.items.indexOf(before)
    : last
      ? values.items.indexOf(last) + 1
      : values.items.length;
  values.items.splice(at, 0, removed.item);
}

export type ValueSource =
  | { kind: 'item'; itemId: string }
  | { kind: 'material'; materialId: string; field: FieldDefinition };

export function valueSourceOf(
  protocol: Pick<Protocol, 'materials' | 'values'>,
  entryId: string
): ValueSource | undefined {
  const item = protocol.values.items.find(
    candidate => candidate.id === entryId && 'name' in candidate
  );
  if (item) return { kind: 'item', itemId: item.id };
  for (const material of materialsById(protocol).values()) {
    const field = materialFields(material).find(
      definition => materialValueId(material.id, definition.key) === entryId
    );
    if (field) return { kind: 'material', materialId: material.id, field };
  }
  return undefined;
}

export function writeValueSource(draft: Protocol, source: ValueSource, value: string): void {
  if (source.kind === 'item') {
    setValueAmount(draft, source.itemId, value);
    return;
  }
  const material = materialsById(draft).get(source.materialId);
  if (material) writeMaterialField(material, source.field, value);
}
