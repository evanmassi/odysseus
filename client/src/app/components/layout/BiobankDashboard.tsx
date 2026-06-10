/**
 * Biobank Dashboard
 *
 * Main lab workspace: storage navigator, tube grid, and info panel.
 * Extracted from AppDashboard to support route-based suite switching.
 */

import { useState, useRef, useMemo, useCallback, useEffect } from 'react';

import { isAdminRole } from '@odysseus/shared-schemas';
import { FlaskConical } from 'lucide-react';

import { useModalStore } from '@app/stores/modalStore';
import { useAuthStore } from '@domains/authentication';
import {
  useStorageData,
  useStorageLocationNames,
  getGridTotalPositions,
  DEFAULT_GRID_CONFIG,
} from '@domains/storage';
import { useStorageOwnership } from '@domains/storage/hooks/useStorageOwnership';
import { useStorageSync } from '@domains/storage/hooks/useStorageSync';
import {
  StorageNavigator,
  buildStorageHierarchy,
} from '@domains/storage/ui/components/storage-navigator';
import { useTubeStore, TubeInfoPanel } from '@domains/tubes';
import {
  useTubesByLocation,
  useTubeAccessControl,
  useUnlockTubesMutation,
} from '@domains/tubes/hooks';
import {
  useBulkDeleteTubesMutation,
  usePasteTubesMutation,
  useMoveTubesMutation,
} from '@domains/tubes/hooks/useTubeMutations';
import { TubeBulkEditorModal } from '@domains/tubes/ui/components/editor/TubeBulkEditorModal';
import { TubeEditorModal } from '@domains/tubes/ui/components/editor/TubeEditorModal';
import { TubeGrid } from '@domains/tubes/ui/components/grid/TubeGrid';
import { useGridController } from '@domains/tubes/ui/components/grid/useGridController';
import { useGridSelectionAnalysis } from '@domains/tubes/ui/components/grid/useGridSelectionAnalysis';
import { TubeLockModal } from '@domains/tubes/ui/components/locking/TubeLockModal';
import { TubeShareAccessModal } from '@domains/tubes/ui/components/locking/TubeShareAccessModal';
import { navigateToLocation } from '@domains/tubes/utils/gridNavigation';
import { useActiveUsersQuery, useUserLookupQuery } from '@domains/users';
import { logger } from '@infra/logger';
import { ErrorBoundary, NubDivider, PanelHeader, SuspenseBoundary } from '@shared/ui';
import { ModalSkeleton } from '@shared/ui/components/loading/ModalSkeleton';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { UnsavedConfirmDialog } from '@shared/ui/components/overlays/UnsavedConfirmDialog';
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';
import { notifications } from '@shared/utils/notifications';

import { AppHeader } from './AppHeader';

import type {
  StorageHierarchy,
  SelectedLocation,
} from '@domains/storage/ui/components/storage-navigator';
import type { TubeData } from '@domains/tubes/types';
import type { PositionKey } from '@domains/tubes/types/gridSelectionTypes';

import '@shared/styles/base/layout.css';

