/**
 * Grid Controller Hook
 *
 * Thin orchestrator that composes selection, clipboard, and action hooks into a unified grid API.
 */

import { useMemo, useState, useCallback } from 'react';

import { useModalStore } from '@app/stores/modalStore';
import { useTubesByLocation } from '@domains/tubes/hooks';
import { toPositionKey, parsePositionKey } from '@domains/tubes/types/gridSelectionTypes';
import { buildRemoveTubeConfirmation } from '@domains/tubes/utils/removeTubeConfirmation';
import {
  canModifyTube,
  canModifyAllTubes,
  getBlockedModificationMessage,
} from '@domains/tubes/utils/tubeAccessControl';
import { useDemoItemLock } from '@shared/hooks/useDemoItemLock';
import { notifications } from '@shared/utils/notifications';

import { useGridClipboard } from './useGridClipboard';
import { useGridSelection } from './useGridSelection';

import type {
  GridControllerProps,
  GridControllerReturn,
} from '@domains/tubes/types/gridSelectionTypes';
import type { TubeData } from '@odysseus/shared-schemas';

export const useGridController = ({
  tankId,
  rackId,
  boxId,
  selectedPositions,
  onSelectionChange,
  resolveTubeIdAtPosition,
  onDeleteTubes,
  onPasteTubes,
  onMoveTubes,
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
  const isDemoLockedTube = useDemoItemLock();

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

  const { copy, cut, paste, clipboard } = useGridClipboard({
    ctx,
    tubes,
    selectedPositionsInThisBox,
    resolveTubeIdAtPosition: resolveTube,
    onDeleteTubes,
    onPasteTubes,
    onMoveTubes,
    onSelectionChange,
    currentUserId,
    isViewOnlySpace,
    isAdmin,
    hasResearcherProfile,
  });

  const modalService = useModalStore();

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

  // Bulk delete is partial-success on the server, so a mixed selection still removes the
  // visitor's own tubes; only an all-seeded selection would do nothing at all.
  const isDeleteLocked = useMemo(() => {
    const selectedTubes = getSelectedTubes();
    return selectedTubes.length > 0 && selectedTubes.every(tube => isDemoLockedTube(tube));
  }, [getSelectedTubes, isDemoLockedTube]);

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
          mode: 'bulk',
          tubeIds: selectedTubeIds,
          preserveSelection: true,
        });
      }
    }
  }, [
    selectionAnalysis,
    selectedPositions,
    modalService,
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
      openModal,
      clickTimerRef,
      guardAddInViewOnly,
      guardNoResearcherProfile,
    ]
  );

  const deleteSelectedTubes = useCallback(async () => {
    if (guardModifyOperation()) return;

    // The Del key has no control to hide, so the all-seeded case is refused here too.
    if (isDeleteLocked) {
      notifications.warning("Preloaded tubes can't be removed. Create your own to try this out.");
      return;
    }

    const positions = selectedPositionsInThisBox();
    if (positions.length === 0) return;

    const tubeIds = positions
      .map(position => resolveTube(position))
      .filter((tubeId): tubeId is string => tubeId !== null);

    if (tubeIds.length === 0) return;

    modalService.showDeleteConfirm({
      ...buildRemoveTubeConfirmation(tubeIds.length),
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
    isDeleteLocked,
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

  const showContextMenu = useCallback((x: number, y: number) => {
    setContextMenu({ isOpen: true, x, y });
  }, []);

  const hideContextMenu = useCallback(() => {
    // Keep x/y stable so the exit animation plays in place instead of jumping to the corner
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  }, []);

  const actions = useMemo(
    () => ({
      ...selectionActions,
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
    ]
  );

  return {
    handlePositionClick,
    handlePositionDoubleClick,
    isPositionSelected,
    openModal,
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
      isDeleteLocked,
      lockableCount: selectionAnalysis.lockableCount,
      unlockableCount: selectionAnalysis.unlockableCount,
      sharableCount: selectionAnalysis.sharableCount,
      isUnlocking,
    },
  };
};
