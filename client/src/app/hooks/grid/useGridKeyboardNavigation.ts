/**
 * useGridKeyboardNavigation Hook
 *
 * Keyboard navigation and shortcuts for grid components
 * Extracted from TubeGrid for reusability and testability
 */

import { useCallback } from 'react';

import { getGridTotalPositions } from '@domains/storage';
import { useTubeStore } from '@domains/tubes';
import { toPositionKey, type PositionKey          , GridControllerReturn, PositionContext } from '@shared/types/grid';
import { getSelectionRange } from '@shared/utils/coordinates';

import type { GridConfiguration } from '@odysseus/shared-schemas';
import type { ClipboardData } from '@shared/types/clipboard';



/**
 * Hook Props Interface
 */
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

/**
 * Hook Return Interface
 */
export interface UseGridKeyboardNavigationReturn {
  handleGridKeyDown: (event: React.KeyboardEvent) => void;
}

/**
 * Custom hook for grid keyboard navigation and shortcuts
 *
 * Implements industry-standard keyboard patterns:
 * - Arrow keys: Navigation (with wrapping)
 * - Shift+Arrow: Range selection
 * - Space: Toggle selection
 * - Enter: Open modal
 * - Delete: Delete selected
 * - Ctrl+A: Select all
 * - Escape: Clear selection and clipboard
 * - Ctrl+C/X/V: Copy/Cut/Paste
 *
 * @param props - Grid configuration, focus state, and action handlers
 * @returns Keyboard event handler
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
    setClipboard
  } = props;

  /**
   * Handle keyboard shortcuts for grid navigation
   */
  const handleGridKeyDown = useCallback((event: React.KeyboardEvent) => {
    const { key, shiftKey, ctrlKey, metaKey } = event;

    // Arrow key navigation with wrapping (1D index pattern)
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      event.preventDefault();

      // Convert current position to 0-based index
      const currentIndex = focusedPosition - 1;
      let newIndex = currentIndex;

      // Apply movement based on arrow key
      switch (key) {
        case 'ArrowUp':
          newIndex = currentIndex - gridConfig.cols;
          break;
        case 'ArrowDown':
          newIndex = currentIndex + gridConfig.cols;
          break;
        case 'ArrowLeft':
          newIndex = currentIndex - 1;
          break;
        case 'ArrowRight':
          newIndex = currentIndex + 1;
          break;
      }

      // Apply wrapping using modulo (handles negative indices correctly)
      const totalPositions = getGridTotalPositions(gridConfig);
      newIndex = ((newIndex % totalPositions) + totalPositions) % totalPositions;

      // Convert back to 1-based position
      const newPosition = newIndex + 1;

      if (newPosition >= 1 && newPosition <= totalPositions) {
        setFocusedPosition(newPosition);

        // Shift+Arrow: Extend selection
        if (shiftKey) {
          const currentAnchor = useTubeStore.getState().selectionAnchor || focusedPosition;
          const rangePositions = getSelectionRange(currentAnchor, newPosition, gridConfig.cols);
          const newSelection = new Set<PositionKey>();
          rangePositions.forEach(pos => {
            newSelection.add(toPositionKey(ctx, pos));
          });
          onSelectionChange(newSelection);
          // Don't update anchor during range selection - keeps extending from original position
        } else {
          // Arrow without Shift: Move selection to new position
          const positionKey = toPositionKey(ctx, newPosition);
          onSelectionChange(new Set([positionKey]));
          useTubeStore.getState().setSelectionAnchor(newPosition);
        }
      }
      return;
    }

    // Space bar - toggle selection on focused position
    if (key === ' ') {
      event.preventDefault();
      controller.actions.toggle(focusedPosition);
      return;
    }

    // Enter key - open appropriate modal
    if (key === 'Enter') {
      event.preventDefault();
      if (selectedPositions.size > 0) {
        controller.openModal();
      } else {
        // If nothing selected, select focused position and open modal
        const positionKey = toPositionKey(ctx, focusedPosition);
        onSelectionChange(new Set([positionKey]));
        setTimeout(() => controller.openModal(), 0);
      }
      return;
    }

    // Delete key - delete selected tubes with confirmation
    if (key === 'Delete') {
      event.preventDefault();
      if (selectedPositions.size > 0) {
        void controller.actions.delete();
      }
      return;
    }

    // Ctrl+A / Cmd+A - select all
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

    // Escape - clear selection and clipboard
    if (key === 'Escape') {
      event.preventDefault();
      controller.actions.clear();
      setClipboard(null);
      return;
    }

    // Ctrl+C - Copy
    if (key === 'c' && (ctrlKey || metaKey)) {
      event.preventDefault();
      void controller.actions.copy();
      return;
    }

    // Ctrl+X - Cut
    if (key === 'x' && (ctrlKey || metaKey)) {
      event.preventDefault();
      void controller.actions.cut();
      return;
    }

    // Ctrl+V - Paste
    if (key === 'v' && (ctrlKey || metaKey)) {
      event.preventDefault();
      void (async () => {
        try {
          await controller.actions.paste();
        } catch (error) {
          console.error('Paste operation failed:', error);
          // Error notification already shown by paste handler
        }
      })();
      return;
    }
  }, [
    focusedPosition,
    selectedPositions,
    controller,
    gridConfig,
    ctx,
    onSelectionChange,
    setFocusedPosition,
    setClipboard
  ]);

  return {
    handleGridKeyDown
  };
}
