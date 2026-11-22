import { normalizeMaterialKey } from '@odysseus/shared-schemas';

import { fieldLabel, materialFields } from '../materials/materialCatalog';
import { CELLS_PER_WELL, FINAL_CONCENTRATION, VOLUME_PER_WELL, type Term } from '../terms/termList';

import type { MaterialItem, Protocol, ValuesCard, ValueRow } from '@odysseus/shared-schemas';

export type ValueSuggestion =
  | { kind: 'field'; materialField: string; label: string }
  | { kind: 'value'; name: string; value: string; unit: string; label: string };

type SuggestionRow = readonly [name: string, unit?: string];

const suggested = (term: Term): SuggestionRow => [term.word, term.unit];

const USUAL_VALUES: Readonly<Record<string, readonly SuggestionRow[]>> = {
  bio: [suggested(CELLS_PER_WELL), suggested(VOLUME_PER_WELL)],
  ab: [suggested(VOLUME_PER_WELL), ['Tests']],
  chem: [[FINAL_CONCENTRATION.word, 'µM'], suggested(VOLUME_PER_WELL), ['Fold', 'X'], ['Points']],
  mix: [suggested(VOLUME_PER_WELL)],
  other: [suggested(VOLUME_PER_WELL)],
};

function hasPlateMapFor(protocol: Pick<Protocol, 'blocks'>, material: MaterialItem) {
  const plateMaps = protocol.blocks.filter(card => card.type === 'plate');
  const key = normalizeMaterialKey(material.name);
  return (
    plateMaps.some(card => normalizeMaterialKey(card.title).includes(key)) || plateMaps.length === 1
  );
}

export function valueSuggestions(
  protocol: Pick<Protocol, 'blocks'>,
  card: ValuesCard,
  valueRow: ValueRow,
  material: MaterialItem | undefined
): ValueSuggestion[] {
  if ('materialId' in valueRow && !material) return [];
  const peers = card.items.filter(item => item.section === valueRow.id);
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
      ? hasPlateMapFor(protocol, material)
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
