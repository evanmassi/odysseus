import { useState, useRef, useMemo, useCallback, useEffect } from 'react';

import { formatResourceDisplayName } from '@odysseus/shared-schemas';
import { ScanEye, UsersRound } from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { gridNavigationService } from '@domains/grid';
import { useStorageData, useLocationDisplayNames } from '@domains/storage';
import { useConfigurationSync } from '@domains/storage/hooks/useConfigurationSync';
import { useResourceOwnership } from '@domains/storage/hooks/useResourceOwnership';
import { StorageNavigator } from '@domains/storage/ui/components/storage-navigator';
import { useTubeStore, TubeInfoPanel } from '@domains/tubes';
import {
  useTubesByLocation,
  useTubeAccessControl,
  useUnlockTubesMutation,
} from '@domains/tubes/hooks';
import {
  useBulkDeleteTubesMutation,
  usePasteTubesMutation,
} from '@domains/tubes/hooks/useTubeMutations';
import { TubeGrid } from '@domains/tubes/ui/components/grid/TubeGrid';
import { BatchTubeEditorModal } from '@domains/tubes/ui/components/modals/BatchTubeEditorModal';
import { DeleteConfirmDialog } from '@domains/tubes/ui/components/modals/DeleteConfirmDialog';
import { LockTubesModal } from '@domains/tubes/ui/components/modals/LockTubesModal';
import { OverwriteConfirmDialog } from '@domains/tubes/ui/components/modals/OverwriteConfirmDialog';
import { ShareAccessModal } from '@domains/tubes/ui/components/modals/ShareAccessModal';
import { TubeEditorModal } from '@domains/tubes/ui/components/modals/TubeEditorModal';
import { useUserLookupQuery } from '@domains/users';
import { logger } from '@shared/infrastructure/logger';
import { parsePositionKey } from '@shared/types/GridSelection';
import { ErrorBoundary, SuspenseBoundary } from '@shared/ui';
import { ModalSkeleton } from '@shared/ui/components/loading/LoadingSkeletons';
import { UnsavedConfirmDialog } from '@shared/ui/components/UnsavedConfirmDialog';
import { notifications } from '@shared/utils/notifications';

import { useGridController } from '../../hooks/grid';
import { useModalStore } from '../../stores/modalStore';

import { AppHeader } from './AppHeader';

import type {
  StorageHierarchy,
  SelectedLocation,
} from '@domains/storage/ui/components/storage-navigator';
import type { TubeData } from '@domains/tubes/types';
import type { PositionKey } from '@shared/types/GridSelection';

import '@shared/styles/base/layout.css';

