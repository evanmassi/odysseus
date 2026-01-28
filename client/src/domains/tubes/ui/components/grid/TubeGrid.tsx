import { useState, useEffect, useMemo, useCallback } from 'react';

import { EQUIPMENT_DEFAULTS } from '@odysseus/shared-schemas';

import {
  useGridDragSelection,
  useGridKeyboardNavigation,
  useGridFontSizing,
} from '@app/hooks/grid';
import { useStorageData, getGridTotalPositions } from '@domains/storage';
import { useTubesByLocation } from '@domains/tubes/hooks';
import { useGridUiStore } from '@shared/stores/gridUiStore';
import { toPositionKey } from '@shared/types/GridSelection';

import { ContextMenu } from '../../../../../shared/ui/primitives/ContextMenu';

import { GridPosition } from './GridPosition';

import type { TubeData } from '@domains/tubes/types';
import type { PositionKey, GridControllerReturn, LockContext } from '@shared/types/GridSelection';

/**
 * TubeGrid Props Interface
 */
interface TubeGridProps {
  tankId: string;
  rackId: string;
  boxId: string;
  selectedPositions: Set<PositionKey>;
  onSelectionChange: (positions: Set<PositionKey>) => void;
  gridController: GridControllerReturn;
  // Lock context (optional - for lock-enabled grids)
  lockContext?: LockContext;
}

/**
 * TubeGrid - Configuration-driven grid component
 *
 * Supports individual box customization and dynamic grid sizes.
 */
