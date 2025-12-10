import { useState, useRef, useMemo, useCallback } from 'react';

import { useAuthStore } from '@domains/authentication';
import { gridNavigationService } from '@domains/grid';
import { useStorageData } from '@domains/storage';
import { useConfigurationSync } from '@domains/storage/hooks/useConfigurationSync';
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
import { parsePositionKey } from '@shared/types/grid';
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
import type { PositionKey } from '@shared/types/grid';

import '@shared/styles/legacy/layout.css';

// Lazy loading (commented out - uncomment to re-enable code splitting)
// const TubeEditorModal = lazy(() =>
//   import('@domains/tubes/ui/components/modals/TubeEditorModal').then(m => ({
//     default: m.TubeEditorModal
//   }))
// );
// const BatchTubeEditorModal = lazy(() =>
//   import('@domains/tubes/ui/components/modals/BatchTubeEditorModal').then(m => ({
//     default: m.BatchTubeEditorModal
//   }))
// );
// const useLazyTubeEditor = PreloadHelpers.createHook(
//   () => import('@domains/tubes/ui/components/modals/TubeEditorModal')
// );
// const useLazyBatchEditor = PreloadHelpers.createHook(
//   () => import('@domains/tubes/ui/components/modals/BatchTubeEditorModal')
// );

