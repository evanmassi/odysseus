/**
 * Grid Selection Hook
 * Handles position selection with click, shift-click, ctrl-click, and range selection
 */

import { useCallback, useRef, useEffect, useMemo } from 'react';

import { useTubeStore } from '@domains/tubes/stores/tubeStore';
import { toPositionKey, parsePositionKey } from '@shared/types/GridSelection';
import { getSelectionRange } from '@shared/utils/coordinates';

import type { TubeData } from '@odysseus/shared-schemas';
import type { PositionKey, PositionContext, LockContext } from '@shared/types/GridSelection';

export interface UseGridSelectionProps {
  ctx: PositionContext;
  tubes: TubeData[];
  selectedPositions: Set<PositionKey>;
  onSelectionChange: (selection: Set<PositionKey>) => void;
  resolveTubeIdAtPosition: (position: number) => string | null;
  lockContext?: LockContext;
}

export interface SelectionAnalysis {
  filledCount: number;
  emptyCount: number;
  hasFilledSelection: boolean;
  hasEmptySelection: boolean;
  isMixed: boolean;
  allFilled: boolean;
  allEmpty: boolean;
  lockableCount: number;
  unlockableCount: number;
  sharableCount: number;
}

export interface UseGridSelectionReturn {
  handlePositionClick: (
    position: number,
    event: React.MouseEvent | React.KeyboardEvent,
    gridSize?: number
  ) => void;
  handleBulkSelection: (positions: number[]) => void;
  isPositionSelected: (position: number) => boolean;
  selectedPositionsInThisBox: () => number[];
  selectionAnalysis: SelectionAnalysis;
  clickTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  actions: {
    setSelection: (position: number) => void;
    addToSelection: (position: number) => void;
    removeFromSelection: (position: number) => void;
    toggleInSelection: (position: number) => void;
    clearSelection: () => void;
  };
}

