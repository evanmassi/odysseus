/**
 * App Dashboard
 *
 * Main lab workspace: storage navigator, tube grid, and info panel.
 */

import { useState, useRef, useMemo, useCallback, useEffect, lazy } from 'react';

import { formatStorageDisplayName, isAdminRole } from '@odysseus/shared-schemas';
import { MapPin, Navigation, NotepadText, ScanEye, UserRound, UsersRound } from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { useStorageData, useStorageLocationNames } from '@domains/storage';
import { useStorageOwnership } from '@domains/storage/hooks/useStorageOwnership';
import { useStorageSync } from '@domains/storage/hooks/useStorageSync';
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
import { ErrorBoundary, SuspenseBoundary } from '@shared/ui';
import { ModalSkeleton } from '@shared/ui/components/loading/ModalSkeleton';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { UnsavedConfirmDialog } from '@shared/ui/components/overlays/UnsavedConfirmDialog';
import { Chip } from '@shared/ui/primitives/chip/Chip';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { Tooltip } from '@shared/ui/primitives/tooltip/Tooltip';
import { notifications } from '@shared/utils/notifications';

import { useModalStore } from '../../stores/modalStore';

import { AppHeader } from './AppHeader';

import type {
  StorageHierarchy,
  SelectedLocation,
} from '@domains/storage/ui/components/storage-navigator';
import type { TubeData } from '@domains/tubes/types';
import type { PositionKey } from '@domains/tubes/types/gridSelectionTypes';

import '@shared/styles/base/layout.css';

const SystemAdminDashboard = lazy(() =>
  import('@domains/admin').then(m => ({ default: m.SystemAdminDashboard }))
);

