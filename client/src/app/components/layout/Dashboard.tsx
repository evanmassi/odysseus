import { useState, useRef, useMemo } from 'react';

import { gridNavigationService } from '@domains/grid';
import { useStorageStore } from '@domains/storage';
import { useConfigurationSync } from '@domains/storage/hooks/useConfigurationSync';
import { StorageNavigator } from '@domains/storage/ui/components/storage-navigator';
import { useTubeStore , TubeInfoPanel } from '@domains/tubes';
import { useTubesByLocation } from '@domains/tubes/hooks';
import { useBulkDeleteTubesMutation, usePasteTubesMutation } from '@domains/tubes/hooks/useTubeMutations';
import { TubeGrid } from '@domains/tubes/ui/components/grid/TubeGrid';
import { BatchTubeEditorModal } from '@domains/tubes/ui/components/modals/BatchTubeEditorModal';
import { DeleteConfirmDialog } from '@domains/tubes/ui/components/modals/DeleteConfirmDialog';
import { OverwriteConfirmDialog } from '@domains/tubes/ui/components/modals/OverwriteConfirmDialog';
import { TubeEditorModal } from '@domains/tubes/ui/components/modals/TubeEditorModal';
import { parsePositionKey } from '@shared/types/grid';
import { ErrorBoundary, SuspenseBoundary } from '@shared/ui';
import { ModalSkeleton } from '@shared/ui/components/loading/LoadingSkeletons';
import { notifications } from '@shared/utils/notifications';

import { useGridController } from '../../hooks/grid';
import { useModalStore } from '../../stores/modalStore';

import { AppHeader } from './AppHeader';

