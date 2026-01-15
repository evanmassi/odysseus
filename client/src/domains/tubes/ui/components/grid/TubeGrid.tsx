import { useState, useRef, useEffect, useMemo } from 'react';

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

import { ContextMenu } from '../../../../../shared/ui/primitives/shared/ContextMenu';

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
  _onEditTube?: (tubeId: string) => void;
  _onBatchEditTubes?: (tubeIds: string[]) => void;
  _onAddTubes?: (positions: PositionKey[]) => void;
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
  _onEditTube,
  _onBatchEditTubes,
  _onAddTubes,
  gridController,
  lockContext,
}: TubeGridProps) {
  // Component manages its own selection via props, no need for store selection

  // Server state from React Query
  const {
    data: tubes = [],
    isLoading,
    error,
  } = useTubesByLocation(tankId, rackId, boxId, {
    staleTime: 2 * 60 * 1000,
  });
  const { getBox } = useStorageData();
  // Auth store subscribed for reactive updates

  // Data loading is now handled by GridNavigationService
  // This component just displays the current data from the store

  // Use the specific tankId passed from parent
  const boxConfig = getBox(tankId, rackId, boxId);
  const gridConfig = boxConfig?.gridConfig ?? {
    rows: EQUIPMENT_DEFAULTS.GRID_ROWS,
    cols: EQUIPMENT_DEFAULTS.GRID_COLS,
    template: 'standard',
  };

  // Grid reference
  const gridRef = useRef<HTMLDivElement>(null);

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

  // Font sizing hook (responsive font calculation)
  const fontSizing = useGridFontSizing({
    gridRef,
    gridConfig,
  });

  // Create dynamic grid based on configuration
  const positions = Array.from({ length: getGridTotalPositions(gridConfig) }, (_, i) => i + 1);

  // Tubes are already filtered by location from React Query hook
  const currentTubes = tubes;

  // Create lookup for quick access (memoized for performance)
  const tubesByPosition = useMemo(
    () =>
      currentTubes.reduce(
        (acc, tube) => {
          acc[tube.location.position] = tube;
          return acc;
        },
        {} as Record<number, TubeData>
      ),
    [currentTubes]
  );

  // Position click handler (delegates to grid controller)
  const handlePositionClick = (position: number, event: React.MouseEvent | React.KeyboardEvent) => {
    setFocusedPosition(position); // Update keyboard focus on click
    controller.handlePositionClick(position, event, gridConfig.cols);
  };

  const handlePositionRightClick = (position: number, event: React.MouseEvent) => {
    event.preventDefault();

    // Replace selection with clicked position if not already selected
    // (right-click on unselected item selects only that item)
    if (!controller.isPositionSelected(position)) {
      controller.actions.setSelection(position);
    }

    // Position menu relative to clicked tube
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    controller.contextMenu.show(rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  // Focus grid on mount
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.focus();
    }
  }, []);

  // Sync animations on selection change (force reflow to restart animation)
  useEffect(() => {
    if (!gridRef.current) return;

    const selectedElements = gridRef.current.querySelectorAll('.selected');
    selectedElements.forEach(el => {
      const element = el as HTMLElement;
      element.style.animation = 'none';
      element.offsetHeight; // Force reflow to restart animation
      element.style.animation = '';
    });
  }, [selectedPositions]);

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
        <div className="text-red-600 mb-4">Failed to load tubes</div>
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
                fontSize={fontSizing.fontSize}
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
