/**
 * Grid Controller Hook
 * Grid actions with clipboard integration
 *
 * Uses modalStore for all modal operations
 */

import { useMemo, useRef, useEffect, useState, useCallback } from 'react';

import { tubeDataToCreateRequest } from '@odysseus/shared-schemas';

import { useModalStore } from '@app/stores/modalStore';
import { useStorageStore } from '@domains/storage';
import { useTubesByLocation } from '@domains/tubes/hooks';
import { useTubeStore } from '@domains/tubes/stores/tubeStore';
import { useGridUiStore } from '@shared/stores/gridUiStore';
import { toPositionKey, parsePositionKey } from '@shared/types/grid';
import { getSelectionRange } from '@shared/utils/coordinates';
import { writeClipboardOS, readClipboardOS } from '@shared/utils/gridClipboard';
import { notifications } from '@shared/utils/notifications';
import { validatePasteOperation } from '@shared/utils/pasteValidation';

import type { ClipboardData } from '@shared/types/clipboard';
import type { PositionKey, GridControllerProps, GridControllerReturn, TubeClipboardItem } from '@shared/types/grid';




export const useGridController = ({
  tankId,
  rackId,
  boxId,
  selectedPositions,
  onSelectionChange,
  resolveTubeIdAtPosition,
  onDeleteTubes,
  onPasteTubes
}: GridControllerProps): GridControllerReturn => {
  const ctx = useMemo(() => ({ tankId, rackId, boxId }), [tankId, rackId, boxId]);

  // ✅ FIXED: Individual Zustand selectors for reactivity
  // When clipboard changes, this hook MUST re-render so copyPositions/cutPositions memos recalculate
  const clipboard = useGridUiStore(state => state.clipboard);
  const setClipboard = useGridUiStore(state => state.setClipboard);
  const setMousePositionStore = useGridUiStore(state => state.setMousePosition);

  const modalService = useModalStore();
  const { getBox } = useStorageStore();

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

  // Grid context menu state
  const [contextMenu, setContextMenu] = useState({
    isOpen: false,
    x: 0,
    y: 0
  });
  
  // Get tube data for the current location
  const { data: tubes = [] } = useTubesByLocation(tankId, rackId, boxId);
  
  // Create a lookup map for position -> tubeId resolution
  const positionToTubeMap = useMemo(() => {
    const map = new Map<number, string>();
    tubes.forEach(tube => {
      if (tube.location.position) {
        map.set(tube.location.position, tube.id);
      }
    });
    return map;
  }, [tubes]);

  // Default tube resolution if not provided
  const resolveTube = useMemo(
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Function fallback: use provided resolver or default implementation
    () => resolveTubeIdAtPosition || ((position: number) => positionToTubeMap.get(position) ?? null),
    [resolveTubeIdAtPosition, positionToTubeMap]
  );

  const handlePositionClick = (position: number, event: React.MouseEvent, gridSize: number = 9) => {
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
    // This prevents double-click from deselecting the group (Windows Explorer pattern)
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
      // Delay to distinguish from double-click (Windows Explorer, macOS Finder pattern)
      clickTimerRef.current = setTimeout(executeSelection, 200);
    } else {
      // Execute immediately for instant feedback
      executeSelection();
    }
  };

  // Helper: Analyze selected positions (empty vs filled)
  const selectionAnalysis = useMemo(() => {
    let filledCount = 0;
    let emptyCount = 0;

    Array.from(selectedPositions).forEach(positionKey => {
      const { position } = parsePositionKey(positionKey);
      if (resolveTube(position) !== null) {
        filledCount++;
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
      allEmpty: emptyCount > 0 && filledCount === 0
    };
  }, [selectedPositions, resolveTube]);

  // Unified modal opener - single source of truth for selection-based modal logic
  const openModal = useCallback(() => {
    const positions = Array.from(selectedPositions);

    if (selectionAnalysis.isMixed || selectionAnalysis.allEmpty) {
      // Mixed or all empty - open create modal
      modalService.showTubeEditorModal({
        mode: 'add',
        positions,
        rackId,
        boxId
      });
    } else if (selectionAnalysis.allFilled) {
      // All filled - open edit modal
      const selectedTubeIds = Array.from(selectedPositions)
        .map(positionKey => {
          const { position } = parsePositionKey(positionKey);
          return resolveTube(position);
        })
        .filter((tubeId): tubeId is string => tubeId !== null);

      if (selectedTubeIds.length === 0) return;

      if (selectedTubeIds.length === 1) {
        modalService.showTubeEditorModal({
          mode: 'edit',
          tubeId: selectedTubeIds[0]
        });
      } else {
        modalService.showTubeEditorModal({
          mode: 'batch',
          tubeIds: selectedTubeIds,
          preserveSelection: true  // Maintain multi-selection after batch operation
        });
      }
    }
  }, [selectionAnalysis, selectedPositions, modalService, rackId, boxId, resolveTube]);

  const handlePositionDoubleClick = (position: number) => {
    // CRITICAL: Clear pending click timer to prevent selection change during modal
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }

    const positionKey = toPositionKey(ctx, position);

    // Double-click on multi-selection opens batch mode
    if (selectedPositions.has(positionKey) && selectedPositions.size > 1) {
      openModal();
      return;
    }

    // Single position double-click - existing logic
    const tubeId = resolveTube(position);
    if (tubeId) {
      // Filled position - open edit modal
      modalService.showTubeEditorModal({
        mode: 'edit',
        tubeId
      });
    } else {
      // Empty position - open add modal
      modalService.showTubeEditorModal({
        mode: 'add',
        positions: [positionKey],
        rackId,
        boxId
      });
    }
  };

  const handleBulkSelection = (positions: number[]) => {
    const positionKeys = positions.map(pos => toPositionKey(ctx, pos));
    const newSelection = new Set(positionKeys);
    onSelectionChange(newSelection);
  };

  const isPositionSelected = useCallback((position: number) => {
    const positionKey = toPositionKey(ctx, position);
    return selectedPositions.has(positionKey);
  }, [ctx, selectedPositions]);

  // Helper: Get selected positions in current box
  const selectedPositionsInThisBox = useCallback((): number[] => {
    const positions: number[] = [];
    selectedPositions.forEach((key) => {
      const { tankId: t, rackId: r, boxId: b, position } = parsePositionKey(key);
      if (t === tankId && r === rackId && b === boxId) {
        positions.push(position);
      }
    });
    return positions.sort((a, b) => a - b);
  }, [selectedPositions, tankId, rackId, boxId]);

  // Copy operation
  const copy = useCallback(async () => {
    const positions = selectedPositionsInThisBox();
    if (positions.length === 0) return;

    const items: TubeClipboardItem[] = positions
      .map((position) => {
        const tubeId = resolveTube(position);
        return tubeId ? { tubeId, fromPosition: position } : null;
      })
      .filter((item): item is TubeClipboardItem => item !== null);

    if (items.length === 0) return;

    const clipboardData: ClipboardData = {
      tubes: items.map(item => tubes.find(t => t.id === item.tubeId)!).filter(Boolean),
      operation: 'copy',
      timestamp: new Date(),
      sourceLocation: ctx,
    };

    setClipboard(clipboardData);
    await writeClipboardOS(clipboardData);

    // Show copy notification
    notifications.copy(`Copied ${items.length} tube${items.length > 1 ? 's' : ''}`);
  }, [selectedPositionsInThisBox, resolveTube, tubes, ctx, setClipboard]);

  // Cut operation (copy + delete)
  const cut = useCallback(async () => {
    const positions = selectedPositionsInThisBox();
    if (positions.length === 0) return;

    const items: TubeClipboardItem[] = positions
      .map((position) => {
        const tubeId = resolveTube(position);
        return tubeId ? { tubeId, fromPosition: position } : null;
      })
      .filter((item): item is TubeClipboardItem => item !== null);

    if (items.length === 0) return;

    const clipboardData: ClipboardData = {
      tubes: items.map(item => tubes.find(t => t.id === item.tubeId)!).filter(Boolean),
      operation: 'cut',
      timestamp: new Date(),
      sourceLocation: ctx,
    };

    setClipboard(clipboardData);
    await writeClipboardOS(clipboardData);

    // Show cut notification - Light Amber
    notifications.cut(`Cut ${items.length} tube${items.length > 1 ? 's' : ''}`);

    // Note: Tubes are NOT deleted here - they'll be deleted after successful paste
    // Clear selection after cut
    onSelectionChange(new Set());
  }, [selectedPositionsInThisBox, resolveTube, tubes, ctx, setClipboard, onSelectionChange]);

  // Paste operation - dual-mode behavior
  // 1. Fill Mode: More targets than clipboard → Repeat pattern (Excel fill handle)
  // 2. Spatial Pattern Mode: Equal/fewer targets → Preserve 2D layout
  const paste = useCallback(async (options?: { targetStart?: number }) => {
    let clipData = clipboard;

    // Try OS clipboard if no in-app clipboard
    if (!clipData) {
      clipData = await readClipboardOS();
      if (clipData) setClipboard(clipData);
    }

    if (!clipData || clipData.tubes.length === 0) return;

    // Determine target positions
    const selectedPositions = selectedPositionsInThisBox();

    // Two paste modes based on selection size
    const shouldFillTargets = selectedPositions.length > clipData.tubes.length;

    let tubesToPaste: ReturnType<typeof tubeDataToCreateRequest>[];

    if (shouldFillTargets) {
      // Fill Mode: Repeat clipboard pattern across all selected positions
      // Matches Excel's fill handle behavior
      tubesToPaste = selectedPositions.map((targetPos, i) => {
        const sourceTube = clipData.tubes[i % clipData.tubes.length];
        return tubeDataToCreateRequest(sourceTube, {
          tankId: ctx.tankId,
          rackId: ctx.rackId,
          boxId: ctx.boxId,
          position: targetPos
        });
      });
    } else {
      // Spatial Pattern Mode: Preserve relative positioning of clipboard items
      // Matches Excel's copy/paste of multi-cell ranges
      const anchorPosition = selectedPositions.length > 0
        ? Math.min(...selectedPositions)
        : options?.targetStart;

      if (anchorPosition === undefined) return;

      // Validate paste operation across different grid configurations
      const sourceGridConfig = getBox(
        (clipData.sourceLocation ?? ctx).tankId,
        (clipData.sourceLocation ?? ctx).rackId,
        (clipData.sourceLocation ?? ctx).boxId
      )?.gridConfig;

      const targetGridConfig = getBox(tankId, rackId, boxId)?.gridConfig;

      // Perform validation if both grid configs are available
      if (sourceGridConfig && targetGridConfig) {
        const sourcePositions = clipData.tubes.map(tube => tube.location.position);
        const validation = validatePasteOperation(
          sourcePositions,
          anchorPosition,
          sourceGridConfig,
          targetGridConfig
        );

        // Show warning modal if validation failed
        if (!validation.isValid) {
          const userConfirmed = await new Promise<boolean>((resolve) => {
            modalService.showOverwriteConfirm({
              title: 'Paste Warning',
              message: validation.warnings.join('\n\n') + '\n\nDo you want to continue?',
              confirmText: 'Paste Anyway',
              onConfirm: () => {
                modalService.hideOverwriteConfirm();
                resolve(true);
              },
              onCancel: () => {
                modalService.hideOverwriteConfirm();
                resolve(false);
              }
            });
          });

          if (!userConfirmed) {
            // User cancelled - clear clipboard and exit
            return;
          }
        }
      }

      const sourcePositions = clipData.tubes.map(tube => tube.location.position);
      const minSourcePosition = Math.min(...sourcePositions);

      tubesToPaste = clipData.tubes.map((sourceTube) => {
        const relativePosition = sourceTube.location.position - minSourcePosition;
        const newPosition = anchorPosition + relativePosition;

        return tubeDataToCreateRequest(sourceTube, {
          tankId: ctx.tankId,
          rackId: ctx.rackId,
          boxId: ctx.boxId,
          position: newPosition
        });
      });
    }

    // Detect position conflicts before paste
    const conflictingPositions = tubesToPaste.filter(tubeData => {
      const existingTube = tubes.find(t =>
        t.location.tankId === tubeData.location.tankId &&
        t.location.rackId === tubeData.location.rackId &&
        t.location.boxId === tubeData.location.boxId &&
        t.location.position === tubeData.location.position
      );
      return existingTube !== undefined;
    });

    // If conflicts detected, ask user for confirmation
    if (conflictingPositions.length > 0) {
      const conflictingTubes = conflictingPositions.map(tubeData => {
        return tubes.find(t =>
          t.location.tankId === tubeData.location.tankId &&
          t.location.rackId === tubeData.location.rackId &&
          t.location.boxId === tubeData.location.boxId &&
          t.location.position === tubeData.location.position
        )!;
      });

      const userConfirmed = await new Promise<boolean>((resolve) => {
        modalService.showOverwriteConfirm({
          title: 'Overwrite Confirmation',
          message: `${conflictingPositions.length} position${conflictingPositions.length > 1 ? 's are' : ' is'} already occupied. Do you want to overwrite ${conflictingPositions.length > 1 ? 'these tubes' : 'this tube'}?`,
          confirmText: 'Overwrite',
          onConfirm: () => {
            modalService.hideOverwriteConfirm();
            resolve(true);
          },
          onCancel: () => {
            modalService.hideOverwriteConfirm();
            resolve(false);
          }
        });
      });

      if (!userConfirmed) {
        // User cancelled - exit without pasting
        return;
      }

      // User confirmed - delete conflicting tubes first (atomic operation)
      const conflictingTubeIds = conflictingTubes.map(t => t.id);
      if (onDeleteTubes && conflictingTubeIds.length > 0) {
        await onDeleteTubes(conflictingTubeIds, true); // Silent delete - notification comes from paste
      }
    }

    // Call paste mutation
    if (onPasteTubes) {
      await onPasteTubes(tubesToPaste);
    }

    // Delete source tubes after successful paste (cut operation only)
    if (clipData.operation === 'cut') {
      const tubeIds = clipData.tubes.map(tube => tube.id).filter(Boolean);
      if (onDeleteTubes && tubeIds.length > 0) {
        // Silent delete - notification handled below
        await onDeleteTubes(tubeIds, true);
      }

      // Show moved notification for cut operations - Light Amber (matches cut)
      notifications.move(`Moved ${tubesToPaste.length} tube${tubesToPaste.length > 1 ? 's' : ''}`);
    } else {
      // Show pasted notification for copy operations - Icy Blue (matches copy)
      notifications.paste(`Pasted ${tubesToPaste.length} tube${tubesToPaste.length > 1 ? 's' : ''}`);
    }

    // Clear clipboard after successful paste (both copy and cut)
    setClipboard(null);
  }, [clipboard, selectedPositionsInThisBox, setClipboard, onPasteTubes, onDeleteTubes, ctx, getBox, tankId, rackId, boxId, modalService, tubes]);

  // Delete operation with confirmation modal
  const deleteSelectedTubes = useCallback(async () => {
    const positions = selectedPositionsInThisBox();
    if (positions.length === 0) return;

    const tubeIds = positions
      .map(position => resolveTube(position))
      .filter((tubeId): tubeId is string => tubeId !== null);

    if (tubeIds.length === 0) return;

    // Show delete confirmation modal (confirm before destructive action)
    modalService.showDeleteConfirm({
      title: `Delete ${tubeIds.length} Tube${tubeIds.length > 1 ? 's' : ''}`,
      message: `Are you sure you want to delete ${tubeIds.length} tube${tubeIds.length > 1 ? 's' : ''}? This action cannot be undone.`,
      onConfirm: async () => {
        if (onDeleteTubes) {
          await onDeleteTubes(tubeIds);
        }

        // Clear selection after successful delete
        onSelectionChange(new Set());

        // Close confirmation modal
        modalService.hideDeleteConfirm();
      },
      onCancel: () => {
        // Just close the modal, keep selection
        modalService.hideDeleteConfirm();
      }
    });
  }, [selectedPositionsInThisBox, resolveTube, onDeleteTubes, onSelectionChange, modalService]);

  // Mouse position handler
  const setMousePosition = (position: { x: number; y: number } | null) => {
    setMousePositionStore(position);
  };

  // Label methods for UI
  const getCopyLabel = () => {
    const count = selectedPositionsInThisBox().length;
    if (count === 0) return 'Copy';
    if (count === 1) return 'Copy Tube';
    return `Copy ${count} Tubes`;
  };

  const getCutLabel = () => {
    const count = selectedPositionsInThisBox().length;
    if (count === 0) return 'Cut';
    if (count === 1) return 'Cut Tube';
    return `Cut ${count} Tubes`;
  };

  const getPasteLabel = () => {
    const count = clipboard?.tubes?.length ?? 0;
    if (count === 0) return 'Paste';
    if (count === 1) return 'Paste Tube';
    return `Paste ${count} Tubes`;
  };

  // Action methods
  const actions = {
    select: (position: number) => {
      const positionKey = toPositionKey(ctx, position);
      const newSelection = new Set(selectedPositions);
      newSelection.add(positionKey);
      onSelectionChange(newSelection);
    },
    deselect: (position: number) => {
      const positionKey = toPositionKey(ctx, position);
      const newSelection = new Set(selectedPositions);
      newSelection.delete(positionKey);
      onSelectionChange(newSelection);
    },
    toggle: (position: number) => {
      const positionKey = toPositionKey(ctx, position);
      const newSelection = new Set(selectedPositions);
      if (newSelection.has(positionKey)) {
        newSelection.delete(positionKey);
      } else {
        newSelection.add(positionKey);
      }
      onSelectionChange(newSelection);
    },
    clear: () => {
      onSelectionChange(new Set());
    },
    add: () => {
      // Convert selected positions to array for add operation
      const positions = Array.from(selectedPositions);

      if (positions.length === 0) return;

      modalService.showTubeEditorModal({
        mode: 'add',
        positions,
        rackId,
        boxId
      });
    },
    edit: () => {
      // Get tube IDs from selected positions for batch edit
      const selectedTubeIds = Array.from(selectedPositions)
        .map(positionKey => {
          const { position } = parsePositionKey(positionKey);
          return resolveTube(position);
        })
        .filter((tubeId): tubeId is string => tubeId !== null);

      if (selectedTubeIds.length === 0) return;

      if (selectedTubeIds.length === 1) {
        modalService.showTubeEditorModal({
          mode: 'edit',
          tubeId: selectedTubeIds[0]
        });
      } else {
        modalService.showTubeEditorModal({
          mode: 'batch',
          tubeIds: selectedTubeIds,
          preserveSelection: true  // Maintain multi-selection after batch operation
        });
      }
    },
    copy,
    cut,
    paste,
    delete: deleteSelectedTubes,
  };

  // Grid context menu methods (domain-driven architecture)
  const showContextMenu = useCallback((x: number, y: number) => {
    setContextMenu({ isOpen: true, x, y });
  }, []);

  const hideContextMenu = useCallback(() => {
    setContextMenu({ isOpen: false, x: 0, y: 0 });
  }, []);

  return {
    handlePositionClick,
    handlePositionDoubleClick,
    handleBulkSelection,
    isPositionSelected,
    setMousePosition,
    openModal,
    copy,
    cut,
    paste,
    delete: deleteSelectedTubes,
    actions,
    // Grid selection operations state
    clipboard: {
      hasData: Boolean(clipboard?.tubes?.length),
      count: clipboard?.tubes?.length ?? 0,
      cutPositions: useMemo(() => {
        if (clipboard?.operation === 'cut') {
          return new Set(clipboard.tubes.map(tube =>
            toPositionKey(clipboard.sourceLocation ?? ctx, tube.location.position)
          ));
        }
        return new Set<PositionKey>();
      }, [clipboard, ctx]),
      copyPositions: useMemo(() => {
        if (clipboard?.operation === 'copy') {
          return new Set(clipboard.tubes.map(tube =>
            toPositionKey(clipboard.sourceLocation ?? ctx, tube.location.position)
          ));
        }
        return new Set<PositionKey>();
      }, [clipboard, ctx]),
    },
    // Grid context menu state
    contextMenu: {
      isOpen: contextMenu.isOpen,
      x: contextMenu.x,
      y: contextMenu.y,
      show: showContextMenu,
      hide: hideContextMenu,
    },
    // Grid selection state
    selection: {
      hasFilledSelection: selectionAnalysis.hasFilledSelection,
      isMixed: selectionAnalysis.isMixed,
      filledCount: selectionAnalysis.filledCount,
      emptyCount: selectionAnalysis.emptyCount,
    },
    getCopyLabel,
    getCutLabel,
    getPasteLabel,
  };
};
