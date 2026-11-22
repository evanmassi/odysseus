import type { MouseEvent, PointerEvent } from 'react';

import { useStableActions } from '../../../../hooks/useStableActions';

import { pressModifiers } from './useWellSelection';

import type { WellSelection } from './useWellSelection';
import type { PlateMapSheet } from '../../../../utils/plateMap/plateMapTabs';

export interface WellPointerActions {
  onPointerDown: (wellKey: string, event: PointerEvent) => void;
  onPointerEnter: (wellKey: string) => void;
  onDoubleClick: (wellKey: string) => void;
  onContextMenu: (wellKey: string, event: MouseEvent) => void;
}

export function useWellPointerActions(
  sheet: PlateMapSheet,
  selection: WellSelection,
  onOpenWell: (wellKey: string) => void,
  onOpenMenu: (wellKey: string, at: { x: number; y: number }) => void
): WellPointerActions {
  const positionOf = (wellKey: string) =>
    sheet.positions.find(position => position.key === wellKey);
  return useStableActions<WellPointerActions>({
    onPointerDown: (wellKey, event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const position = positionOf(wellKey);
      if (position) {
        selection.press(position, pressModifiers(event));
      }
    },
    onPointerEnter: wellKey => {
      const position = positionOf(wellKey);
      if (position) selection.dragOver(position);
    },
    onDoubleClick: onOpenWell,
    onContextMenu: (wellKey, event) => {
      event.preventDefault();
      onOpenMenu(wellKey, { x: event.clientX, y: event.clientY });
    },
  });
}
