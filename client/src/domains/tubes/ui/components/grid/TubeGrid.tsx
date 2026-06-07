/**
 * Tube Storage Grid
 *
 * Configuration-driven grid supporting individual box customization and dynamic grid sizes.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';

import { useStorageData, getGridTotalPositions, DEFAULT_GRID_CONFIG } from '@domains/storage';
import { getAxisLabelsForBox } from '@domains/storage/utils/positionDisplayUtils';
import { useTubesByLocation } from '@domains/tubes/hooks';
import { useGridClipboardStore } from '@domains/tubes/stores/gridClipboardStore';
import { toPositionKey } from '@domains/tubes/types/gridSelectionTypes';
import { useUserSettings } from '@domains/users/hooks/useUserSettings';

import { TubeGridCell } from './TubeGridCell';
import { TubeGridContextMenu } from './TubeGridContextMenu';
import { TubeGridTooltip } from './TubeGridTooltip';
import { useGridDragSelection } from './useGridDragSelection';
import { useGridFontSizing } from './useGridFontSizing';
import { useGridKeyboardNavigation } from './useGridKeyboardNavigation';

import type {
  LockVariant,
  TubeData,
  PositionKey,
  GridControllerReturn,
  LockContext,
} from '@domains/tubes/types';

interface TubeGridProps {
  tankId: string;
  rackId: string;
  boxId: string;
  selectedPositions: Set<PositionKey>;
  onSelectionChange: (positions: Set<PositionKey>) => void;
  gridController: GridControllerReturn;
  lockContext?: LockContext;
}
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
  const { getBox, currentLab } = useStorageData();
  const { settings } = useUserSettings();
  const boxConfig = getBox(tankId, rackId, boxId);
  const gridConfig = boxConfig?.gridConfig ?? DEFAULT_GRID_CONFIG;

  const axisLabels = useMemo(
    () => getAxisLabelsForBox(tankId, rackId, boxId, gridConfig, currentLab, settings),
    [tankId, rackId, boxId, gridConfig, currentLab, settings]
  );

  // Clipboard access for Escape key clearing
  const setClipboard = useGridClipboardStore(state => state.setClipboard);

  const [focusedPosition, setFocusedPosition] = useState<number>(1);

  // Shared tooltip state - singleton pattern avoids Radix composeRefs bug
  const [hoveredTube, setHoveredTube] = useState<TubeData | null>(null);
  const [hoverAnchorRect, setHoverAnchorRect] = useState<DOMRect | null>(null);
  const [hoveredLockVariant, setHoveredLockVariant] = useState<LockVariant | undefined>();
  const [hoveredLockOwnerName, setHoveredLockOwnerName] = useState<string | undefined>();

  const ctx = useMemo(() => ({ tankId, rackId, boxId }), [tankId, rackId, boxId]);

  const dragSelection = useGridDragSelection({
    gridConfig,
    selectedPositions,
    onSelectionChange,
    ctx,
  });

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

  const handlePositionClick = useCallback(
    (position: number, event: React.MouseEvent | React.KeyboardEvent) => {
      setFocusedPosition(position);
      gridController.handlePositionClick(position, event);
    },
    [gridController]
  );

  const handlePositionRightClick = useCallback(
    (position: number, event: React.MouseEvent) => {
      event.preventDefault();

      // Right-click on unselected position selects only that position
      if (!gridController.isPositionSelected(position)) {
        gridController.actions.setSelection(position);
      }

      gridController.contextMenu.show(event.clientX, event.clientY);
    },
    [gridController]
  );

  const handleHoverStart = useCallback(
    (tube: TubeData, rect: DOMRect) => {
      setHoveredTube(tube);
      setHoverAnchorRect(rect);

      if (tube.isLocked && lockContext) {
        const ownerName = lockContext.getLockOwnerName(tube);
        const isMine = lockContext.isLockedByCurrentUser(tube);
        const isShared = lockContext.hasExplicitSharedAccess(tube);
        const isOut = lockContext.isLockedOutFrom(tube);

        if (isMine) {
          setHoveredLockVariant('own');
        } else if (isShared) {
          setHoveredLockVariant('shared');
        } else if (isOut) {
          setHoveredLockVariant('other');
        } else {
          setHoveredLockVariant('admin-override');
        }
        setHoveredLockOwnerName(ownerName);
      } else {
        setHoveredLockVariant(undefined);
        setHoveredLockOwnerName(undefined);
      }
    },
    [lockContext]
  );

  const handleHoverEnd = useCallback(() => {
    setHoveredTube(null);
    setHoverAnchorRect(null);
    setHoveredLockVariant(undefined);
    setHoveredLockOwnerName(undefined);
  }, []);

  useEffect(() => {
    if (gridNode) {
      gridNode.focus();
    }
  }, [gridNode]);

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

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`,
    gridAutoRows: '1fr',
    placeItems: 'center',
  };

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
      <div className="flex-1 flex items-start justify-center">
        <div className={`grid-with-rulers${axisLabels ? ' has-rulers' : ''}`}>
          {axisLabels && (
            <>
              <div className="grid-ruler-corner" />
              <div
                className="grid-ruler grid-ruler-cols font-mono"
                style={{
                  gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`,
                  fontSize: `${fontSize.positionFont}px`,
                }}
              >
                {axisLabels.colLabels.map((label, index) => (
                  <span key={index} className="grid-ruler-label">
                    {label}
                  </span>
                ))}
              </div>
              <div
                className="grid-ruler grid-ruler-rows font-mono"
                style={{
                  gridTemplateRows: `repeat(${gridConfig.rows}, minmax(0, 1fr))`,
                  fontSize: `${fontSize.positionFont}px`,
                }}
              >
                {axisLabels.rowLabels.map((label, index) => (
                  <span key={index} className="grid-ruler-label">
                    {label}
                  </span>
                ))}
              </div>
            </>
          )}
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
              const selected = gridController.isPositionSelected(position);
              const isCut = gridController.clipboard.cutPositions.has(positionKey);
              const isCopied = gridController.clipboard.copyPositions.has(positionKey);
              const inDragPreview = dragSelection.dragPreview.has(positionKey);
              const isKeyboardFocused = position === focusedPosition;

              const isLockedOut = tube && lockContext ? lockContext.isLockedOutFrom(tube) : false;
              const isLockedByCurrentUser =
                tube && lockContext ? lockContext.isLockedByCurrentUser(tube) : false;
              const hasSharedAccess =
                tube && lockContext ? lockContext.hasExplicitSharedAccess(tube) : false;
              const hasAdminOverride =
                tube?.isLocked && !isLockedByCurrentUser && !hasSharedAccess && !isLockedOut;
              const lockOwnerName =
                tube && lockContext ? lockContext.getLockOwnerName(tube) : undefined;

              return (
                <TubeGridCell
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
                  gridConfig={gridConfig}
                  fontSize={fontSize}
                  onPositionClick={handlePositionClick}
                  onPositionRightClick={handlePositionRightClick}
                  onPositionDoubleClick={gridController.handlePositionDoubleClick}
                  onMouseDown={dragSelection.handleMouseDown}
                  onMouseMove={dragSelection.handleMouseMove}
                  onHoverStart={handleHoverStart}
                  onHoverEnd={handleHoverEnd}
                  isLockedOut={isLockedOut}
                  isLockedByCurrentUser={isLockedByCurrentUser}
                  hasSharedAccess={hasSharedAccess}
                  hasAdminOverride={hasAdminOverride}
                  lockOwnerName={lockOwnerName}
                />
              );
            })}
          </div>
        </div>
      </div>

      <TubeGridContextMenu
        isVisible={gridController.contextMenu.isOpen}
        position={{ x: gridController.contextMenu.x, y: gridController.contextMenu.y }}
        selectedCount={selectedPositions.size}
        hasFilledSelection={gridController.selection.hasFilledSelection}
        isMixedSelection={gridController.selection.isMixed}
        onClose={gridController.contextMenu.hide}
        onOpen={gridController.openModal}
        onDelete={gridController.actions.delete}
        onCopy={gridController.actions.copy}
        onCut={gridController.actions.cut}
        onPaste={gridController.actions.paste}
        canPaste={gridController.clipboard.hasData}
        lockableCount={gridController.selection.lockableCount}
        unlockableCount={gridController.selection.unlockableCount}
        sharableCount={gridController.selection.sharableCount}
        onLock={gridController.actions.lock}
        onUnlock={gridController.actions.unlock}
        onShare={gridController.actions.shareAccess}
        isUnlocking={gridController.selection.isUnlocking}
      />

      <TubeGridTooltip
        tube={hoveredTube}
        anchorRect={hoverAnchorRect}
        lockVariant={hoveredLockVariant}
        lockOwnerName={hoveredLockOwnerName}
      />
    </div>
  );
}