export function BiobankDashboard() {
  const { isSynced } = useStorageSync();

  if (!isSynced) {
    return (
      <div className="app-container">
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return <BiobankWorkspace />;
}

function BiobankWorkspace() {
  const { user } = useAuthStore();

  const { currentTank, currentRack, currentBox, selectedPositions, setSelection, clearSelection } =
    useTubeStore();

  const { data: tubes = [] } = useTubesByLocation(currentTank, currentRack, currentBox);

  const bulkDeleteTubesMutation = useBulkDeleteTubesMutation();
  const pasteTubesMutation = usePasteTubesMutation();
  const moveTubesMutation = useMoveTubesMutation();
  const unlockTubesMutation = useUnlockTubesMutation();

  const accessControl = useTubeAccessControl(user);

  const lockRelatedUserIds = useMemo(() => {
    const userIds = new Set<string>();
    tubes.forEach(tube => {
      if (tube.isLocked) {
        if (tube.lockedBy) userIds.add(tube.lockedBy);
        tube.sharedWithUserIds?.forEach(id => userIds.add(id));
      }
    });
    if (user?.id) userIds.delete(user.id);
    return Array.from(userIds);
  }, [tubes, user?.id]);

  const { data: lockUsers = [] } = useUserLookupQuery(lockRelatedUserIds);

  const currentUserIds = useMemo(() => (user?.id ? [user.id] : []), [user?.id]);
  const { data: currentUserDisplayInfo = [] } = useUserLookupQuery(currentUserIds);

  const userDisplayMap = useMemo(() => {
    const map = new Map<string, string>();
    lockUsers.forEach(u => {
      const displayName = u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username;
      map.set(u.id, displayName);
    });
    return map;
  }, [lockUsers]);

  const storageNavigatorRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const infoPanelRef = useRef<HTMLDivElement>(null);

  const [isSelectorActive, setIsSelectorActive] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (gridContainerRef.current?.contains(target)) return;
      if (storageNavigatorRef.current?.contains(target)) return;
      if (infoPanelRef.current?.contains(target)) return;

      const modalRoot = document.getElementById('modal-root');
      if (modalRoot?.contains(target)) return;

      const isInModal = (target as Element).closest?.(
        '[role="dialog"], [role="alertdialog"], [data-radix-dialog-content], .modal'
      );
      if (isInModal) return;

      const isInHeader = (target as Element).closest?.('.app-header');
      if (isInHeader) return;

      if (selectedPositions.size > 0) {
        clearSelection();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedPositions.size, clearSelection]);

  const isStorageNavigatorFocused = () => {
    const activeElement = document.activeElement;
    return activeElement && storageNavigatorRef.current?.contains(activeElement);
  };

  const { getCurrentTanks, currentLab } = useStorageData();

  const {
    tankName: tankDisplayName,
    rackName: rackDisplayName,
    boxName: boxDisplayName,
    rack: currentRackObj,
    box: currentBoxObj,
  } = useStorageLocationNames(currentTank, currentRack, currentBox);

  const gridCapacity = getGridTotalPositions(currentBoxObj?.gridConfig ?? DEFAULT_GRID_CONFIG);

  const tanks = getCurrentTanks();
  const modalService = useModalStore();

  const modalPositionsSet = useMemo(
    () => new Set(modalService.tubeEditorModal.positions ?? []),
    [modalService.tubeEditorModal.positions]
  );

  const isAdmin = isAdminRole(user?.role);

  const isViewOnlySpace = useMemo(() => {
    if (!user) return true;
    const effectiveOwnerId =
      currentBoxObj?.assignedUserId !== undefined
        ? currentBoxObj.assignedUserId
        : currentRackObj?.assignedUserId;
    if (effectiveOwnerId === null || effectiveOwnerId === undefined) return false;
    return effectiveOwnerId !== user.id && !isAdmin;
  }, [user, currentBoxObj?.assignedUserId, currentRackObj?.assignedUserId, isAdmin]);

  const storageHierarchy: StorageHierarchy = useMemo(() => buildStorageHierarchy(tanks), [tanks]);

  const { data: activeUsers = [] } = useActiveUsersQuery();

  const allDisplayUsers = useMemo(() => {
    const map = new Map(activeUsers.map(u => [u.id, u]));
    currentUserDisplayInfo.forEach(u => map.set(u.id, u));
    return Array.from(map.values());
  }, [activeUsers, currentUserDisplayInfo]);

  const { getUserInfo: getOwnershipUserInfo } = useStorageOwnership(allDisplayUsers, user?.id);

  const currentUserInfo = useMemo(() => {
    if (!user) return undefined;
    const ownershipInfo = getOwnershipUserInfo(user.id);
    return ownershipInfo ? { id: user.id, initials: ownershipInfo.initials, isAdmin } : undefined;
  }, [user, getOwnershipUserInfo, isAdmin]);

  const getNavigatorUserInitials = useCallback(
    (userId: string): string | undefined => getOwnershipUserInfo(userId)?.initials,
    [getOwnershipUserInfo]
  );

  const selectedLocation: SelectedLocation = useMemo(
    () => ({
      tankId: currentTank,
      rackId: currentRack,
      boxId: currentBox,
    }),
    [currentTank, currentRack, currentBox]
  );

  const handleStorageNavigationSelect = async (location: SelectedLocation) => {
    if (!location.tankId || !location.rackId || !location.boxId) {
      logger.error('Invalid location: missing required fields', { location });
      return;
    }

    await navigateToLocation({
      tankId: location.tankId,
      rackId: location.rackId,
      boxId: location.boxId,
    });
  };

  const handleCloseModal = () => {
    modalService.hideTubeEditorModal();
  };

  const handleSelectionChange = (newSelection: Set<PositionKey>) => {
    setSelection(newSelection);
  };

  const handleClearSelection = () => {
    clearSelection();
  };

  const handleLockTubes = useCallback(
    (tubeIds: string[]) => {
      modalService.showLockTubesModal(tubeIds);
    },
    [modalService]
  );

  const handleUnlockTubes = useCallback(
    async (tubeIds: string[]) => {
      const count = tubeIds.length;
      const loadingId = notifications.loading(
        `Unlocking ${count} tube${count !== 1 ? 's' : ''}...`
      );
      try {
        await unlockTubesMutation.mutateAsync({ tubeIds });
        notifications.dismiss(loadingId);
        notifications.success(`Unlocked ${count} tube${count !== 1 ? 's' : ''}`);
      } catch {
        notifications.dismiss(loadingId);
        notifications.error('Failed to unlock tubes');
      }
    },
    [unlockTubesMutation]
  );

  const handleShareAccess = useCallback(
    (tubeIds: string[]) => {
      modalService.showShareAccessModal(tubeIds);
    },
    [modalService]
  );

  const lockContext = useMemo(() => {
    if (!user) return undefined;

    const getLockOwnerName = (tube: TubeData): string | undefined => {
      if (!tube.isLocked || !tube.lockedBy) return undefined;
      if (tube.lockedBy === user.id) return 'You';
      return userDisplayMap.get(tube.lockedBy) ?? tube.lockedBy;
    };

    const getSharedUserNames = (tube: TubeData): string[] => {
      if (!tube.sharedWithUserIds || tube.sharedWithUserIds.length === 0) return [];
      return tube.sharedWithUserIds
        .filter(id => id === user.id || userDisplayMap.has(id))
        .map(id => (id === user.id ? 'You' : userDisplayMap.get(id)!));
    };

    return {
      canLockTube: accessControl.canLockTube,
      canUnlockTube: accessControl.canUnlockTube,
      canShareTubeAccess: accessControl.canShareTubeAccess,
      isLockedByCurrentUser: accessControl.isLockedByCurrentUser,
      isLockedOutFrom: accessControl.isLockedOutFrom,
      hasExplicitSharedAccess: accessControl.hasExplicitSharedAccess,
      getLockOwnerName,
      getSharedUserNames,
    };
  }, [user, accessControl, userDisplayMap]);

  const selectionAnalysis = useGridSelectionAnalysis(selectedPositions, tubes);

  const hasResearcherProfile =
    isAdminRole(user?.role) || (!!user?.researcherId && user?.researcherActive !== false);

  const gridController = useGridController({
    tankId: currentTank,
    rackId: currentRack,
    boxId: currentBox,
    selectedPositions,
    onSelectionChange: setSelection,
    onDeleteTubes: async (tubeIds: string[], silent = false) => {
      await bulkDeleteTubesMutation.mutateAsync({
        tubeIds,
        location:
          currentTank && currentRack && currentBox
            ? { tankId: currentTank, rackId: currentRack, boxId: currentBox }
            : undefined,
      });

      if (!silent) {
        notifications.success(
          `Successfully removed ${tubeIds.length} tube${tubeIds.length > 1 ? 's' : ''}`
        );
      }
    },
    onPasteTubes: async tubes => {
      await pasteTubesMutation.mutateAsync({ tubes });
    },
    onMoveTubes: async moves => {
      await moveTubesMutation.mutateAsync({ moves });
    },
    onLockTubes: handleLockTubes,
    onUnlockTubes: handleUnlockTubes,
    onShareAccess: handleShareAccess,
    lockContext,
    isUnlocking: unlockTubesMutation.isPending,
    currentUserId: user?.id,
    isViewOnlySpace,
    isAdmin,
    hasResearcherProfile,
  });

  return (
    <div className="app-container">
      <div className="app-header">
        <AppHeader
          selectedPositions={selectedPositions}
          onClearSelection={handleClearSelection}
          tubes={tubes}
          gridController={{
            openModal: gridController.openModal,
            copy: gridController.actions.copy,
            cut: gridController.actions.cut,
            paste: gridController.actions.paste,
            delete: gridController.actions.delete,
            canPaste: gridController.clipboard.hasData,
            selection: gridController.selection,
            lock: gridController.actions.lock,
            unlock: gridController.actions.unlock,
            shareAccess: gridController.actions.shareAccess,
          }}
          isViewOnlySpace={isViewOnlySpace}
        />
      </div>

      <div className="main-layout">
        <div className="storage-navigator-panel">
          <div
            className="h-full"
            ref={storageNavigatorRef}
            onFocus={() => setIsSelectorActive(true)}
            onBlur={() => setIsSelectorActive(false)}
          >
            <ErrorBoundary>
              <StorageNavigator
                data={storageHierarchy}
                selected={selectedLocation}
                onSelect={handleStorageNavigationSelect}
                currentUser={currentUserInfo}
                getUserInitials={isAdmin ? getNavigatorUserInitials : undefined}
              />
            </ErrorBoundary>
          </div>
        </div>

        <div className="grid-section">
          <ConsolePanel intensity="medium" className="h-full flex flex-col">
            <div className="flex-shrink-0 border-b border-line-faint pr-4">
              <PanelHeader
                icon={<FlaskConical className="h-4 w-4" />}
                title={currentLab?.name ?? 'Biobank'}
              />
            </div>

            <div className="relative flex-shrink-0 border-b border-line-faint bg-black/35 px-4 py-2.5">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-foreground/[0.05]"
              />
              <div className="flex items-center gap-3">
                <span className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] tracking-[0.04em]">
                  <span
                    aria-hidden
                    className="h-2.5 w-0.5 flex-shrink-0 bg-warning-bg/80 shadow-[0_0_6px_hsl(var(--color-warning-bg)/0.55)]"
                  />
                  <span className="truncate text-foreground">{tankDisplayName}</span>
                  <span className="flex-shrink-0 text-foreground/30">›</span>
                  <span className="truncate text-foreground">{rackDisplayName}</span>
                  <span className="flex-shrink-0 text-foreground/30">›</span>
                  <span className="truncate font-medium text-foreground">{boxDisplayName}</span>
                </span>
                <span className="flex-1" />
                <span className="flex flex-shrink-0 items-center gap-2">
                  <span className="relative h-1 w-20 bg-foreground/[0.07]">
                    <span
                      className="absolute inset-y-0 left-0 bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.6)]"
                      style={{
                        width: `${gridCapacity > 0 ? (tubes.length / gridCapacity) * 100 : 0}%`,
                      }}
                    />
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.06em] text-foreground/60">
                    {tubes.length}
                    <span className="text-foreground/35">/{gridCapacity}</span>
                  </span>
                </span>
              </div>
              <NubDivider tone="primary" className="absolute inset-x-0 -bottom-px" />
            </div>
            <div className="grid-container flex-1" ref={gridContainerRef}>
              <ErrorBoundary>
                <TubeGrid
                  tankId={currentTank}
                  rackId={currentRack}
                  boxId={currentBox}
                  selectedPositions={
                    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                    isStorageNavigatorFocused() || isSelectorActive ? new Set() : selectedPositions
                  }
                  onSelectionChange={handleSelectionChange}
                  gridController={gridController}
                  lockContext={lockContext}
                />
              </ErrorBoundary>
            </div>
          </ConsolePanel>
        </div>

        <div className="info-panel" ref={infoPanelRef}>
          <TubeInfoPanel
            selectedTubes={selectionAnalysis.selectedTubes}
            lockContext={lockContext}
          />
        </div>
      </div>

      {modalService.tubeEditorModal.isOpen && modalService.tubeEditorModal.mode === 'add' && (
        <SuspenseBoundary fallback={<ModalSkeleton size="lg" />} name="TubeEditorModal-Add">
          <TubeEditorModal
            isOpen
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading fallback: use modal's ID or current location
            rackId={modalService.tubeEditorModal.rackId || currentRack}
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading fallback: use modal's ID or current location
            boxId={modalService.tubeEditorModal.boxId || currentBox}
            onClose={handleCloseModal}
            selectedPositions={modalPositionsSet}
          />
        </SuspenseBoundary>
      )}

      {modalService.tubeEditorModal.isOpen && modalService.tubeEditorModal.mode === 'edit' && (
        <SuspenseBoundary fallback={<ModalSkeleton size="lg" />} name="TubeEditorModal-Edit">
          <TubeEditorModal
            isOpen
            tubeId={modalService.tubeEditorModal.tubeId}
            onClose={handleCloseModal}
          />
        </SuspenseBoundary>
      )}

      {modalService.tubeEditorModal.isOpen &&
        modalService.tubeEditorModal.mode === 'bulk' &&
        (modalService.tubeEditorModal.tubeIds ?? []).length > 0 && (
          <SuspenseBoundary fallback={<ModalSkeleton size="lg" />} name="TubeBulkEditorModal">
            <TubeBulkEditorModal
              isOpen
              tubeIds={modalService.tubeEditorModal.tubeIds ?? []}
              onClose={handleCloseModal}
            />
          </SuspenseBoundary>
        )}

      <ConfirmDialog
        isOpen={modalService.deleteConfirm.isOpen}
        variant="danger"
        title={modalService.deleteConfirm.title}
        message={modalService.deleteConfirm.message}
        confirmText={modalService.deleteConfirm.confirmText}
        onConfirm={modalService.deleteConfirm.onConfirm}
        onCancel={modalService.deleteConfirm.onCancel}
      />

      <ConfirmDialog
        isOpen={modalService.overwriteConfirm.isOpen}
        variant="warning"
        title={modalService.overwriteConfirm.title}
        message={modalService.overwriteConfirm.message}
        confirmText={modalService.overwriteConfirm.confirmText}
        onConfirm={modalService.overwriteConfirm.onConfirm}
        onCancel={modalService.overwriteConfirm.onCancel}
      />

      <UnsavedConfirmDialog
        isOpen={modalService.unsavedConfirm.isOpen}
        title={modalService.unsavedConfirm.title}
        message={modalService.unsavedConfirm.message}
        onConfirm={modalService.unsavedConfirm.onConfirm}
        onCancel={modalService.unsavedConfirm.onCancel}
      />

      <TubeLockModal
        isOpen={modalService.lockTubesModal.isOpen}
        tubeIds={modalService.lockTubesModal.tubeIds}
        onClose={modalService.hideLockTubesModal}
      />

      <TubeShareAccessModal
        isOpen={modalService.shareAccessModal.isOpen && !!user}
        tubes={modalService.shareAccessModal.tubeIds
          .map(id => tubes.find(t => t.id === id))
          .filter((t): t is TubeData => t !== undefined)}
        currentUserId={user?.id ?? ''}
        onClose={modalService.hideShareAccessModal}
      />
    </div>
  );
}
