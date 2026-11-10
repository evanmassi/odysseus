import { MATERIAL_GROUPS, fieldLabel, materialFields } from '../materials/materialCatalog';
import { normalizeMaterialKey } from '../materials/materialGuesser';

import type { MaterialItem, Protocol, ValuesBlock } from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui';

type ValueSection = ValuesBlock['sections'][number];

export type ValueSuggestion =
  | { kind: 'field'; materialField: string; label: string }
  | { kind: 'value'; name: string; value: string; unit: string; label: string };

type SuggestionRow = readonly [name: string, unit?: string];

const USUAL_VALUES: Readonly<Record<string, readonly SuggestionRow[]>> = {
  bio: [
    ['Per well', 'cells'],
    ['Volume per well', 'µL'],
  ],
  ab: [['Volume per well', 'µL'], ['Tests']],
  chem: [['Final concentration', 'µM'], ['Volume per well', 'µL'], ['Fold', 'X'], ['Points']],
  mix: [
    ['Volume per well', 'µL'],
    ['Total volume', 'mL'],
  ],
  other: [['Volume per well', 'µL']],
};

const SKIPPED_GROUPS = new Set(['equip', 'soft']);

function hasVesselMapFor(protocol: Pick<Protocol, 'blocks'>, material: MaterialItem) {
  const vesselMaps = protocol.blocks.filter(block => block.type === 'plate');
  const key = normalizeMaterialKey(material.name);
  return (
    vesselMaps.some(block => normalizeMaterialKey(block.title).includes(key)) ||
    vesselMaps.length === 1
  );
}

export function valueSuggestions(
  protocol: Pick<Protocol, 'blocks'>,
  block: ValuesBlock,
  section: ValueSection,
  material: MaterialItem | undefined
): ValueSuggestion[] {
  if ('materialId' in section && !material) return [];
  const peers = block.items.filter(item => item.section === section.id);
  const taken = new Set(
    peers.map(item =>
      'materialField' in item ? item.materialField : normalizeMaterialKey(item.name)
    )
  );
  const ownFields: ValueSuggestion[] =
    material && material.type !== 'Plate'
      ? materialFields(material)
          .filter(definition => definition.kind === 'number' && !taken.has(definition.key))
          .map(definition => ({
            kind: 'field',
            materialField: definition.key,
            label: fieldLabel(material, definition),
          }))
      : [];
  const ownLabels = new Set(ownFields.map(suggestion => normalizeMaterialKey(suggestion.label)));
  const usual: readonly SuggestionRow[] = !material
    ? USUAL_VALUES['mix']
    : material.type === 'Plate'
      ? hasVesselMapFor(protocol, material)
        ? []
        : [['Wells used']]
      : (USUAL_VALUES[material.group] ?? USUAL_VALUES['other']);
  return [
    ...ownFields,
    ...usual
      .filter(
        ([name]) =>
          !taken.has(normalizeMaterialKey(name)) && !ownLabels.has(normalizeMaterialKey(name))
      )
      .map(
        ([name, unit = '']): ValueSuggestion => ({
          kind: 'value',
          name,
          value: '',
          unit,
          label: name,
        })
      ),
  ];
}

export function valueSectionChoices(
  protocol: Pick<Protocol, 'blocks'>,
  block: ValuesBlock
): SelectOption[] {
  const sectioned = new Set(
    block.sections.flatMap(section => ('materialId' in section ? [section.materialId] : []))
  );
  const materials = protocol.blocks.flatMap(candidate =>
    candidate.type === 'materials' ? candidate.items : []
  );
  const customGroups = [
    ...new Set(materials.map(item => item.group).filter(group => group.startsWith('custom:'))),
  ];
  const groups = [
    ...MATERIAL_GROUPS.map(group => ({ key: group.key, label: group.label })),
    ...customGroups.map(key => ({ key, label: key.slice('custom:'.length) })),
  ];
  return groups
    .filter(group => !SKIPPED_GROUPS.has(group.key))
    .flatMap(group =>
      materials
        .filter(
          item =>
            item.group === group.key &&
            item.name.trim() &&
            !item.isDropped &&
            !sectioned.has(item.id)
        )
        .map(item => ({ value: item.id, label: item.name, group: group.label }))
    );
}
