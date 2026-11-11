import type { PointerEvent } from 'react';

import { useStableActions } from '../../../../hooks/useStableActions';

import type { WellSelection } from './useWellSelection';
import type { VesselSheet } from '../../../../utils/vessels/vesselTabs';

export interface WellPointerActions {
  onPointerDown: (wellKey: string, event: PointerEvent) => void;
  onPointerEnter: (wellKey: string) => void;
  onDoubleClick: (wellKey: string) => void;
}

export function useWellPointerActions(
  sheet: VesselSheet,
  selection: WellSelection,
  onOpenWell: (wellKey: string) => void
): WellPointerActions {
  const spotOf = (wellKey: string) => sheet.spots.find(spot => spot.key === wellKey);
  return useStableActions<WellPointerActions>({
    onPointerDown: (wellKey, event) => {
      event.preventDefault();
      const spot = spotOf(wellKey);
      if (spot) {
        selection.press(spot, {
          isExtending: event.shiftKey,
          isToggling: event.ctrlKey || event.metaKey,
        });
      }
    },
    onPointerEnter: wellKey => {
      const spot = spotOf(wellKey);
      if (spot) selection.dragOver(spot);
    },
    onDoubleClick: onOpenWell,
  });
}
