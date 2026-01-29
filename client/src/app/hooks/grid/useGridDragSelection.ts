/**
 * useGridDragSelection Hook
 *
 * Rectangular drag selection with RAF throttling for performance.
 * Extracted from TubeGrid for reusability and testability.
 */

import { useState, useRef, useEffect, useCallback } from 'react';

import { getGridTotalPositions } from '@domains/storage';
import { useTubeStore } from '@domains/tubes';
import { toPositionKey, type PositionContext, type PositionKey } from '@shared/types/GridSelection';
import { getPositionsInRectangle, positionToCoordinates } from '@shared/utils/coordinates';

import type { GridConfiguration } from '@odysseus/shared-schemas';

/**
 * Hook Props Interface
 */
export interface UseGridDragSelectionProps {
  gridConfig: GridConfiguration;
  selectedPositions: Set<PositionKey>;
  onSelectionChange: (positions: Set<PositionKey>) => void;
  ctx: PositionContext;
}

/**
 * Hook Return Interface
 */
export interface UseGridDragSelectionReturn {
  isDragging: boolean;
  dragPreview: Set<PositionKey>;
  handleMouseDown: (position: number, event: React.MouseEvent) => void;
  handleMouseMove: (position: number) => void;
}

/**
 * Custom hook for RAF-throttled rectangular drag selection
 *
 * @param props - Grid configuration and selection handlers
 * @returns Drag selection state and handlers
 */
export function useGridDragSelection(props: UseGridDragSelectionProps): UseGridDragSelectionReturn {
  const { gridConfig, selectedPositions, onSelectionChange, ctx } = props;

  // Performance optimization: RAF throttling for drag selection
  const rafIdRef = useRef<number | null>(null);
  const pendingPositionRef = useRef<number | null>(null);

  // Use refs for transient drag state to prevent stale closures in RAF callbacks
  const dragStartPositionRef = useRef<number | null>(null);
  const isDragWithCtrlRef = useRef<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);

  // UI-related state only
  const [isDragging, setIsDragging] = useState(false);
  const [dragPreview, setDragPreview] = useState<Set<PositionKey>>(new Set()); // CSS-only preview

  /**
   * Dynamic drag selection based on grid configuration
   */
  const handleMouseDown = useCallback((position: number, event: React.MouseEvent) => {
    if (event.button !== 0) return;
    dragStartPositionRef.current = position;
    isDragWithCtrlRef.current = event.ctrlKey;
  }, []);

  /**
   * Process selection preview (called by RAF throttle) - NO React state updates, just preview
   */
  const processSelectionUpdate = useCallback(
    (position: number) => {
      // Read from ref (always latest) instead of captured state (stale in closures)
      const dragStart = dragStartPositionRef.current;
      const withCtrl = isDragWithCtrlRef.current;

      if (dragStart !== null && dragStart !== position) {
        if (!isDraggingRef.current) {
          isDraggingRef.current = true;
          setIsDragging(true);
        }

        // Calculate rectangular selection using coordinate utilities
        const newSelection = new Set<PositionKey>();
        const startCoords = positionToCoordinates(dragStart, gridConfig.cols);
        const endCoords = positionToCoordinates(position, gridConfig.cols);
        const positionsInRectangle = getPositionsInRectangle(
          startCoords,
          endCoords,
          gridConfig.cols
        );

        positionsInRectangle.forEach((pos: number) => {
          if (pos >= 1 && pos <= getGridTotalPositions(gridConfig)) {
            newSelection.add(toPositionKey(ctx, pos));
          }
        });

        // Ctrl extends selection, otherwise replace
        if (withCtrl) {
          // Extend: Add drag selection to existing selection
          selectedPositions.forEach(key => newSelection.add(key));
        }
        // No Ctrl: newSelection already contains only drag rectangle (replaces existing)

        // PERFORMANCE: Only update preview state, NOT actual selection
        setDragPreview(newSelection);
        // Actual selection updated on mouseup
      }
      rafIdRef.current = null;
    },
    [gridConfig, selectedPositions, ctx]
  );

  /**
   * RAF-throttled mouse move handler
   */
  const handleMouseMove = useCallback(
    (position: number) => {
      pendingPositionRef.current = position;

      if (rafIdRef.current === null) {
        const rafId = requestAnimationFrame(() => {
          if (pendingPositionRef.current !== null) {
            processSelectionUpdate(pendingPositionRef.current);
          }
        });
        rafIdRef.current = rafId;
      }
    },
    [processSelectionUpdate]
  );

  /**
   * Cleanup RAF on unmount
   */
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  /**
   * Handle mouse up to end drag and commit selection
   */
  useEffect(() => {
    const handleMouseUp = () => {
      // Cancel any pending RAF to prevent stale callbacks from firing
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      pendingPositionRef.current = null;

      // Commit drag preview to actual selection
      if (isDragging && dragPreview.size > 0) {
        onSelectionChange(dragPreview);
        setDragPreview(new Set()); // Clear preview
      }

      // Update selection anchor and mark as drag selection for paste behavior
      if (isDragging && dragStartPositionRef.current !== null) {
        const { setSelectionAnchor, setLastSelectionMethod } = useTubeStore.getState();
        setSelectionAnchor(dragStartPositionRef.current);
        setLastSelectionMethod('drag');
      }

      isDraggingRef.current = false;
      setIsDragging(false);
      dragStartPositionRef.current = null;
      isDragWithCtrlRef.current = false;
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [isDragging, dragPreview, onSelectionChange]);

  return {
    isDragging,
    dragPreview,
    handleMouseDown,
    handleMouseMove,
  };
}
