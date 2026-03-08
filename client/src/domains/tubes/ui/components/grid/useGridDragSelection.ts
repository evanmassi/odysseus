/**
 * Grid Drag Selection
 *
 * Rectangular drag selection with RAF throttling for performance.
 */

import { useState, useRef, useEffect, useCallback } from 'react';

import { getGridTotalPositions } from '@domains/storage';
import { useTubeStore } from '@domains/tubes';
import {
  toPositionKey,
  type PositionContext,
  type PositionKey,
} from '@domains/tubes/types/gridSelectionTypes';
import { getPositionsInRectangle, positionToCoordinates } from '@shared/utils/coordinates';

import type { GridConfiguration } from '@odysseus/shared-schemas';

export interface UseGridDragSelectionProps {
  gridConfig: GridConfiguration;
  selectedPositions: Set<PositionKey>;
  onSelectionChange: (positions: Set<PositionKey>) => void;
  ctx: PositionContext;
}

export interface UseGridDragSelectionReturn {
  isDragging: boolean;
  dragPreview: Set<PositionKey>;
  handleMouseDown: (position: number, event: React.MouseEvent) => void;
  handleMouseMove: (position: number) => void;
}

export function useGridDragSelection(props: UseGridDragSelectionProps): UseGridDragSelectionReturn {
  const { gridConfig, selectedPositions, onSelectionChange, ctx } = props;

  // Performance optimization: RAF throttling for drag selection
  const rafIdRef = useRef<number | null>(null);
  const pendingPositionRef = useRef<number | null>(null);

  // Use refs for transient drag state to prevent stale closures in RAF callbacks
  const dragStartPositionRef = useRef<number | null>(null);
  const isDragWithCtrlRef = useRef<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);

  const [isDragging, setIsDragging] = useState(false);
  const [dragPreview, setDragPreview] = useState<Set<PositionKey>>(new Set());

  const handleMouseDown = useCallback((position: number, event: React.MouseEvent) => {
    if (event.button !== 0) return;
    dragStartPositionRef.current = position;
    isDragWithCtrlRef.current = event.ctrlKey;
  }, []);

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

        if (withCtrl) {
          selectedPositions.forEach(key => newSelection.add(key));
        }

        // Preview only — actual selection committed on mouseup
        setDragPreview(newSelection);
      }
      rafIdRef.current = null;
    },
    [gridConfig, selectedPositions, ctx]
  );

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

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleMouseUp = () => {
      // Cancel any pending RAF to prevent stale callbacks from firing
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      pendingPositionRef.current = null;

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
