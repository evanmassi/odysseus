/**
 * Biobank Dashboard
 *
 * Main lab workspace: storage navigator, tube grid, and info panel.
 */

import { useRef, useMemo, useCallback, useEffect } from 'react';

import { isAdminRole, getPersonDisplayName } from '@odysseus/shared-schemas';
import { FlaskConical } from 'lucide-react';

import { useModalStore } from '@app/stores/modalStore';
import { useAuthStore } from '@domains/authentication';
import {
  useStorageData,
  useStorageLocationNames,
  getGridTotalPositions,
  DEFAULT_GRID_CONFIG,
  useStorageOwnership,
  StorageNavigator,
  buildStorageHierarchy,
} from '@domains/storage';
import {
  useTubeStore,
  TubeInfoPanel,
  useTubesByLocation,
  useTubeAccessControl,
  useUnlockTubesMutation,
  useBulkDeleteTubesMutation,
  usePasteTubesMutation,
  useMoveTubesMutation,
  TubeGrid,
  useGridController,
  useGridSelectionAnalysis,
  navigateToLocation,
} from '@domains/tubes';
import { useActiveUsersQuery, useUserLookupQuery } from '@domains/users';
import { logger } from '@infra/logger';
import { AccentTick, ErrorBoundary, HeaderStrip, OccupancyBar, PanelHeader } from '@shared/ui';
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';
import { notifications } from '@shared/utils/notifications';

import { AppHeader } from './AppHeader';
import { BiobankModals } from './BiobankModals';
import { DashboardLoading } from './DashboardLoading';

import type { StorageHierarchy, SelectedLocation } from '@domains/storage';
import type { TubeData } from '@odysseus/shared-schemas';

import '@shared/styles/base/layout.css';

export function BiobankDashboard({ isSynced }: { isSynced: boolean }) {
  if (!isSynced) {
    return (
      <div className="app-container">
        <DashboardLoading />
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
      map.set(
        u.id,
        getPersonDisplayName({ username: u.username, firstName: u.firstName, lastName: u.lastName })
      );
    });
    return map;
  }, [lockUsers]);

  const storageNavigatorRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const infoPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (gridContainerRef.current?.contains(target)) return;
      if (storageNavigatorRef.current?.contains(target)) return;
      if (infoPanelRef.current?.contains(target)) return;

      const modalRoot = document.getElementById('modal-root');
      if (modalRoot?.contains(target)) return;

      const isInOverlay = (target as Element).closest?.(
        '[role="dialog"], [role="alertdialog"], [role="menu"], [data-radix-dialog-content], .modal'
      );
      if (isInOverlay) return;

      const isInHeader = (target as Element).closest?.('.app-header');
      if (isInHeader) return;

      if (selectedPositions.size > 0) {
        clearSelection();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedPositions.size, clearSelection]);

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

  const isAdmin = isAdminRole(user?.role);

  const isViewOnlySpace = useMemo(() => {
    if (!user) return true;
    // Box owner wins; undefined means "inherit from rack", null means "explicitly unassigned".
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
      return await moveTubesMutation.mutateAsync({ moves });
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
          onClearSelection={clearSelection}
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
          <div className="h-full" ref={storageNavigatorRef}>
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
          <ConsolePanel intensity="medium" className="flex flex-col">
            <div className="flex-shrink-0 border-b border-line-faint pr-4">
              <PanelHeader
                icon={<FlaskConical className="h-4 w-4" />}
                title={currentLab?.name ?? 'Biobank'}
              />
            </div>

            <HeaderStrip className="px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className="flex min-w-0 items-center gap-1.5 font-mono text-data-sm tracking-[0.04em]">
                  <AccentTick tone="warning" />
                  <span className="truncate text-foreground">{tankDisplayName}</span>
                  <span className="flex-shrink-0 text-foreground/30">›</span>
                  <span className="truncate text-foreground">{rackDisplayName}</span>
                  <span className="flex-shrink-0 text-foreground/30">›</span>
                  <span className="truncate font-medium text-foreground">{boxDisplayName}</span>
                </span>
                <span className="flex-1" />
                <span className="flex flex-shrink-0 items-center gap-2">
                  <OccupancyBar
                    filled={tubes.length}
                    capacity={gridCapacity}
                    size="lg"
                    glow
                    className="w-20"
                  />
                  <span className="font-mono text-data-sm tracking-[0.06em] text-foreground/60">
                    {tubes.length}
                    <span className="text-foreground/35">/{gridCapacity}</span>
                  </span>
                </span>
              </div>
            </HeaderStrip>
            <div className="grid-container" ref={gridContainerRef}>
              <ErrorBoundary>
                <TubeGrid
                  tankId={currentTank}
                  rackId={currentRack}
                  boxId={currentBox}
                  selectedPositions={selectedPositions}
                  onSelectionChange={setSelection}
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

      <BiobankModals currentUserId={user?.id} tubes={tubes} />
    </div>
  );
}