export function AppDashboard() {
  const { isSynced, hasNoLab } = useStorageSync();

  if (hasNoLab) {
    return (
      <div className="app-container">
        <div className="app-header">
          <AppHeader />
        </div>
        <SuspenseBoundary
          fallback={
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          }
          name="SystemAdminDashboard"
        >
          <SystemAdminDashboard />
        </SuspenseBoundary>
      </div>
    );
  }

  if (!isSynced) {
    return (
      <div className="app-container">
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return <LabDashboard />;
}

function LabDashboard() {
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

  const [isSelectorActive, setIsSelectorActive] = useState(false);

  // Clear selection when clicking outside the grid and panels
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
  } = useStorageLocationNames(currentTank, currentRack, currentBox);

  const tanks = getCurrentTanks();
  const modalService = useModalStore();

  // Memoize modal positions Set to prevent unnecessary re-renders
  // Without this, every Dashboard render creates a new Set object even if positions unchanged
  const modalPositionsSet = useMemo(
    () => new Set(modalService.tubeEditorModal.positions ?? []),
    [modalService.tubeEditorModal.positions]
  );

  const isAdmin = isAdminRole(user?.role);

  const { isViewOnlySpace, spaceOwnerId, isCommonSpace, isOwnSpace } = useMemo(() => {
    if (!user)
      return {
        isViewOnlySpace: true,
        spaceOwnerId: undefined,
        isCommonSpace: false,
        isOwnSpace: false,
      };

    // Resolve effective owner through inheritance cascade
    let effectiveOwnerId: string | null | undefined;
    if (currentBoxObj?.assignedUserId !== undefined) {
      effectiveOwnerId = currentBoxObj.assignedUserId;
    } else {
      effectiveOwnerId = currentRackObj?.assignedUserId;
    }

    // null or undefined = common/unassigned
    if (effectiveOwnerId === null || effectiveOwnerId === undefined) {
      return {
        isViewOnlySpace: false,
        spaceOwnerId: undefined,
        isCommonSpace: true,
        isOwnSpace: false,
      };
    }

    const isOwn = effectiveOwnerId === user.id;
    // Admins always have full access — never view-only
    const isViewOnly = !isOwn && !isAdmin;

    return {
      isViewOnlySpace: isViewOnly,
      spaceOwnerId: effectiveOwnerId,
      isCommonSpace: false,
      isOwnSpace: isOwn,
    };
  }, [user, currentBoxObj?.assignedUserId, currentRackObj?.assignedUserId, isAdmin]);

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

  const storageHierarchy: StorageHierarchy = useMemo(
    () => ({
      tanks: tanks.map(tank => ({
        id: tank.id,
        name: tank.name,
        racks: tank.racks.map(rack => ({
          id: rack.id,
          name: formatStorageDisplayName(rack.name, rack.customLabel),
          assignedUserId: rack.assignedUserId,
          boxes: rack.boxes
            .filter(box => box.position !== undefined)
            .map(box => ({
              id: box.id,
              name: formatStorageDisplayName(box.name, box.customLabel),
              position: box.position!,
              assignedUserId: box.assignedUserId,
            })),
        })),
      })),
    }),
    [tanks]
  );

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

  // Users without an active researcher profile can only browse (admins always have full access)
  const hasResearcherProfile =
    isAdminRole(user?.role) || (!!user?.researcherId && user?.researcherActive !== false);

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
          <div className="h-full flex flex-col bg-card rounded-lg">
            <div className="px-4 pt-4 pb-2">
              <h4 className="text-sm font-semibold text-muted-foreground tracking-wide inline-flex items-center gap-1.5">
                <Navigation size={16} className="text-secondary-foreground" />
                Navigator
              </h4>
            </div>
            <div
              className="flex-1 pb-2 overflow-y-auto overflow-x-hidden"
              style={{ scrollbarWidth: 'none' }}
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
        </div>

        <div className="grid-section">
          <div className="h-full flex flex-col bg-card rounded-lg">
            <div className="px-4 pt-4 pb-2 flex items-center">
              <h4 className="text-sm font-semibold text-muted-foreground tracking-wide inline-flex items-center gap-1.5">
                <MapPin size={16} className="flex-shrink-0 text-secondary-foreground" />
                <span>{tankDisplayName}</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span>{rackDisplayName}</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span>{boxDisplayName}</span>
              </h4>
              <div className="flex-1 flex justify-end">
                {isOwnSpace && (
                  <Tooltip content="This space is assigned to you.">
                    <Chip
                      color="success"
                      size="sm"
                      leftIcon={<UserRound />}
                      className="cursor-help"
                    >
                      Assigned to You
                    </Chip>
                  </Tooltip>
                )}
                {isViewOnlySpace && (
                  <Tooltip content="You can view, but not modify, tubes here.">
                    <Chip color="warning" size="sm" leftIcon={<ScanEye />} className="cursor-help">
                      View Only - Assigned to{' '}
                      <span className="font-semibold">{spaceOwnerName ?? 'another user'}</span>
                    </Chip>
                  </Tooltip>
                )}
                {!isViewOnlySpace && !isOwnSpace && !isCommonSpace && spaceOwnerId && (
                  <Tooltip
                    content={`This space is assigned to ${spaceOwnerName ?? 'another user'}.`}
                  >
                    <Chip color="info" size="sm" leftIcon={<UserRound />} className="cursor-help">
                      Assigned to{' '}
                      <span className="font-semibold">{spaceOwnerName ?? 'another user'}</span>
                    </Chip>
                  </Tooltip>
                )}
                {isCommonSpace && (
                  <Tooltip content="This space is available to all users.">
                    <Chip
                      color="default"
                      size="sm"
                      leftIcon={<UsersRound />}
                      className="cursor-help"
                    >
                      Unassigned/Common
                    </Chip>
                  </Tooltip>
                )}
              </div>
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

        <div className="info-panel" ref={infoPanelRef}>
          <div className="h-full flex flex-col bg-card rounded-lg">
            <div className="px-4 pt-4 pb-2">
              <h4 className="text-sm font-semibold text-muted-foreground tracking-wide inline-flex items-center gap-1.5">
                <NotepadText size={16} className="text-secondary-foreground" />
                Tube Information
              </h4>
            </div>
            <ScrollArea className="flex-1 p-3">
              <TubeInfoPanel
                selectedTubes={selectionAnalysis.selectedTubes}
                lockContext={lockContext}
              />
            </ScrollArea>
          </div>
        </div>
      </div>

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
        />
      </SuspenseBoundary>

      <SuspenseBoundary fallback={<ModalSkeleton size="lg" />} name="TubeBulkEditorModal">
        <TubeBulkEditorModal
          isOpen={
            modalService.tubeEditorModal.isOpen &&
            modalService.tubeEditorModal.mode === 'batch' &&
            (modalService.tubeEditorModal.tubeIds ?? []).length > 0
          }
          tubeIds={modalService.tubeEditorModal.tubeIds ?? []}
          onClose={handleCloseModal}
        />
      </SuspenseBoundary>

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