export function TubeGrid({
  tankId,
  rackId,
  boxId,
  selectedPositions,
  onSelectionChange,
  gridController,
  lockContext,
}: TubeGridProps) {
  const {
    data: tubes = [],
    isLoading,
    error,
  } = useTubesByLocation(tankId, rackId, boxId, {
    staleTime: 2 * 60 * 1000,
  });
  const { getBox } = useStorageData();
  const boxConfig = getBox(tankId, rackId, boxId);
  const gridConfig = boxConfig?.gridConfig ?? {
    rows: EQUIPMENT_DEFAULTS.GRID_ROWS,
    cols: EQUIPMENT_DEFAULTS.GRID_COLS,
    template: 'standard',
  };

  // Use grid controller passed from parent (single controller instance)
  const controller = gridController;

  // Clipboard access for Escape key clearing
  const setClipboard = useGridUiStore(state => state.setClipboard);

  // UI-related state only
  const [quickEditMode, setQuickEditMode] = useState<{ position: number; field: string } | null>(
    null
  );
  const [focusedPosition, setFocusedPosition] = useState<number>(1);

  // Custom hooks for separation of concerns
  const ctx = useMemo(() => ({ tankId, rackId, boxId }), [tankId, rackId, boxId]);

  // Drag selection hook (RAF-throttled rectangular selection)
  const dragSelection = useGridDragSelection({
    gridConfig,
    selectedPositions,
    onSelectionChange,
    ctx,
  });

  // Keyboard navigation hook (arrow keys, shortcuts)
  const keyboardNav = useGridKeyboardNavigation({
    gridConfig,
    focusedPosition,
    setFocusedPosition,
    selectedPositions,
    onSelectionChange,
    controller: gridController,
    ctx,
    setClipboard,
  });

  // Callback ref from this hook guarantees font recalculation on grid mount
  const { fontSize, gridRef, gridNode } = useGridFontSizing({
    gridConfig,
  });

  // Create dynamic grid based on configuration
  const positions = Array.from({ length: getGridTotalPositions(gridConfig) }, (_, i) => i + 1);

  const tubesByPosition = useMemo(
    () =>
      tubes.reduce(
        (acc, tube) => {
          acc[tube.location.position] = tube;
          return acc;
        },
        {} as Record<number, TubeData>
      ),
    [tubes]
  );

  // Position click handler (delegates to grid controller)
  const handlePositionClick = useCallback(
    (position: number, event: React.MouseEvent | React.KeyboardEvent) => {
      setFocusedPosition(position); // Update keyboard focus on click
      controller.handlePositionClick(position, event);
    },
    [controller]
  );

  const handlePositionRightClick = useCallback(
    (position: number, event: React.MouseEvent) => {
      event.preventDefault();

      // Replace selection with clicked position if not already selected
      // (right-click on unselected item selects only that item)
      if (!controller.isPositionSelected(position)) {
        controller.actions.setSelection(position);
      }

      // Position menu at actual mouse cursor position
      controller.contextMenu.show(event.clientX, event.clientY);
    },
    [controller]
  );

  // Focus grid once it mounts after data loads
  useEffect(() => {
    if (gridNode) {
      gridNode.focus();
    }
  }, [gridNode]);

  // Sync animations on selection change (force reflow to restart animation)
  useEffect(() => {
    if (!gridNode) return;

    const selectedElements = gridNode.querySelectorAll('.selected');
    selectedElements.forEach(el => {
      const element = el as HTMLElement;
      element.style.animation = 'none';
      element.offsetHeight; // Force reflow to restart animation
      element.style.animation = '';
    });
  }, [selectedPositions, gridNode]);

  // Dynamic CSS grid based on configuration - CSS handles sizing via container queries
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`,
    gridAutoRows: '1fr',
    placeItems: 'center',
  };

  // Loading state indicator
  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <div className="flex items-center space-x-3 mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-lg font-medium text-secondary-foreground">Loading tubes...</span>
        </div>
        <div className="text-sm text-muted-foreground">
          {boxId ? `${tankId} › Rack ${rackId} › Box ${boxId}` : `${tankId} › Rack ${rackId}`}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <div className="text-danger-text mb-4">Failed to load tubes</div>
        <div className="text-sm text-muted-foreground">
          {boxId ? `${tankId} › Rack ${rackId} › Box ${boxId}` : `${tankId} › Rack ${rackId}`}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Main Grid Container */}
      <div className="flex-1 flex items-start justify-center">
        <div
          ref={gridRef}
          className="tube-grid select-none focus:outline-none"
          style={{
            ...gridStyle,
            outline: 'none !important',
            outlineOffset: '0 !important',
            WebkitTapHighlightColor: 'transparent',
          }}
          role="grid"
          aria-label={`Tube storage grid for ${boxId ? `Box ${boxId}` : `Rack ${rackId}`}, ${positions.length} positions`}
          aria-multiselectable="true"
          tabIndex={0}
          data-focus="custom"
          onKeyDown={keyboardNav.handleGridKeyDown}
        >
          {positions.map(position => {
            const positionKey = toPositionKey(ctx, position);
            const tube = tubesByPosition[position];
            const selected = controller.isPositionSelected(position);
            const isCut = controller.clipboard.cutPositions.has(positionKey);
            const isCopied = controller.clipboard.copyPositions.has(positionKey);
            const inDragPreview = dragSelection.dragPreview.has(positionKey);
            const isKeyboardFocused = position === focusedPosition;

            // Lock state for this tube
            const isLockedOut = tube && lockContext ? lockContext.isLockedOutFrom(tube) : false;
            const isLockedByCurrentUser =
              tube && lockContext ? lockContext.isLockedByCurrentUser(tube) : false;
            // Shared access: tube is locked, not by current user, but user has access (not locked out)
            const hasSharedAccess = tube?.isLocked && !isLockedByCurrentUser && !isLockedOut;
            const lockOwnerName =
              tube && lockContext ? lockContext.getLockOwnerName(tube) : undefined;

            return (
              <GridPosition
                key={position}
                position={position}
                tankId={tankId}
                rackId={rackId}
                boxId={boxId}
                tube={tube}
                selected={selected}
                isDragPreview={inDragPreview && !selected}
                isCut={isCut}
                isCopied={isCopied}
                _isKeyboardFocused={isKeyboardFocused}
                quickEditMode={quickEditMode}
                gridConfig={gridConfig}
                fontSize={fontSize}
                onPositionClick={handlePositionClick}
                onPositionRightClick={handlePositionRightClick}
                onPositionDoubleClick={controller.handlePositionDoubleClick}
                onMouseDown={dragSelection.handleMouseDown}
                onMouseMove={dragSelection.handleMouseMove}
                onQuickEditSave={() => {}}
                onQuickEditCancel={() => setQuickEditMode(null)}
                isLockedOut={isLockedOut}
                isLockedByCurrentUser={isLockedByCurrentUser}
                hasSharedAccess={hasSharedAccess}
                lockOwnerName={lockOwnerName}
                lockNote={tube?.lockNote}
              />
            );
          })}
        </div>
      </div>

      <ContextMenu
        isVisible={controller.contextMenu.isOpen}
        position={{ x: controller.contextMenu.x, y: controller.contextMenu.y }}
        selectedCount={selectedPositions.size}
        hasFilledSelection={controller.selection.hasFilledSelection}
        isMixedSelection={controller.selection.isMixed}
        onClose={controller.contextMenu.hide}
        onOpen={controller.openModal}
        onDelete={controller.actions.delete}
        onCopy={controller.actions.copy}
        onCut={controller.actions.cut}
        onPaste={controller.actions.paste}
        canPaste={controller.clipboard.hasData}
        lockableCount={controller.selection.lockableCount}
        unlockableCount={controller.selection.unlockableCount}
        sharableCount={controller.selection.sharableCount}
        onLock={controller.actions.lock}
        onUnlock={controller.actions.unlock}
        onShare={controller.actions.shareAccess}
        isUnlocking={controller.selection.isUnlocking}
      />
    </div>
  );
}