import type { StorageHierarchy, SelectedLocation } from '@domains/storage/ui/components/storage-navigator';
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

  // ARCHITECTURAL IMPROVEMENT: Only UI state from TubeStore, React Query handles data
  const {
    currentTank,
    currentRack,
    currentBox,
    selectedPositions,
    setSelection,
    clearSelection
  } = useTubeStore(); // Only UI state, server data handled by React Query in components

  // Server state from React Query for selection analysis
  const { data: tubes = [] } = useTubesByLocation(currentTank, currentRack, currentBox);
  
  // Socket connection is now managed centrally by AppBootstrapService
  // Real-time updates are handled automatically via Socket → Query Cache Bridge
  // No manual socket management needed in components

  // React Query mutations for server operations
  const bulkDeleteTubesMutation = useBulkDeleteTubesMutation();
  const pasteTubesMutation = usePasteTubesMutation();

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

  const getCurrentTanks = useStorageStore(state => state.getCurrentTanks);
  
  // Get actual tank and rack names for display
  const tanks = getCurrentTanks();
  const currentTankObj = tanks.find(tank => tank.id === currentTank);
  const tankDisplayName = currentTankObj?.name || `Tank ${currentTank}`;
  
  const currentRackObj = currentTankObj?.racks?.find(rack => rack.id === currentRack);
  const rackDisplayName = currentRackObj?.name ?? `Rack ${currentRack}`;
  const modalService = useModalStore();

  const storageHierarchy: StorageHierarchy = useMemo(() => ({
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
            position: box.position!
          }))
      }))
    }))
  }), [tanks]);

  const selectedLocation: SelectedLocation = useMemo(() => ({
    tankId: currentTank,
    rackId: currentRack,
    boxId: currentBox
  }), [currentTank, currentRack, currentBox]);

  const handleStorageNavigationSelect = async (location: SelectedLocation) => {
    if (!location.tankId || !location.rackId || !location.boxId) {
      console.error('Invalid location: missing required fields', location);
      return;
    }

    const result = await gridNavigationService.navigateToLocation({
      tankId: location.tankId,
      rackId: location.rackId,
      boxId: location.boxId
    });

    if (!result.success) {
      console.error('Navigation failed:', result.error);
      notifications.error(`Navigation failed: ${result.error}`);
    }
  };

  /**
   * Unified Add Tube Handler
   * Opens modal in 'add' mode with position keys
   */
  const handleAddTube = (positions?: PositionKey[]) => {
    // Use provided position keys or current selection
    const positionKeys = positions || Array.from(selectedPositions || []);

    if (positionKeys.length === 0) return;

    modalService.showTubeEditorModal({
      mode: 'add',
      positions: positionKeys,
      rackId: currentRack,
      boxId: currentBox,
      preserveSelection: positionKeys.length > 1  // Preserve multi-selection for batch adds
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
      console.warn('[Dashboard] handleEditTube called with invalid input:', input);
      return;
    }

    modalService.showTubeEditorModal({
      mode: 'edit',
      tubeId
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
      .map(item => typeof item === 'string' ? item : item.id)
      .filter((id): id is string => Boolean(id));

    if (tubeIds.length === 0) {
      console.warn('[Dashboard] Batch edit requested but no valid tube IDs found:', inputs);
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
      preserveSelection: true  // Maintain multi-selection after batch operation
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
        totalSelected: 0
      };
    }

    const selectedTubes = Array.from(selectedPositions || [])
      .map(key => {
        const { tankId, rackId, boxId, position } = parsePositionKey(key);
        return tubes.find(t =>
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
        return !tubes.find(t =>
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
        return tubes.find(t =>
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
      totalSelected: selectedPositions.size
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
        notifications.success(`Successfully deleted ${tubeIds.length} tube${tubeIds.length > 1 ? 's' : ''}`);
      }
    },
    onPasteTubes: async (tubes) => {
      await pasteTubesMutation.mutateAsync({ tubes });
    }
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
            selection: gridController.selection
          }}
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
              <h4>{tankDisplayName} • {rackDisplayName} • Box {currentBox}</h4>
            </div>
            <div className="grid-container" ref={gridContainerRef}>
              <ErrorBoundary>
                <TubeGrid
                  tankId={currentTank}
                  rackId={currentRack}
                  boxId={currentBox}
                  selectedPositions={isStorageNavigatorFocused() || isSelectorActive ? new Set() : selectedPositions}
                  onSelectionChange={handleSelectionChange}
                  onEditTube={handleEditTube}
                  onBatchEditTubes={handleBatchEditTubes}
                  onAddTubes={handleAddTube}
                  gridController={gridController}
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
              />
            </div>
          </div>
        </div>
      </div>

      {/* Unified Tube Modal - Rendered based on modalStore state */}
      {modalService.tubeEditorModal.isOpen && modalService.tubeEditorModal.mode === 'add' && (
        <SuspenseBoundary
          fallback={<ModalSkeleton size="lg" />}
          name="TubeEditorModal"
        >
          <TubeEditorModal
            rackId={modalService.tubeEditorModal.rackId || currentRack}
            boxId={modalService.tubeEditorModal.boxId || currentBox}
            onClose={handleCloseModal}
            selectedPositions={new Set(modalService.tubeEditorModal.positions || [])}
          />
        </SuspenseBoundary>
      )}

      {modalService.tubeEditorModal.isOpen && modalService.tubeEditorModal.mode === 'edit' && (
        <SuspenseBoundary
          fallback={<ModalSkeleton size="lg" />}
          name="TubeEditorModal"
        >
          <TubeEditorModal
            tubeId={modalService.tubeEditorModal.tubeId}
            onClose={handleCloseModal}
          />
        </SuspenseBoundary>
      )}

      {modalService.tubeEditorModal.isOpen && modalService.tubeEditorModal.mode === 'batch' && modalService.tubeEditorModal.tubeIds && (() => {
        // Resolve tube IDs to tube objects for BatchEditModal
        const resolvedTubes = modalService.tubeEditorModal.tubeIds!
          .map(id => tubes.find(t => t.id === id))
          .filter((tube): tube is TubeData => tube !== undefined);

        return (
          <SuspenseBoundary
            fallback={<ModalSkeleton size="lg" />}
            name="BatchTubeEditorModal"
          >
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
    </div>
  );
}
