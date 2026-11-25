import { normalizePlateMap, type PlateMapCard } from '@odysseus/shared-schemas';

import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { BOARD_COLUMNS } from '../../../../utils/cards/boardGeometry';
import { showPlateMap } from '../../../../utils/cards/createCard';
import { wordsForTypes } from '../../../../utils/plateMap/labwareCatalog';
import {
  applyLabware,
  duplicatePlateAsTab,
  duplicateOfTab,
  hasAnyLabware,
  wellsLostTo,
  withoutPlate,
  withLabwareCount,
  type Labware,
} from '../../../../utils/plateMap/plateMapEdits';

import type { Confirmation } from './useConfirmation';
import type { DuplicateAs } from './WorkbenchPlateMapControls';
import type { LabwareType } from '../../../../utils/plateMap/labwareCatalog';
import type { PlateMapTab } from '../../../../utils/plateMap/plateMapTabs';
import type { ShownPlateMap } from '../../../../utils/plateMap/shownPlateMap';

export function useLabwareChanges(
  card: PlateMapCard,
  plateMap: ShownPlateMap,
  tab: PlateMapTab,
  ask: (request: Confirmation) => void
) {
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);

  const changeLabware = (next: Labware) => {
    if (!hasAnyLabware(next)) return;
    const apply = () => updateProtocol(draft => applyLabware(draft, plateMap.id, next));
    const lost = wellsLostTo(plateMap, next);
    const words = wordsForTypes([
      ...plateMap.plates.map(plate => plate.labware),
      ...plateMap.otherLabware.map(set => set.labware),
    ]);
    if (!lost) return apply();
    ask({
      title: 'Remove labware',
      confirmText: 'Remove',
      message: `${lost} filled ${lost === 1 ? `${words.noun} is` : `${words.plural} are`} no longer on this map and will be cleared. Continue?`,
      onConfirm: apply,
    });
  };

  const duplicateAsTab = (plateId: string) =>
    updateProtocol(draft => {
      const target = draft.plateMaps.find(candidate => candidate.id === plateMap.id);
      const original = target?.plates.find(candidate => candidate.id === plateId);
      const shown = draft.cards.find(candidate => candidate.id === card.id);
      if (!target || !original || shown?.type !== 'plateMap') return;
      shown.activeTab = duplicatePlateAsTab(target, original);
      normalizePlateMap(target);
    });

  const duplicateAsCard = () =>
    updateProtocol(draft => {
      const { side: _side, activeTab: _tab, showsReplicatesAsOne: _asOne, ...stored } = plateMap;
      const copy = duplicateOfTab(stored, tab);
      normalizePlateMap(copy);
      draft.plateMaps.push(copy);
      const fitsBeside = card.x + card.w * 2 <= BOARD_COLUMNS;
      const shown = showPlateMap(
        draft,
        copy.id,
        {
          page: card.page,
          x: fitsBeside ? card.x + card.w : card.x,
          y: fitsBeside ? card.y : card.y + card.h,
          w: card.w,
          h: card.h,
        },
        card.side
      );
      shown.showsReplicatesAsOne = card.showsReplicatesAsOne;
    });

  return {
    setCount: (type: LabwareType, count: number) =>
      changeLabware(withLabwareCount(plateMap, type, count)),
    removePlate: (plateId: string) => changeLabware(withoutPlate(plateMap, plateId)),
    duplicateTab: (place: DuplicateAs) => {
      if (place === 'tab' && tab.kind === 'plate') duplicateAsTab(tab.plate.id);
      else duplicateAsCard();
    },
  };
}
