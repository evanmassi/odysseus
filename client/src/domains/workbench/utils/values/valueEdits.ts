import { createId } from '../ids/createId';
import {
  fieldLabel,
  fieldName,
  fieldUnit,
  materialFields,
  UNIT_PER_ITEM,
} from '../materials/materialCatalog';

import { parseValueLine } from './valueLines';

import type { ValueSuggestion } from './valueSuggestions';
import type {
  FieldDefinition,
  MaterialItem,
  Protocol,
  ValuesBlock,
} from '@odysseus/shared-schemas';

type ValueItem = ValuesBlock['items'][number];
type ValueSection = ValuesBlock['sections'][number];

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
  | { kind: 'section'; section: ValueSection; items: ValueItem[]; index: number; label: string };

export const materialsById = (protocol: Pick<Protocol, 'blocks'>): Map<string, MaterialItem> =>
  new Map(
    protocol.blocks
      .flatMap(block => (block.type === 'materials' ? block.items : []))
      .map(item => [item.id, item])
  );

export function linkedValueOf(
  block: ValuesBlock,
  item: ValueItem,
  materials: ReadonlyMap<string, MaterialItem>
): LinkedValue | undefined {
  if (!('materialField' in item)) return undefined;
  const section = block.sections.find(candidate => candidate.id === item.section);
  const material =
    section && 'materialId' in section ? materials.get(section.materialId) : undefined;
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

export const sectionPeers = (block: ValuesBlock, sectionId: string): ValueItem[] =>
  block.items.filter(item => (item.section ?? '') === sectionId);

export function sectionName(
  section: ValueSection,
  materials: ReadonlyMap<string, MaterialItem>
): string {
  if ('mixName' in section) return section.mixName.trim();
  return materials.get(section.materialId)?.name.trim() ?? section.materialName ?? '';
}

function valuesBlock(draft: Protocol, blockId: string): ValuesBlock | undefined {
  const block = draft.blocks.find(candidate => candidate.id === blockId);
  return block?.type === 'values' ? block : undefined;
}

function editTarget(draft: Protocol, blockId: string, itemId: string) {
  const block = valuesBlock(draft, blockId);
  const item = block?.items.find(candidate => candidate.id === itemId);
  if (!block || !item) return undefined;
  return { block, item, linked: linkedValueOf(block, item, materialsById(draft)) };
}

export function insertAfterPeers(block: ValuesBlock, sectionId: string, added: ValueItem[]) {
  const last = sectionPeers(block, sectionId).at(-1);
  block.items.splice(last ? block.items.indexOf(last) + 1 : block.items.length, 0, ...added);
}

export function renameValue(draft: Protocol, blockId: string, itemId: string, name: string): void {
  const target = editTarget(draft, blockId, itemId);
  if (!target) return;
  if (target.linked) {
    const { material, field } = target.linked;
    if (name.trim()) material.fieldLabels[field.key] = name;
    else delete material.fieldLabels[field.key];
  } else if (!('materialField' in target.item)) target.item.name = name;
}

export function setValueAmount(
  draft: Protocol,
  blockId: string,
  itemId: string,
  value: string
): void {
  const target = editTarget(draft, blockId, itemId);
  if (!target) return;
  if (target.linked) target.linked.material.values[target.linked.field.key] = value;
  else if (!('materialField' in target.item)) target.item.value = value;
}

export function setValueUnit(draft: Protocol, blockId: string, itemId: string, unit: string): void {
  const target = editTarget(draft, blockId, itemId);
  if (!target) return;
  if (target.linked) target.linked.material.units[target.linked.field.key] = unit;
  else if (!('materialField' in target.item)) target.item.unit = unit;
}

export function addValueLines(
  draft: Protocol,
  blockId: string,
  lines: readonly string[],
  sectionId: string
) {
  const block = valuesBlock(draft, blockId);
  if (!block) return undefined;
  const added = lines.flatMap(line => {
    const parsed = parseValueLine(line);
    return parsed ? [{ id: createId(), ...parsed, ...(sectionId && { section: sectionId }) }] : [];
  });
  insertAfterPeers(block, sectionId, added);
  return added.length === 1 && !added[0].value ? added[0].id : undefined;
}

export function addSuggestedValue(
  draft: Protocol,
  blockId: string,
  sectionId: string,
  suggestion: ValueSuggestion
): string | undefined {
  const block = valuesBlock(draft, blockId);
  if (!block) return undefined;
  const id = createId();
  if (suggestion.kind === 'field') {
    insertAfterPeers(block, sectionId, [
      { id, section: sectionId, materialField: suggestion.materialField },
    ]);
    const section = block.sections.find(candidate => candidate.id === sectionId);
    const material =
      section && 'materialId' in section ? materialsById(draft).get(section.materialId) : undefined;
    if (material && !material.shownFields.includes(suggestion.materialField)) {
      material.shownFields.push(suggestion.materialField);
    }
  } else {
    const { name, value, unit } = suggestion;
    insertAfterPeers(block, sectionId, [{ id, section: sectionId, name, value, unit }]);
  }
  return id;
}

export function addValueSection(
  draft: Protocol,
  blockId: string,
  materialId: string | undefined
): string | undefined {
  const block = valuesBlock(draft, blockId);
  if (!block) return undefined;
  const id = createId();
  block.sections.push(materialId ? { id, materialId } : { id, mixName: '' });
  return id;
}

export function renameValueSection(
  draft: Protocol,
  blockId: string,
  sectionId: string,
  name: string
): void {
  const section = valuesBlock(draft, blockId)?.sections.find(
    candidate => candidate.id === sectionId
  );
  if (!section) return;
  if ('mixName' in section) {
    section.mixName = name;
    return;
  }
  const material = materialsById(draft).get(section.materialId);
  if (material) material.name = name;
}

export function removeValue(
  draft: Protocol,
  blockId: string,
  itemId: string
): RemovedValues | undefined {
  const block = valuesBlock(draft, blockId);
  const item = block?.items.find(candidate => candidate.id === itemId);
  if (!block || !item) return undefined;
  const linked = linkedValueOf(block, item, materialsById(draft));
  const label = (linked ? linked.label : 'name' in item ? item.name : '') || 'a value';
  const index = sectionPeers(block, item.section ?? '').indexOf(item);
  block.items = block.items.filter(candidate => candidate.id !== itemId);
  return { kind: 'item', item: { ...item }, index, label };
}

export function removeValueSection(
  draft: Protocol,
  blockId: string,
  sectionId: string
): RemovedValues | undefined {
  const block = valuesBlock(draft, blockId);
  const section = block?.sections.find(candidate => candidate.id === sectionId);
  if (!block || !section) return undefined;
  const items = block.items.filter(item => item.section === sectionId).map(item => ({ ...item }));
  const label = `${sectionName(section, materialsById(draft)) || 'mix'} section`;
  const index = block.sections.indexOf(section);
  block.sections = block.sections.filter(candidate => candidate.id !== sectionId);
  block.items = block.items.filter(item => item.section !== sectionId);
  return { kind: 'section', section: { ...section }, items, index, label };
}

export function restoreValues(draft: Protocol, blockId: string, removed: RemovedValues): void {
  const block = valuesBlock(draft, blockId);
  if (!block) return;
  if (removed.kind === 'section') {
    block.sections.splice(Math.min(removed.index, block.sections.length), 0, removed.section);
    block.items.push(...removed.items);
    return;
  }
  const peers = sectionPeers(block, removed.item.section ?? '');
  const before = peers[removed.index];
  const last = peers.at(-1);
  const at = before
    ? block.items.indexOf(before)
    : last
      ? block.items.indexOf(last) + 1
      : block.items.length;
  block.items.splice(at, 0, removed.item);
}
