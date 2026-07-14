/**
 * Grid Keyboard Navigation
 *
 * Keyboard navigation and shortcuts for grid components.
 */

import { useCallback } from 'react';

import { getGridTotalPositions } from '@domains/storage';
import { useTubeStore } from '@domains/tubes/stores/tubeStore';
import { toPositionKey } from '@domains/tubes/types/gridSelectionTypes';
import { logger } from '@infra/logger';
import { getSelectionRange } from '@shared/utils/gridCoordinates';

import type { ClipboardData } from '@domains/tubes/types/clipboardTypes';
import type {
  GridControllerReturn,
  PositionContext,
  PositionKey,
} from '@domains/tubes/types/gridSelectionTypes';
import type { GridConfiguration } from '@odysseus/shared-schemas';

export interface UseGridKeyboardNavigationProps {
  gridConfig: GridConfiguration;
  focusedPosition: number;
  setFocusedPosition: (position: number) => void;
  selectedPositions: Set<PositionKey>;
  onSelectionChange: (positions: Set<PositionKey>) => void;
  controller: GridControllerReturn;
  ctx: PositionContext;
  setClipboard: (data: ClipboardData | null) => void;
}

export interface UseGridKeyboardNavigationReturn {
  handleGridKeyDown: (event: React.KeyboardEvent) => void;
}

/**
 * Keyboard shortcuts:
 * - Arrow keys: Navigation (with wrapping)
 * - Shift+Arrow: Range selection
 * - Space: Toggle selection
 * - Enter: Open modal
 * - Delete: Delete selected
 * - Ctrl+A: Select all
 * - Escape: Clear selection and clipboard
 * - Ctrl+C/X/V: Copy/Cut/Paste
 * - Shift+L: Toggle lock/unlock
 * - Shift+S: Share access
 */
export function useGridKeyboardNavigation(
  props: UseGridKeyboardNavigationProps
): UseGridKeyboardNavigationReturn {
  const {
    gridConfig,
    focusedPosition,
    setFocusedPosition,
    selectedPositions,
    onSelectionChange,
    controller,
    ctx,
    setClipboard,
  } = props;

  const handleGridKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const { key, shiftKey, ctrlKey, metaKey } = event;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        event.preventDefault();

        const { cols } = gridConfig;
        const totalPositions = getGridTotalPositions(gridConfig);
        const lastRow = Math.floor((totalPositions - 1) / cols);
        const row = Math.floor((focusedPosition - 1) / cols);
        const col = (focusedPosition - 1) % cols;

        let newRow = row;
        let newCol = col;

        // Clamp at edges instead of wrapping
        switch (key) {
          case 'ArrowUp':
            newRow = Math.max(0, row - 1);
            break;
          case 'ArrowDown':
            newRow = Math.min(lastRow, row + 1);
            break;
          case 'ArrowLeft':
            newCol = Math.max(0, col - 1);
            break;
          case 'ArrowRight':
            newCol = Math.min(cols - 1, col + 1);
            break;
        }

        const newPosition = newRow * cols + newCol + 1;

        if (newPosition === focusedPosition || newPosition < 1 || newPosition > totalPositions) {
          return;
        }

        setFocusedPosition(newPosition);

        if (shiftKey) {
          const currentAnchor = useTubeStore.getState().selectionAnchor ?? focusedPosition;
          const rangePositions = getSelectionRange(currentAnchor, newPosition);
          const newSelection = new Set<PositionKey>();
          rangePositions.forEach(pos => {
            newSelection.add(toPositionKey(ctx, pos));
          });
          onSelectionChange(newSelection);
          // Don't update anchor during range selection - keeps extending from original position
        } else {
          const positionKey = toPositionKey(ctx, newPosition);
          onSelectionChange(new Set([positionKey]));
          useTubeStore.getState().setSelectionAnchor(newPosition);
        }
        return;
      }

      if (key === ' ') {
        event.preventDefault();
        controller.actions.toggleInSelection(focusedPosition);
        return;
      }

      if (key === 'Enter') {
        event.preventDefault();
        if (selectedPositions.size > 0) {
          controller.openModal();
        } else {
          // openModal() reads selection that hasn't settled yet; activate the
          // focused cell through the same path as a double-click instead.
          controller.handlePositionDoubleClick(focusedPosition);
        }
        return;
      }

      if (key === 'Delete') {
        event.preventDefault();
        if (selectedPositions.size > 0) {
          void controller.actions.delete();
        }
        return;
      }

      if (key === 'a' && (ctrlKey || metaKey)) {
        event.preventDefault();
        const allPositions = new Set<PositionKey>();
        const totalPositions = getGridTotalPositions(gridConfig);
        for (let i = 1; i <= totalPositions; i++) {
          allPositions.add(toPositionKey(ctx, i));
        }
        onSelectionChange(allPositions);
        return;
      }

      if (key === 'Escape') {
        event.preventDefault();
        controller.actions.clearSelection();
        setClipboard(null);
        return;
      }

      if (key === 'c' && (ctrlKey || metaKey)) {
        event.preventDefault();
        void controller.actions.copy();
        return;
      }

      if (key === 'x' && (ctrlKey || metaKey)) {
        event.preventDefault();
        void controller.actions.cut();
        return;
      }

      if (key === 'v' && (ctrlKey || metaKey)) {
        event.preventDefault();
        void (async () => {
          try {
            await controller.actions.paste();
          } catch (error) {
            logger.error('Paste operation failed', { error });
            // Error notification already shown by paste handler
          }
        })();
        return;
      }

      if (key === 'L' && shiftKey && !ctrlKey && !metaKey) {
        event.preventDefault();
        if (controller.actions.toggleLock) {
          void controller.actions.toggleLock();
        }
        return;
      }

      if (key === 'S' && shiftKey && !ctrlKey && !metaKey) {
        event.preventDefault();
        if (controller.actions.shareAccess) {
          controller.actions.shareAccess();
        }
        return;
      }
    },
    [
      focusedPosition,
      selectedPositions,
      controller,
      gridConfig,
      ctx,
      onSelectionChange,
      setFocusedPosition,
      setClipboard,
    ]
  );

  return {
    handleGridKeyDown,
  };
}
