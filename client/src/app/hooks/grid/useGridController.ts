/**
 * Grid Controller Hook
 *
 * Thin orchestrator that composes selection, clipboard, and action hooks into a unified grid API.
 */

import { useMemo, useState, useCallback } from 'react';

import { useModalStore } from '@app/stores/modalStore';
import { useTubesByLocation } from '@domains/tubes/hooks';
import { useGridUiStore } from '@shared/stores/gridUiStore';
import { toPositionKey, parsePositionKey } from '@shared/types/GridSelection';
import { notifications } from '@shared/utils/notifications';
import {
  canModifyTube,
  canModifyAllTubes,
  getBlockedModificationMessage,
} from '@shared/utils/tubeAccessControl';

import { useGridClipboard } from './useGridClipboard';
import { useGridSelection } from './useGridSelection';

import type { TubeData } from '@odysseus/shared-schemas';
import type { GridControllerProps, GridControllerReturn } from '@shared/types/GridSelection';

export const useGridController = ({
  tankId,
  rackId,
  boxId,
  selectedPositions,
  onSelectionChange,
  resolveTubeIdAtPosition,
  onDeleteTubes,
  onPasteTubes,
  onLockTubes,
  onUnlockTubes,
  onShareAccess,
  lockContext,
  isUnlocking = false,
  currentUserId,
  isViewOnlySpace = false,
  isAdmin = false,
  hasResearcherProfile = true,
}: GridControllerProps): GridControllerReturn => {
  const ctx = useMemo(() => ({ tankId, rackId, boxId }), [tankId, rackId, boxId]);

  const { data: tubes = [] } = useTubesByLocation(tankId, rackId, boxId);

  const positionToTubeMap = useMemo(() => {
    const map = new Map<number, string>();
    tubes.forEach(tube => {
      if (tube.location.position) {
        map.set(tube.location.position, tube.id);
      }
    });
    return map;
  }, [tubes]);

  const resolveTube = useMemo(
    () =>
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Function fallback
      resolveTubeIdAtPosition || ((position: number) => positionToTubeMap.get(position) ?? null),
    [resolveTubeIdAtPosition, positionToTubeMap]
  );

  const {
    handlePositionClick,
    handleBulkSelection,
    isPositionSelected,
    selectedPositionsInThisBox,
    selectionAnalysis,
    clickTimerRef,
    actions: selectionActions,
  } = useGridSelection({
    ctx,
    tubes,
    selectedPositions,
    onSelectionChange,
    resolveTubeIdAtPosition: resolveTube,
    lockContext,
  });

  const { copy, cut, paste, clipboard, getCopyLabel, getCutLabel, getPasteLabel } =
    useGridClipboard({
      ctx,
      tubes,
      selectedPositionsInThisBox,
      resolveTubeIdAtPosition: resolveTube,
      onDeleteTubes,
      onPasteTubes,
      onSelectionChange,
      currentUserId,
      isViewOnlySpace,
      isAdmin,
      hasResearcherProfile,
    });

  const modalService = useModalStore();
  const setMousePositionStore = useGridUiStore(state => state.setMousePosition);

  const [contextMenu, setContextMenu] = useState({
    isOpen: false,
    x: 0,
    y: 0,
  });

  const guardNoResearcherProfile = useCallback((): boolean => {
    if (!hasResearcherProfile) {
      notifications.warning('Researcher profile required to perform this action.');
      return true;
    }
    return false;
  }, [hasResearcherProfile]);

  const guardAddInViewOnly = useCallback((): boolean => {
    if (guardNoResearcherProfile()) return true;
    if (isViewOnlySpace) {
      notifications.warning('Cannot add tubes to a space assigned to another user.');
      return true;
    }
    return false;
  }, [isViewOnlySpace, guardNoResearcherProfile]);

  const getSelectedTubes = useCallback(() => {
    const positions = selectedPositionsInThisBox();
    return positions
      .map(position => {
        const tubeId = resolveTube(position);
        return tubeId ? tubes.find(t => t.id === tubeId) : null;
      })
      .filter((tube): tube is NonNullable<typeof tube> => tube !== null);
  }, [selectedPositionsInThisBox, resolveTube, tubes]);

  const getFilteredTubeIds = useCallback(
    (predicate: (tube: TubeData) => boolean): string[] =>
      getSelectedTubes()
        .filter(predicate)
        .map(t => t.id),
    [getSelectedTubes]
  );

  // Returns true if blocked — checks both container access AND lock status
  const guardModifyOperation = useCallback((): boolean => {
    if (guardNoResearcherProfile()) return true;

    const selectedTubes = getSelectedTubes();
    if (selectedTubes.length === 0) return false;

    const result = canModifyAllTubes(selectedTubes, currentUserId, isViewOnlySpace, isAdmin);

    if (!result.canModifyAll) {
      notifications.warning(getBlockedModificationMessage(result));
      return true;
    }

    return false;
  }, [isViewOnlySpace, isAdmin, getSelectedTubes, currentUserId, guardNoResearcherProfile]);

  const openModal = useCallback(() => {
    const positions = Array.from(selectedPositions);

    if (selectionAnalysis.isMixed || selectionAnalysis.allEmpty) {
      if (guardAddInViewOnly()) return;

      modalService.showTubeEditorModal({
        mode: 'add',
        positions,
        rackId,
        boxId,
      });
    } else if (selectionAnalysis.allFilled) {
      if (guardModifyOperation()) return;

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
          tubeId: selectedTubeIds[0],
        });
      } else {
        modalService.showTubeEditorModal({
          mode: 'batch',
          tubeIds: selectedTubeIds,
          preserveSelection: true,
        });
      }
    }
  }, [
    selectionAnalysis,
    selectedPositions,
    modalService,
    rackId,
    boxId,
    resolveTube,
    guardAddInViewOnly,
    guardModifyOperation,
  ]);

  const handlePositionDoubleClick = useCallback(
    (position: number) => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }

      if (guardNoResearcherProfile()) return;

      const positionKey = toPositionKey(ctx, position);

      if (selectedPositions.has(positionKey) && selectedPositions.size > 1) {
        openModal();
        return;
      }

      const tubeId = resolveTube(position);
      if (tubeId) {
        const tube = tubes.find(t => t.id === tubeId);
        if (tube && !canModifyTube(tube, currentUserId, isViewOnlySpace, isAdmin)) {
          notifications.warning('Cannot edit this tube. You do not have access.');
          return;
        }

        modalService.showTubeEditorModal({
          mode: 'edit',
          tubeId,
        });
      } else {
        if (guardAddInViewOnly()) return;

        modalService.showTubeEditorModal({
          mode: 'add',
          positions: [positionKey],
          rackId,
          boxId,
        });
      }
    },
    [
      ctx,
      selectedPositions,
      resolveTube,
      tubes,
      currentUserId,
      isViewOnlySpace,
      isAdmin,
      modalService,
      rackId,
      boxId,
      openModal,
      clickTimerRef,
      guardAddInViewOnly,
      guardNoResearcherProfile,
    ]
  );

  const deleteSelectedTubes = useCallback(async () => {
    if (guardModifyOperation()) return;

    const positions = selectedPositionsInThisBox();
    if (positions.length === 0) return;

    const tubeIds = positions
      .map(position => resolveTube(position))
      .filter((tubeId): tubeId is string => tubeId !== null);

    if (tubeIds.length === 0) return;

    modalService.showDeleteConfirm({
      title: `Remove ${tubeIds.length} Tube${tubeIds.length > 1 ? 's' : ''}`,
      message: `Are you sure you want to remove ${tubeIds.length} tube${tubeIds.length > 1 ? 's' : ''}? This action cannot be undone.`,
      confirmText: 'Remove',
      onConfirm: async () => {
        if (onDeleteTubes) {
          await onDeleteTubes(tubeIds);
        }
        onSelectionChange(new Set());
        modalService.hideDeleteConfirm();
      },
      onCancel: () => {
        modalService.hideDeleteConfirm();
      },
    });
  }, [
    guardModifyOperation,
    selectedPositionsInThisBox,
    resolveTube,
    onDeleteTubes,
    onSelectionChange,
    modalService,
  ]);

  const toggleLock = useCallback(async () => {
    if (!lockContext || isUnlocking) return;
    if (guardNoResearcherProfile()) return;
    if (guardModifyOperation()) return;

    const selectedTubes = getSelectedTubes();
    if (selectedTubes.length === 0) return;

    const lockable = selectedTubes.filter(t => lockContext.canLockTube(t));
    const unlockable = selectedTubes.filter(t => lockContext.canUnlockTube(t));

    if (lockable.length > 0 && onLockTubes) {
      onLockTubes(lockable.map(t => t.id));
    } else if (unlockable.length > 0 && onUnlockTubes) {
      await onUnlockTubes(unlockable.map(t => t.id));
    } else {
      notifications.warning('No tubes can be locked or unlocked');
    }
  }, [
    lockContext,
    getSelectedTubes,
    onLockTubes,
    onUnlockTubes,
    isUnlocking,
    guardModifyOperation,
    guardNoResearcherProfile,
  ]);

  const lockTubes = useCallback(() => {
    if (!lockContext || !onLockTubes) return;
    if (guardNoResearcherProfile()) return;
    if (guardModifyOperation()) return;

    const lockableTubeIds = getFilteredTubeIds(t => lockContext.canLockTube(t));

    if (lockableTubeIds.length === 0) {
      notifications.warning('No tubes can be locked');
      return;
    }

    onLockTubes(lockableTubeIds);
  }, [
    lockContext,
    getFilteredTubeIds,
    onLockTubes,
    guardModifyOperation,
    guardNoResearcherProfile,
  ]);

  const unlockTubes = useCallback(async () => {
    if (!lockContext || !onUnlockTubes || isUnlocking) return;
    if (guardNoResearcherProfile()) return;

    const unlockableTubeIds = getFilteredTubeIds(t => lockContext.canUnlockTube(t));

    if (unlockableTubeIds.length === 0) {
      notifications.warning('No tubes can be unlocked');
      return;
    }

    await onUnlockTubes(unlockableTubeIds);
  }, [lockContext, getFilteredTubeIds, onUnlockTubes, isUnlocking, guardNoResearcherProfile]);

  const shareAccess = useCallback(() => {
    if (!lockContext || !onShareAccess) return;
    if (guardNoResearcherProfile()) return;

    const sharableTubeIds = getFilteredTubeIds(t => lockContext.canShareTubeAccess(t));

    if (sharableTubeIds.length === 0) {
      notifications.warning('No tubes available for sharing');
      return;
    }

    onShareAccess(sharableTubeIds);
  }, [lockContext, getFilteredTubeIds, onShareAccess, guardNoResearcherProfile]);

  const setMousePosition = useCallback(
    (position: { x: number; y: number } | null) => {
      setMousePositionStore(position);
    },
    [setMousePositionStore]
  );

  const showContextMenu = useCallback((x: number, y: number) => {
    setContextMenu({ isOpen: true, x, y });
  }, []);

  const hideContextMenu = useCallback(() => {
    setContextMenu({ isOpen: false, x: 0, y: 0 });
  }, []);

  const actions = useMemo(
    () => ({
      ...selectionActions,
      add: () => {
        if (guardAddInViewOnly()) return;

        const positions = Array.from(selectedPositions);
        if (positions.length === 0) return;

        modalService.showTubeEditorModal({
          mode: 'add',
          positions,
          rackId,
          boxId,
        });
      },
      edit: () => {
        if (guardModifyOperation()) return;

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
            tubeId: selectedTubeIds[0],
          });
        } else {
          modalService.showTubeEditorModal({
            mode: 'batch',
            tubeIds: selectedTubeIds,
            preserveSelection: true,
          });
        }
      },
      copy,
      cut,
      paste,
      delete: deleteSelectedTubes,
      ...(lockContext && onLockTubes ? { toggleLock } : {}),
      ...(lockContext && onLockTubes ? { lock: lockTubes } : {}),
      ...(lockContext && onUnlockTubes ? { unlock: unlockTubes } : {}),
      ...(lockContext && onShareAccess ? { shareAccess } : {}),
    }),
    [
      selectionActions,
      selectedPositions,
      modalService,
      rackId,
      boxId,
      resolveTube,
      copy,
      cut,
      paste,
      deleteSelectedTubes,
      lockContext,
      onLockTubes,
      onUnlockTubes,
      onShareAccess,
      toggleLock,
      lockTubes,
      unlockTubes,
      shareAccess,
      guardAddInViewOnly,
      guardModifyOperation,
    ]
  );

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
    clipboard,
    contextMenu: {
      isOpen: contextMenu.isOpen,
      x: contextMenu.x,
      y: contextMenu.y,
      show: showContextMenu,
      hide: hideContextMenu,
    },
    selection: {
      hasFilledSelection: selectionAnalysis.hasFilledSelection,
      isMixed: selectionAnalysis.isMixed,
      filledCount: selectionAnalysis.filledCount,
      emptyCount: selectionAnalysis.emptyCount,
      lockableCount: selectionAnalysis.lockableCount,
      unlockableCount: selectionAnalysis.unlockableCount,
      sharableCount: selectionAnalysis.sharableCount,
      isUnlocking,
    },
    getCopyLabel,
    getCutLabel,
    getPasteLabel,
  };
};
