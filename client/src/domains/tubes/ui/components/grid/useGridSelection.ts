/**
 * Grid Selection Hook
 *
 * Handles position selection with click, shift-click, ctrl-click, and range selection.
 */

import { useCallback, useRef, useEffect, useMemo } from 'react';

import { useTubeStore } from '@domains/tubes/stores/tubeStore';
import { toPositionKey, parsePositionKey } from '@domains/tubes/types/gridSelectionTypes';
import { getSelectionRange } from '@shared/utils/gridCoordinates';

import type {
  PositionKey,
  PositionContext,
  LockContext,
} from '@domains/tubes/types/gridSelectionTypes';
import type { TubeData } from '@odysseus/shared-schemas';

// Delay to distinguish single-click from double-click on multi-selection
const DOUBLE_CLICK_DELAY_MS = 300;

export interface UseGridSelectionProps {
  ctx: PositionContext;
  tubes: TubeData[];
  selectedPositions: Set<PositionKey>;
  onSelectionChange: (selection: Set<PositionKey>) => void;
  resolveTubeIdAtPosition: (position: number) => string | null;
  lockContext?: LockContext;
}

export interface SelectionCounts {
  hasFilledSelection: boolean;
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
  isPositionSelected: (position: number) => boolean;
  selectedPositionsInThisBox: () => number[];
  selectionAnalysis: SelectionCounts;
  clickTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  actions: {
    setSelection: (position: number) => void;
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
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  const handlePositionClick = useCallback(
    (position: number, event: React.MouseEvent | React.KeyboardEvent) => {
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

      const shouldDelay = isAlreadySelected && hasMultipleSelected && !hasModifierKey;

      const executeSelection = () => {
        const currentAnchor = useTubeStore.getState().selectionAnchor;
        const { setSelectionAnchor, setLastSelectionMethod } = useTubeStore.getState();
        setLastSelectionMethod('standard');

        const newSelection = new Set<PositionKey>();

        if (shiftKey && currentAnchor !== null) {
          const rangePositions = getSelectionRange(currentAnchor, position);
          rangePositions.forEach(pos => {
            newSelection.add(toPositionKey(ctx, pos));
          });
          if (ctrlKey || metaKey) {
            currentSelectedPositions.forEach(key => newSelection.add(key));
          }
        } else if (ctrlKey || metaKey) {
          currentSelectedPositions.forEach(key => newSelection.add(key));
          if (newSelection.has(positionKey)) {
            newSelection.delete(positionKey);
          } else {
            newSelection.add(positionKey);
          }
          // Update anchor for potential Shift+Ctrl combinations
          setSelectionAnchor(position);
        } else {
          newSelection.add(positionKey);
          setSelectionAnchor(position);
        }

        onSelectionChange(newSelection);
      };

      if (shouldDelay) {
        clickTimerRef.current = setTimeout(executeSelection, DOUBLE_CLICK_DELAY_MS);
      } else {
        executeSelection();
      }
    },
    [ctx, selectedPositions, onSelectionChange]
  );

  const isPositionSelected = useCallback(
    (position: number) => {
      const positionKey = toPositionKey(ctx, position);
      return selectedPositions.has(positionKey);
    },
    [ctx, selectedPositions]
  );

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
      hasFilledSelection: filledCount > 0,
      isMixed: filledCount > 0 && emptyCount > 0,
      allFilled: filledCount > 0 && emptyCount === 0,
      allEmpty: emptyCount > 0 && filledCount === 0,
      lockableCount,
      unlockableCount,
      sharableCount,
    };
  }, [selectedPositions, resolveTubeIdAtPosition, tubes, lockContext]);

  const actions = useMemo(
    () => ({
      setSelection: (position: number) => {
        const positionKey = toPositionKey(ctx, position);
        onSelectionChange(new Set([positionKey]));
      },
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
      clearSelection: () => {
        onSelectionChange(new Set());
      },
    }),
    [ctx, selectedPositions, onSelectionChange]
  );

  return {
    handlePositionClick,
    isPositionSelected,
    selectedPositionsInThisBox,
    selectionAnalysis,
    clickTimerRef,
    actions,
  };
};
