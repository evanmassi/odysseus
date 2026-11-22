import { normalizePlateMap, type PlateMapBlock } from '@odysseus/shared-schemas';

import { useWorkbenchStore } from '../../../../stores/workbenchStore';
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

import { useUpdatePlateMap } from './useUpdatePlateMap';

import type { Confirmation } from './useConfirmation';
import type { DuplicateAs } from './WorkbenchPlateMapControls';
import type { LabwareType } from '../../../../utils/plateMap/labwareCatalog';
import type { PlateMapTab } from '../../../../utils/plateMap/plateMapTabs';

export function useLabwareChanges(
  block: PlateMapBlock,
  tab: PlateMapTab,
  ask: (request: Confirmation) => void
) {
  const updatePlateMap = useUpdatePlateMap(block);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);

  const changeLabware = (next: Labware) => {
    if (!hasAnyLabware(next)) return;
    const apply = () => updatePlateMap(draft => applyLabware(draft, next));
    const lost = wellsLostTo(block, next);
    const words = wordsForTypes([
      ...block.plates.map(plate => plate.vessel),
      ...block.sets.map(set => set.vessel),
    ]);
    if (!lost) return apply();
    ask({
      title: 'Remove labware',
      confirmText: 'Remove',
      message: `${lost} filled ${lost === 1 ? `${words.noun} is` : `${words.plural} are`} no longer on this map and will be cleared. Continue?`,
      onConfirm: apply,
    });
  };

  return {
    setCount: (type: LabwareType, count: number) =>
      changeLabware(withLabwareCount(block, type, count)),
    removePlate: (plateId: string) => changeLabware(withoutPlate(block, plateId)),
    duplicateTab: (place: DuplicateAs) => {
      if (place === 'tab' && tab.kind === 'plate') {
        const { plate } = tab;
        updatePlateMap(draft => {
          const original = draft.plates.find(candidate => candidate.id === plate.id);
          if (original) duplicatePlateAsTab(draft, original);
        });
        return;
      }
      updateProtocol(draft => {
        const copy = duplicateOfTab(block, tab);
        normalizePlateMap(copy);
        draft.blocks.push(copy);
      });
    },
  };
}