export function Dashboard() {
  // Sync server configuration to client store on mount
  useConfigurationSync();

  // Get current user for lock operations
  const { user } = useAuthStore();

  // ARCHITECTURAL IMPROVEMENT: Only UI state from TubeStore, React Query handles data
  const { currentTank, currentRack, currentBox, selectedPositions, setSelection, clearSelection } =
    useTubeStore(); // Only UI state, server data handled by React Query in components

  // Server state from React Query for selection analysis
  const { data: tubes = [] } = useTubesByLocation(currentTank, currentRack, currentBox);

  // Socket connection is now managed centrally by AppBootstrapService
  // Real-time updates are handled automatically via Socket → Query Cache Bridge
  // No manual socket management needed in components

  // React Query mutations for server operations
  const bulkDeleteTubesMutation = useBulkDeleteTubesMutation();
  const pasteTubesMutation = usePasteTubesMutation();
  const unlockTubesMutation = useUnlockTubesMutation();

  // Lock access control hook
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

  // Fetch display info for lock-related users
  const { data: lockUsers = [] } = useUserLookupQuery(lockRelatedUserIds);

  // Create lookup map for user display names
  const userDisplayMap = useMemo(() => {
    const map = new Map<string, string>();
    lockUsers.forEach(u => {
      const displayName = u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username;
      map.set(u.id, displayName);
    });
    return map;
  }, [lockUsers]);

  // Preloading disabled (uncomment for lazy loading)
  // const { preload: preloadTubeEditor } = useLazyTubeEditor();
  // const { preload: preloadBatchEditor } = useLazyBatchEditor();
  // PreloadHelpers.useOnIdle(preloadTubeEditor, 2000);
  // PreloadHelpers.useOnIdle(preloadBatchEditor, 2000);

  // Refs for focus detection
  const storageNavigatorRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // State to track when selector area is active/focused
  const [isSelectorActive, setIsSelectorActive] = useState(false);

  // Check if storage navigator has keyboard focus
  const isStorageNavigatorFocused = () => {
    const activeElement = document.activeElement;
    return activeElement && storageNavigatorRef.current?.contains(activeElement);
  };

  // Auth store subscribed for reactive updates

  const { getCurrentTanks } = useStorageData();

  // Get actual tank and rack names for display
  const tanks = getCurrentTanks();
  const currentTankObj = tanks.find(tank => tank.id === currentTank);
  const tankDisplayName = currentTankObj?.name ?? `Tank ${currentTank}`;

  const currentRackObj = currentTankObj?.racks?.find(rack => rack.id === currentRack);
  const rackDisplayName = currentRackObj?.name ?? `Rack ${currentRack}`;
  const currentBoxObj = currentRackObj?.boxes?.find(box => box.id === currentBox);
  const modalService = useModalStore();

  // Compute if current container is view-only (assigned to another user)
  // This determines if tube operations should be disabled
  const { isViewOnlySpace, spaceOwnerId } = useMemo(() => {
    if (!user) return { isViewOnlySpace: true, spaceOwnerId: undefined };
    if (user.role === 'admin') return { isViewOnlySpace: false, spaceOwnerId: undefined };

    // Box-level assignment takes precedence
    if (currentBoxObj?.assignedUserId !== undefined && currentBoxObj.assignedUserId !== null) {
      const isViewOnly = currentBoxObj.assignedUserId !== user.id;
      return {
        isViewOnlySpace: isViewOnly,
        spaceOwnerId: isViewOnly ? currentBoxObj.assignedUserId : undefined,
      };
    }

    // null box assignment = common space (box explicitly unassigned)
    if (currentBoxObj?.assignedUserId === null) {
      return { isViewOnlySpace: false, spaceOwnerId: undefined };
    }

    // Box assignment is undefined (inherit from rack)
    // Check rack-level assignment
    if (currentRackObj?.assignedUserId !== undefined && currentRackObj.assignedUserId !== null) {
      const isViewOnly = currentRackObj.assignedUserId !== user.id;
      return {
        isViewOnlySpace: isViewOnly,
        spaceOwnerId: isViewOnly ? currentRackObj.assignedUserId : undefined,
      };
    }

    // No assignment = common space
    return { isViewOnlySpace: false, spaceOwnerId: undefined };
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

  const storageHierarchy: StorageHierarchy = useMemo(
    () => ({
      tanks: tanks.map(tank => ({
        id: tank.id,
        name: tank.name,
        racks: tank.racks.map(rack => ({
          id: rack.id,
          name: rack.name,
          boxes: rack.boxes
            .filter(box => box.position !== undefined)
            .map(box => ({
              id: box.id,
              name: box.name,
              position: box.position!,
            })),
        })),
      })),
    }),
    [tanks]
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

  /**
   * Unified Add Tube Handler
   * Opens modal in 'add' mode with position keys
   */
  const handleAddTube = (positions?: PositionKey[]) => {
    // Use provided position keys or current selection
    const positionKeys = positions ?? Array.from(selectedPositions ?? []);

    if (positionKeys.length === 0) return;

    modalService.showTubeEditorModal({
      mode: 'add',
      positions: positionKeys,
      rackId: currentRack,
      boxId: currentBox,
      preserveSelection: positionKeys.length > 1, // Preserve multi-selection for batch adds
    });
  };

  /**
   * Unified Edit Tube Handler
   * Accepts tubeId (string) or TubeData object, normalizes to ID only
   * Opens modal in 'edit' mode with single tube ID
   */
  const handleEditTube = (input: string | TubeData) => {
    const tubeId = typeof input === 'string' ? input : input.id;

    if (!tubeId) {
      logger.warn('handleEditTube called with invalid input', { input });
      return;
    }

    modalService.showTubeEditorModal({
      mode: 'edit',
      tubeId,
    });
  };

  /**
   * Unified Batch Edit Handler
   * Accepts array of tube IDs or TubeData objects, normalizes to IDs only
   * Opens modal in 'batch' mode with multiple tube IDs
   */
  const handleBatchEditTubes = (inputs: Array<string | TubeData>) => {
    // Normalize: extract IDs from objects or use string IDs directly
    const tubeIds = inputs
      .map(item => (typeof item === 'string' ? item : item.id))
      .filter((id): id is string => Boolean(id));

    if (tubeIds.length === 0) {
      logger.warn('Batch edit requested but no valid tube IDs found', { inputs });
      return;
    }

    // Single tube? Use edit mode instead
    if (tubeIds.length === 1) {
      handleEditTube(tubeIds[0]);
      return;
    }

    modalService.showTubeEditorModal({
      mode: 'batch',
      tubeIds,
      preserveSelection: true, // Maintain multi-selection after batch operation
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
      await notifications.promise(unlockTubesMutation.mutateAsync({ tubeIds }), {
        loading: `Unlocking ${count} tube${count !== 1 ? 's' : ''}...`,
        success: `Unlocked ${count} tube${count !== 1 ? 's' : ''}`,
        error: 'Failed to unlock tubes',
      });
    },
    [unlockTubesMutation]
  );

  const handleShareAccess = useCallback(
    (tubeIds: string[]) => {
      modalService.showShareAccessModal(tubeIds);
    },
    [modalService]
  );

  // Unified lock context - shared across all components
  // Each component uses the functions it needs from this interface
  const lockContext = useMemo(() => {
    if (!user) return undefined;

    const getLockOwnerName = (tube: TubeData): string | undefined => {
      if (!tube.isLocked || !tube.lockedBy) return undefined;
      if (tube.lockedBy === user.id) return 'You';
      return userDisplayMap.get(tube.lockedBy) ?? tube.lockedBy;
    };

    const getSharedUserNames = (tube: TubeData): string[] => {
      if (!tube.sharedWithUserIds || tube.sharedWithUserIds.length === 0) return [];
      return tube.sharedWithUserIds.map(id =>
        id === user.id ? 'You' : (userDisplayMap.get(id) ?? id)
      );
    };

    return {
      currentUserId: user.id,
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

  // Selection analysis for header
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

  // SINGLE GRID CONTROLLER INSTANCE - All other components receive actions as props
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
          `Successfully deleted ${tubeIds.length} tube${tubeIds.length > 1 ? 's' : ''}`
        );
      }
    },
    onPasteTubes: async tubes => {
      await pasteTubesMutation.mutateAsync({ tubes });
    },
    // Lock operations
    onLockTubes: handleLockTubes,
    onUnlockTubes: handleUnlockTubes,
    onShareAccess: handleShareAccess,
    lockContext,
    isUnlocking: unlockTubesMutation.isPending,
    // View-only mode (container assigned to another user)
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
            getCopyLabel: gridController.getCopyLabel,
            getCutLabel: gridController.getCutLabel,
            getPasteLabel: gridController.getPasteLabel,
            selection: gridController.selection,
          }}
          isViewOnlySpace={isViewOnlySpace}
        />
      </div>

      {/* Height-Driven Main Layout */}
      <div className="main-layout">
        {/* Storage Navigator - Tank/Rack/Box */}
        <div className="storage-navigator-panel">
          <div className="component-card">
            <div className="component-title">
              <h4>Navigator</h4>
            </div>
            <div
              className="component-body"
              ref={storageNavigatorRef}
              onFocus={() => setIsSelectorActive(true)}
              onBlur={() => setIsSelectorActive(false)}
            >
              <ErrorBoundary>
                <StorageNavigator
                  data={storageHierarchy}
                  selected={selectedLocation}
                  onSelect={handleStorageNavigationSelect}
                />
              </ErrorBoundary>
            </div>
          </div>
        </div>

        {/* Main Grid - Square Constraint */}
        <div className="grid-section">
          <div className="component-card">
            <div className="component-title">
              <h4>
                {tankDisplayName} • {rackDisplayName} • Box {currentBox}
              </h4>
            </div>
            <div className="grid-container" ref={gridContainerRef}>
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
                  _onEditTube={handleEditTube}
                  _onBatchEditTubes={handleBatchEditTubes}
                  _onAddTubes={handleAddTube}
                  gridController={gridController}
                  lockContext={lockContext}
                  isViewOnlySpace={isViewOnlySpace}
                  spaceOwnerName={spaceOwnerName}
                />
              </ErrorBoundary>
            </div>
          </div>
        </div>

        {/* Info Panel - Flexible Width */}
        <div className="info-panel">
          <div className="component-card">
            <div className="component-title">
              <h4>Tube Information</h4>
            </div>
            <div className="component-body">
              <TubeInfoPanel
                selectedTubes={selectionAnalysis.selectedTubes}
                lockContext={lockContext}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Unified Tube Modal - Rendered based on modalStore state */}
      {modalService.tubeEditorModal.isOpen && modalService.tubeEditorModal.mode === 'add' && (
        <SuspenseBoundary fallback={<ModalSkeleton size="lg" />} name="TubeEditorModal">
          <TubeEditorModal
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading fallback: use modal's ID or current location
            rackId={modalService.tubeEditorModal.rackId || currentRack}
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading fallback: use modal's ID or current location
            boxId={modalService.tubeEditorModal.boxId || currentBox}
            onClose={handleCloseModal}
            selectedPositions={new Set(modalService.tubeEditorModal.positions ?? [])}
          />
        </SuspenseBoundary>
      )}

      {modalService.tubeEditorModal.isOpen && modalService.tubeEditorModal.mode === 'edit' && (
        <SuspenseBoundary fallback={<ModalSkeleton size="lg" />} name="TubeEditorModal">
          <TubeEditorModal
            tubeId={modalService.tubeEditorModal.tubeId}
            onClose={handleCloseModal}
            lockContext={lockContext}
          />
        </SuspenseBoundary>
      )}

      {modalService.tubeEditorModal.isOpen &&
        modalService.tubeEditorModal.mode === 'batch' &&
        modalService.tubeEditorModal.tubeIds &&
        (() => {
          // Resolve tube IDs to tube objects for BatchEditModal
          const resolvedTubes = modalService.tubeEditorModal
            .tubeIds!.map(id => tubes.find(t => t.id === id))
            .filter((tube): tube is TubeData => tube !== undefined);

          return (
            <SuspenseBoundary fallback={<ModalSkeleton size="lg" />} name="BatchTubeEditorModal">
              <BatchTubeEditorModal
                tubeIds={modalService.tubeEditorModal.tubeIds}
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
      {modalService.lockTubesModal.isOpen && (
        <LockTubesModal
          tubeIds={modalService.lockTubesModal.tubeIds}
          onClose={modalService.hideLockTubesModal}
          onSuccess={handleClearSelection}
        />
      )}

      {/* Share Access Modal */}
      {modalService.shareAccessModal.isOpen && user && (
        <ShareAccessModal
          tubes={modalService.shareAccessModal.tubeIds
            .map(id => tubes.find(t => t.id === id))
            .filter((t): t is TubeData => t !== undefined)}
          currentUserId={user.id}
          onClose={modalService.hideShareAccessModal}
        />
      )}
    </div>
  );
}