export const useGridSelection = ({
  ctx,
  tubes,
  selectedPositions,
  onSelectionChange,
  resolveTubeIdAtPosition,
  lockContext,
}: UseGridSelectionProps): UseGridSelectionReturn => {
  // Click timer for double-click detection
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  const handlePositionClick = useCallback(
    (position: number, event: React.MouseEvent | React.KeyboardEvent, gridSize: number = 9) => {
      // Clear any pending click timer
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }

      const positionKey = toPositionKey(ctx, position);
      const isAlreadySelected = selectedPositions.has(positionKey);
      const hasMultipleSelected = selectedPositions.size > 1;

      // Capture event properties immediately (React synthetic event pooling fix)
      const shiftKey = event.shiftKey;
      const ctrlKey = event.ctrlKey;
      const metaKey = event.metaKey;
      const hasModifierKey = shiftKey || ctrlKey || metaKey;

      // Clone selectedPositions to avoid stale closure
      const currentSelectedPositions = new Set(selectedPositions);

      // Only delay when clicking already-selected position in multi-selection
      const shouldDelay = isAlreadySelected && hasMultipleSelected && !hasModifierKey;

      const executeSelection = () => {
        // Read anchor fresh from store
        const currentAnchor = useTubeStore.getState().selectionAnchor;
        const { setSelectionAnchor } = useTubeStore.getState();

        const newSelection = new Set<PositionKey>();

        if (shiftKey && currentAnchor !== null) {
          // Shift+Click: Range selection from anchor to current position
          const rangePositions = getSelectionRange(currentAnchor, position, gridSize);
          rangePositions.forEach(pos => {
            newSelection.add(toPositionKey(ctx, pos));
          });
          // Keep existing selection if Ctrl is also held
          if (ctrlKey || metaKey) {
            currentSelectedPositions.forEach(key => newSelection.add(key));
          }
        } else if (ctrlKey || metaKey) {
          // Ctrl+Click: Toggle individual position
          currentSelectedPositions.forEach(key => newSelection.add(key));
          if (newSelection.has(positionKey)) {
            newSelection.delete(positionKey);
          } else {
            newSelection.add(positionKey);
          }
          // Update anchor for potential Shift+Ctrl combinations
          setSelectionAnchor(position);
        } else {
          // Single click: Replace selection with just this position
          newSelection.add(positionKey);
          setSelectionAnchor(position);
        }

        onSelectionChange(newSelection);
      };

      if (shouldDelay) {
        // Delay to distinguish single-click from double-click on multi-selection
        clickTimerRef.current = setTimeout(executeSelection, 200);
      } else {
        // Execute immediately for instant feedback
        executeSelection();
      }
    },
    [ctx, selectedPositions, onSelectionChange]
  );

  const handleBulkSelection = useCallback(
    (positions: number[]) => {
      const positionKeys = positions.map(pos => toPositionKey(ctx, pos));
      const newSelection = new Set(positionKeys);
      onSelectionChange(newSelection);
    },
    [ctx, onSelectionChange]
  );

  const isPositionSelected = useCallback(
    (position: number) => {
      const positionKey = toPositionKey(ctx, position);
      return selectedPositions.has(positionKey);
    },
    [ctx, selectedPositions]
  );

  // Helper: Get selected positions in current box
  const selectedPositionsInThisBox = useCallback((): number[] => {
    const positions: number[] = [];
    selectedPositions.forEach(key => {
      const { tankId: t, rackId: r, boxId: b, position } = parsePositionKey(key);
      if (t === ctx.tankId && r === ctx.rackId && b === ctx.boxId) {
        positions.push(position);
      }
    });
    return positions.sort((a, b) => a - b);
  }, [selectedPositions, ctx.tankId, ctx.rackId, ctx.boxId]);

  // Analyze selected positions (empty vs filled, lock state)
  const selectionAnalysis = useMemo(() => {
    let filledCount = 0;
    let emptyCount = 0;
    let lockableCount = 0;
    let unlockableCount = 0;
    let sharableCount = 0;

    Array.from(selectedPositions).forEach(positionKey => {
      const { position } = parsePositionKey(positionKey);
      const tubeId = resolveTubeIdAtPosition(position);

      if (tubeId !== null) {
        filledCount++;

        // Lock analysis (only if lockContext provided)
        if (lockContext) {
          const tube = tubes.find(t => t.id === tubeId);
          if (tube) {
            if (lockContext.canLockTube(tube)) {
              lockableCount++;
            }
            if (lockContext.canUnlockTube(tube)) {
              unlockableCount++;
            }
            if (lockContext.canShareTubeAccess(tube)) {
              sharableCount++;
            }
          }
        }
      } else {
        emptyCount++;
      }
    });

    return {
      filledCount,
      emptyCount,
      hasFilledSelection: filledCount > 0,
      hasEmptySelection: emptyCount > 0,
      isMixed: filledCount > 0 && emptyCount > 0,
      allFilled: filledCount > 0 && emptyCount === 0,
      allEmpty: emptyCount > 0 && filledCount === 0,
      lockableCount,
      unlockableCount,
      sharableCount,
    };
  }, [selectedPositions, resolveTubeIdAtPosition, tubes, lockContext]);

  // Selection action methods - Clear, self-documenting names
  const actions = useMemo(
    () => ({
      /** Replace entire selection with single position */
      setSelection: (position: number) => {
        const positionKey = toPositionKey(ctx, position);
        onSelectionChange(new Set([positionKey]));
      },
      /** Add position to existing selection */
      addToSelection: (position: number) => {
        const positionKey = toPositionKey(ctx, position);
        const newSelection = new Set(selectedPositions);
        newSelection.add(positionKey);
        onSelectionChange(newSelection);
      },
      /** Remove position from existing selection */
      removeFromSelection: (position: number) => {
        const positionKey = toPositionKey(ctx, position);
        const newSelection = new Set(selectedPositions);
        newSelection.delete(positionKey);
        onSelectionChange(newSelection);
      },
      /** Toggle position in/out of selection */
      toggleInSelection: (position: number) => {
        const positionKey = toPositionKey(ctx, position);
        const newSelection = new Set(selectedPositions);
        if (newSelection.has(positionKey)) {
          newSelection.delete(positionKey);
        } else {
          newSelection.add(positionKey);
        }
        onSelectionChange(newSelection);
      },
      /** Clear all selection */
      clearSelection: () => {
        onSelectionChange(new Set());
      },
    }),
    [ctx, selectedPositions, onSelectionChange]
  );

  return {
    handlePositionClick,
    handleBulkSelection,
    isPositionSelected,
    selectedPositionsInThisBox,
    selectionAnalysis,
    clickTimerRef,
    actions,
  };
};
