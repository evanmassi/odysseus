import { normalizeVesselMap, type VesselMapBlock } from '@odysseus/shared-schemas';

import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { wordsForTypes } from '../../../../utils/vessels/vesselCatalog';
import {
  applyVessels,
  copyPlateIntoCard,
  duplicateOfTab,
  hasAnyVessel,
  wellsLostTo,
  withoutPlate,
  withVesselCount,
  type Vessels,
} from '../../../../utils/vessels/vesselEdits';

import { useUpdateVesselMap } from './useUpdateVesselMap';

import type { Confirmation } from './useConfirmation';
import type { CopyPlace } from './WorkbenchVesselMapControls';
import type { VesselType } from '../../../../utils/vessels/vesselCatalog';
import type { VesselTab } from '../../../../utils/vessels/vesselTabs';

export function useVesselChanges(
  block: VesselMapBlock,
  tab: VesselTab,
  ask: (request: Confirmation) => void
) {
  const updateVesselMap = useUpdateVesselMap(block);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);

  const changeVessels = (next: Vessels) => {
    if (!hasAnyVessel(next)) return;
    const apply = () => updateVesselMap(draft => applyVessels(draft, next));
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
    setCount: (type: VesselType, count: number) =>
      changeVessels(withVesselCount(block, type, count)),
    removePlate: (plateId: string) => changeVessels(withoutPlate(block, plateId)),
    duplicateTab: (place: CopyPlace) => {
      if (place === 'tab' && tab.kind === 'plate') {
        const { plate } = tab;
        updateVesselMap(draft => {
          const original = draft.plates.find(candidate => candidate.id === plate.id);
          if (original) copyPlateIntoCard(draft, original);
        });
        return;
      }
      updateProtocol(draft => {
        const copy = duplicateOfTab(block, tab);
        normalizeVesselMap(copy);
        draft.blocks.push(copy);
      });
    },
  };
}