export function Dashboard() {
  useConfigurationSync();

  const { user } = useAuthStore();

  const { currentTank, currentRack, currentBox, selectedPositions, setSelection, clearSelection } =
    useTubeStore();

  const { data: tubes = [] } = useTubesByLocation(currentTank, currentRack, currentBox);

  const bulkDeleteTubesMutation = useBulkDeleteTubesMutation();
  const pasteTubesMutation = usePasteTubesMutation();
  const unlockTubesMutation = useUnlockTubesMutation();

  const accessControl = useTubeAccessControl(user);

  // Collect unique user IDs from locked tubes for display name lookup
  const lockRelatedUserIds = useMemo(() => {
    const userIds = new Set<string>();
    tubes.forEach(tube => {
      if (tube.isLocked) {
        if (tube.lockedBy) userIds.add(tube.lockedBy);
        tube.sharedWithUserIds?.forEach(id => userIds.add(id));
      }
    });
    // Remove current user - we display "You" for them
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

  // Refs for focus detection and click-outside handling
  const storageNavigatorRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const infoPanelRef = useRef<HTMLDivElement>(null);

  // State to track when selector area is active/focused
  const [isSelectorActive, setIsSelectorActive] = useState(false);

  // Clear selection when clicking outside the grid and panels (Excel/Figma behavior)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Don't clear if clicking inside interactive areas
      if (gridContainerRef.current?.contains(target)) return;
      if (storageNavigatorRef.current?.contains(target)) return;
      if (infoPanelRef.current?.contains(target)) return;

      // Don't clear if clicking inside modal portal (includes backdrop and dialog)
      const modalRoot = document.getElementById('modal-root');
      if (modalRoot?.contains(target)) return;

      // Don't clear if clicking inside a modal or dialog (fallback for non-portal modals)
      const isInModal = (target as Element).closest?.(
        '[role="dialog"], [role="alertdialog"], [data-radix-dialog-content], .modal'
      );
      if (isInModal) return;

      // Don't clear if clicking on the header (contains action buttons)
      const isInHeader = (target as Element).closest?.('.app-header');
      if (isInHeader) return;

      // Clear selection when clicking on dashboard background
      if (selectedPositions.size > 0) {
        clearSelection();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedPositions.size, clearSelection]);

  // Check if storage navigator has keyboard focus
  const isStorageNavigatorFocused = () => {
    const activeElement = document.activeElement;
    return activeElement && storageNavigatorRef.current?.contains(activeElement);
  };

  const { getCurrentTanks } = useStorageData();

  const {
    tankName: tankDisplayName,
    rackName: rackDisplayName,
    boxName: boxDisplayName,
    rack: currentRackObj,
    box: currentBoxObj,
  } = useLocationDisplayNames(currentTank, currentRack, currentBox);

  const tanks = getCurrentTanks();
  const modalService = useModalStore();

  // Memoize modal positions Set to prevent unnecessary re-renders
  // Without this, every Dashboard render creates a new Set object even if positions unchanged
  const modalPositionsSet = useMemo(
    () => new Set(modalService.tubeEditorModal.positions ?? []),
    [modalService.tubeEditorModal.positions]
  );

  // Compute if current container is view-only (assigned to another user) or common space
  // This determines if tube operations should be disabled and what indicator to show
  const { isViewOnlySpace, spaceOwnerId, isCommonSpace } = useMemo(() => {
    if (!user) return { isViewOnlySpace: true, spaceOwnerId: undefined, isCommonSpace: false };
    if (user.role === 'admin')
      return { isViewOnlySpace: false, spaceOwnerId: undefined, isCommonSpace: false };

    // Box-level assignment takes precedence
    if (currentBoxObj?.assignedUserId !== undefined && currentBoxObj.assignedUserId !== null) {
      const isViewOnly = currentBoxObj.assignedUserId !== user.id;
      return {
        isViewOnlySpace: isViewOnly,
        spaceOwnerId: isViewOnly ? currentBoxObj.assignedUserId : undefined,
        isCommonSpace: false,
      };
    }

    // null box assignment = common space (box explicitly unassigned)
    if (currentBoxObj?.assignedUserId === null) {
      return { isViewOnlySpace: false, spaceOwnerId: undefined, isCommonSpace: true };
    }

    // Box assignment is undefined (inherit from rack)
    // Check rack-level assignment
    if (currentRackObj?.assignedUserId !== undefined && currentRackObj.assignedUserId !== null) {
      const isViewOnly = currentRackObj.assignedUserId !== user.id;
      return {
        isViewOnlySpace: isViewOnly,
        spaceOwnerId: isViewOnly ? currentRackObj.assignedUserId : undefined,
        isCommonSpace: false,
      };
    }

    // No assignment = common space
    return { isViewOnlySpace: false, spaceOwnerId: undefined, isCommonSpace: true };
  }, [user, currentBoxObj?.assignedUserId, currentRackObj?.assignedUserId]);

  // Fetch display name for space owner (if in view-only mode)
  const spaceOwnerIds = useMemo(() => (spaceOwnerId ? [spaceOwnerId] : []), [spaceOwnerId]);
  const { data: spaceOwnerUsers = [] } = useUserLookupQuery(spaceOwnerIds);
  const spaceOwnerName = useMemo(() => {
    if (!spaceOwnerId || spaceOwnerUsers.length === 0) return undefined;
    const ownerUser = spaceOwnerUsers.find(u => u.id === spaceOwnerId);
    if (!ownerUser) return undefined;
    return ownerUser.firstName && ownerUser.lastName
      ? `${ownerUser.firstName} ${ownerUser.lastName}`
      : ownerUser.username;
  }, [spaceOwnerId, spaceOwnerUsers]);

  // Build storage hierarchy for navigator
  const storageHierarchy: StorageHierarchy = useMemo(
    () => ({
      tanks: tanks.map(tank => ({
        id: tank.id,
        name: tank.name,
        racks: tank.racks.map(rack => ({
          id: rack.id,
          name: formatResourceDisplayName(rack.name, rack.customLabel),
          assignedUserId: rack.assignedUserId,
          boxes: rack.boxes
            .filter(box => box.position !== undefined)
            .map(box => ({
              id: box.id,
              name: formatResourceDisplayName(box.name, box.customLabel),
              position: box.position!,
              assignedUserId: box.assignedUserId,
            })),
        })),
      })),
    }),
    [tanks]
  );

  const { getUserInfo: getOwnershipUserInfo } = useResourceOwnership(
    currentUserDisplayInfo,
    user?.id
  );

  const currentUserInfo = useMemo(() => {
    if (!user) return undefined;
    const ownershipInfo = getOwnershipUserInfo(user.id);
    return ownershipInfo ? { id: user.id, initials: ownershipInfo.initials } : undefined;
  }, [user, getOwnershipUserInfo]);

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

    const result = await gridNavigationService.navigateToLocation({
      tankId: location.tankId,
      rackId: location.rackId,
      boxId: location.boxId,
    });

    if (!result.success) {
      logger.error('Navigation failed', { error: result.error });
      notifications.error(`Navigation failed: ${result.error}`);
    }
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

  // Lock operation handlers
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
      // Permission checks
      canLockTube: accessControl.canLockTube,
      canUnlockTube: accessControl.canUnlockTube,
      canShareTubeAccess: accessControl.canShareTubeAccess,
      isLockedByCurrentUser: accessControl.isLockedByCurrentUser,
      isLockedOutFrom: accessControl.isLockedOutFrom,
      // Display helpers
      getLockOwnerName,
      getSharedUserNames,
    };
  }, [user, accessControl, userDisplayMap]);

  const selectionAnalysis = (() => {
    if (selectedPositions.size === 0) {
      return {
        selectedTubes: [],
        emptyPositions: new Set<string>(),
        filledPositions: new Set<string>(),
        hasEmpty: false,
        hasFilled: false,
        isMixed: false,
        totalSelected: 0,
      };
    }

    const selectedTubes = Array.from(selectedPositions || [])
      .map(key => {
        const { tankId, rackId, boxId, position } = parsePositionKey(key);
        return tubes.find(
          t =>
            t.location.tankId === tankId &&
            t.location.rackId === rackId &&
            t.location.boxId === boxId &&
            t.location.position === position
        );
      })
      .filter((tube): tube is TubeData => tube !== undefined);

    const emptyPositions = new Set(
      Array.from(selectedPositions || []).filter(key => {
        const { tankId, rackId, boxId, position } = parsePositionKey(key);
        return !tubes.find(
          t =>
            t.location.tankId === tankId &&
            t.location.rackId === rackId &&
            t.location.boxId === boxId &&
            t.location.position === position
        );
      })
    );

    const filledPositions = new Set(
      Array.from(selectedPositions || []).filter(key => {
        const { tankId, rackId, boxId, position } = parsePositionKey(key);
        return tubes.find(
          t =>
            t.location.tankId === tankId &&
            t.location.rackId === rackId &&
            t.location.boxId === boxId &&
            t.location.position === position
        );
      })
    );

    return {
      selectedTubes,
      emptyPositions,
      filledPositions,
      hasEmpty: emptyPositions.size > 0,
      hasFilled: filledPositions.size > 0,
      isMixed: emptyPositions.size > 0 && filledPositions.size > 0,
      totalSelected: selectedPositions.size,
    };
  })();

  const gridController = useGridController({
    tankId: currentTank,
    rackId: currentRack,
    boxId: currentBox,
    selectedPositions,
    onSelectionChange: setSelection,
    onDeleteTubes: async (tubeIds: string[], silent = false) => {
      await bulkDeleteTubesMutation.mutateAsync({ tubeIds });

      if (!silent) {
        notifications.success(
          `Successfully removed ${tubeIds.length} tube${tubeIds.length > 1 ? 's' : ''}`
        );
      }
    },
    onPasteTubes: async tubes => {
      await pasteTubesMutation.mutateAsync({ tubes });
    },
    onLockTubes: handleLockTubes,
    onUnlockTubes: handleUnlockTubes,
    onShareAccess: handleShareAccess,
    lockContext,
    isUnlocking: unlockTubesMutation.isPending,
    currentUserId: user?.id,
    isViewOnlySpace,
  });

  return (
    <div className="app-container">
      {/* Application Header */}
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

      {/* Height-Driven Main Layout */}
      <div className="main-layout">
        {/* Storage Navigator - Tank/Rack/Box */}
        <div className="storage-navigator-panel">
          <div className="h-full flex flex-col bg-card rounded-lg">
            <div className="px-4 pt-4 pb-2">
              <h4 className="text-sm font-semibold text-muted-foreground tracking-wide">
                Navigator
              </h4>
            </div>
            <div
              className="flex-1 pb-2 overflow-y-auto overflow-x-hidden scrollbar-hidden"
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
                />
              </ErrorBoundary>
            </div>
          </div>
        </div>

        {/* Main Grid - Square Constraint */}
        <div className="grid-section">
          <div className="h-full flex flex-col bg-card rounded-lg">
            <div className="px-4 pt-4 pb-2 flex items-center">
              <h4 className="text-sm font-semibold text-muted-foreground tracking-wide inline-flex items-center gap-1.5">
                <span>{tankDisplayName}</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span>{rackDisplayName}</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span>{boxDisplayName}</span>
              </h4>
              {isViewOnlySpace && (
                <div className="flex-1 flex justify-end">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-warning-text cursor-help"
                    title="You can view, but not modify, tubes here."
                  >
                    <ScanEye className="w-2.5 h-2.5" />
                    View Only - Assigned to{' '}
                    <span className="font-semibold">{spaceOwnerName ?? 'another user'}</span>
                  </span>
                </div>
              )}
              {isCommonSpace && (
                <div className="flex-1 flex justify-end">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground cursor-help"
                    title="This space is available to all users."
                  >
                    <UsersRound className="w-2.5 h-2.5" />
                    Unassigned/Common
                  </span>
                </div>
              )}
            </div>
            <div className="grid-container flex-1" ref={gridContainerRef}>
              <ErrorBoundary>
                <TubeGrid
                  tankId={currentTank}
                  rackId={currentRack}
                  boxId={currentBox}
                  selectedPositions={
                    // Boolean OR logic - both operands are booleans, not null-coalescing
                    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                    isStorageNavigatorFocused() || isSelectorActive ? new Set() : selectedPositions
                  }
                  onSelectionChange={handleSelectionChange}
                  gridController={gridController}
                  lockContext={lockContext}
                />
              </ErrorBoundary>
            </div>
          </div>
        </div>

        {/* Info Panel - Flexible Width */}
        <div className="info-panel" ref={infoPanelRef}>
          <div className="h-full flex flex-col bg-card rounded-lg">
            <div className="px-4 pt-4 pb-2">
              <h4 className="text-sm font-semibold text-muted-foreground tracking-wide">
                Tube Information
              </h4>
            </div>
            <div className="flex-1 p-3 overflow-auto">
              <TubeInfoPanel
                selectedTubes={selectionAnalysis.selectedTubes}
                lockContext={lockContext}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Unified Tube Modal - Rendered based on modalStore state */}
      <SuspenseBoundary fallback={<ModalSkeleton size="lg" />} name="TubeEditorModal-Add">
        <TubeEditorModal
          isOpen={
            modalService.tubeEditorModal.isOpen && modalService.tubeEditorModal.mode === 'add'
          }
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading fallback: use modal's ID or current location
          rackId={modalService.tubeEditorModal.rackId || currentRack}
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading fallback: use modal's ID or current location
          boxId={modalService.tubeEditorModal.boxId || currentBox}
          onClose={handleCloseModal}
          selectedPositions={modalPositionsSet}
        />
      </SuspenseBoundary>

      <SuspenseBoundary fallback={<ModalSkeleton size="lg" />} name="TubeEditorModal-Edit">
        <TubeEditorModal
          isOpen={
            modalService.tubeEditorModal.isOpen && modalService.tubeEditorModal.mode === 'edit'
          }
          tubeId={modalService.tubeEditorModal.tubeId}
          onClose={handleCloseModal}
          lockContext={lockContext}
        />
      </SuspenseBoundary>

      {(() => {
        const tubeIds = modalService.tubeEditorModal.tubeIds ?? [];
        const resolvedTubes = tubeIds
          .map(id => tubes.find(t => t.id === id))
          .filter((tube): tube is TubeData => tube !== undefined);

        return (
          <SuspenseBoundary fallback={<ModalSkeleton size="lg" />} name="BatchTubeEditorModal">
            <BatchTubeEditorModal
              isOpen={
                modalService.tubeEditorModal.isOpen &&
                modalService.tubeEditorModal.mode === 'batch' &&
                tubeIds.length > 0
              }
              tubeIds={tubeIds}
              tubes={resolvedTubes}
              onClose={handleCloseModal}
            />
          </SuspenseBoundary>
        );
      })()}

      {/* Unified System Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={modalService.deleteConfirm.isOpen}
        title={modalService.deleteConfirm.title}
        message={modalService.deleteConfirm.message}
        confirmText={modalService.deleteConfirm.confirmText}
        onConfirm={modalService.deleteConfirm.onConfirm}
        onCancel={modalService.deleteConfirm.onCancel}
      />

      {/* Unified System Overwrite Confirmation Dialog */}
      <OverwriteConfirmDialog
        isOpen={modalService.overwriteConfirm.isOpen}
        title={modalService.overwriteConfirm.title}
        message={modalService.overwriteConfirm.message}
        confirmText={modalService.overwriteConfirm.confirmText}
        onConfirm={modalService.overwriteConfirm.onConfirm}
        onCancel={modalService.overwriteConfirm.onCancel}
      />

      {/* Unified System Unsaved Changes Confirmation Dialog */}
      <UnsavedConfirmDialog
        isOpen={modalService.unsavedConfirm.isOpen}
        title={modalService.unsavedConfirm.title}
        message={modalService.unsavedConfirm.message}
        onConfirm={modalService.unsavedConfirm.onConfirm}
        onCancel={modalService.unsavedConfirm.onCancel}
      />

      {/* Lock Tubes Modal */}
      <LockTubesModal
        isOpen={modalService.lockTubesModal.isOpen}
        tubeIds={modalService.lockTubesModal.tubeIds}
        onClose={modalService.hideLockTubesModal}
        onSuccess={handleClearSelection}
      />

      {/* Share Access Modal */}
      <ShareAccessModal
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
