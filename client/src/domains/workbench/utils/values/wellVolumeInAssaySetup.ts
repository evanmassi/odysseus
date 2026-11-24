import { produce } from 'immer';

import { nameKey } from '../formulas/boardCalculation';
import { followOldNames } from '../formulas/nameRenames';
import { TOTAL_WELL_VOLUME } from '../terms/termList';
import { isSpellingOf } from '../terms/termLookup';

import { insertAfterPeers, materialsById, valueRowName } from './valueEdits';
import { GENERAL, joinValueName } from './valueNames';

import type { Protocol, ValuesCard } from '@odysseus/shared-schemas';

type TypedValue = Extract<ValuesCard['items'][number], { name: string }>;

const isWellVolume = (item: ValuesCard['items'][number]): item is TypedValue =>
  'name' in item && isSpellingOf(item.name, TOTAL_WELL_VOLUME.word);

export function withWellVolumeInAssaySetup(protocol: Protocol): Protocol {
  const valuesCards = protocol.cards.filter((card): card is ValuesCard => card.type === 'values');
  const [first] = valuesCards;
  const items = valuesCards.flatMap(card => card.items.filter(isWellVolume));
  if (!first || items.some(item => !item.row)) return protocol;
  const onRows = items.filter(item => item.value.trim());
  const amounts = new Set(onRows.map(item => `${item.value.trim()} ${item.unit}`));
  if (amounts.size !== 1) return protocol;
  const materials = materialsById(protocol);
  return produce(protocol, draft => {
    const byOldName = new Map<string, string>();
    const cards = draft.cards.filter((card): card is ValuesCard => card.type === 'values');
    for (const card of cards) {
      for (const item of card.items.filter(isWellVolume)) {
        const valueRow = card.rows.find(row => row.id === item.row);
        const rowName = valueRow ? valueRowName(valueRow, materials) : '';
        byOldName.set(nameKey(joinValueName(rowName, item.name)), TOTAL_WELL_VOLUME.word);
      }
      card.items = card.items.filter(item => !isWellVolume(item));
    }
    const [kept] = onRows;
    const target = cards.find(card => card.id === first.id);
    if (target) {
      insertAfterPeers(target, GENERAL, [
        { id: kept.id, name: TOTAL_WELL_VOLUME.word, value: kept.value, unit: kept.unit },
      ]);
    }
    followOldNames(draft, byOldName);
  });
}
