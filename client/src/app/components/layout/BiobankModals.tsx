/**
 * Biobank Modals
 *
 * Mounts the biobank workspace's modal stack (tube editor, confirms, lock/share),
 * driven by the modal store.
 */

import { useMemo } from 'react';

import { useModalStore } from '@app/stores/modalStore';
import {
  TubeBulkEditorModal,
  TubeEditorModal,
  TubeLockModal,
  TubeShareAccessModal,
} from '@domains/tubes';
import { LazyModalBoundary } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { UnsavedConfirmDialog } from '@shared/ui/components/overlays/UnsavedConfirmDialog';

import type { TubeData } from '@odysseus/shared-schemas';

interface BiobankModalsProps {
  currentRack: string;
  currentBox: string;
  currentUserId?: string;
  tubes: TubeData[];
}

export function BiobankModals({
  currentRack,
  currentBox,
  currentUserId,
  tubes,
}: BiobankModalsProps) {
  const modalService = useModalStore();

  const modalPositionsSet = useMemo(
    () => new Set(modalService.tubeEditorModal.positions ?? []),
    [modalService.tubeEditorModal.positions]
  );

  const handleCloseModal = () => {
    modalService.hideTubeEditorModal();
  };

  return (
    <>
      {modalService.tubeEditorModal.isOpen && modalService.tubeEditorModal.mode === 'add' && (
        <LazyModalBoundary name="TubeEditorModal-Add">
          <TubeEditorModal
            isOpen
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading fallback: use modal's ID or current location
            rackId={modalService.tubeEditorModal.rackId || currentRack}
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading fallback: use modal's ID or current location
            boxId={modalService.tubeEditorModal.boxId || currentBox}
            onClose={handleCloseModal}
            selectedPositions={modalPositionsSet}
          />
        </LazyModalBoundary>
      )}

      {modalService.tubeEditorModal.isOpen && modalService.tubeEditorModal.mode === 'edit' && (
        <LazyModalBoundary name="TubeEditorModal-Edit">
          <TubeEditorModal
            isOpen
            tubeId={modalService.tubeEditorModal.tubeId}
            onClose={handleCloseModal}
          />
        </LazyModalBoundary>
      )}

      {modalService.tubeEditorModal.isOpen &&
        modalService.tubeEditorModal.mode === 'bulk' &&
        (modalService.tubeEditorModal.tubeIds ?? []).length > 0 && (
          <LazyModalBoundary name="TubeBulkEditorModal">
            <TubeBulkEditorModal
              isOpen
              tubeIds={modalService.tubeEditorModal.tubeIds ?? []}
              onClose={handleCloseModal}
            />
          </LazyModalBoundary>
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
        isOpen={modalService.shareAccessModal.isOpen && !!currentUserId}
        tubes={modalService.shareAccessModal.tubeIds
          .map(id => tubes.find(t => t.id === id))
          .filter((t): t is TubeData => t !== undefined)}
        currentUserId={currentUserId ?? ''}
        onClose={modalService.hideShareAccessModal}
      />
    </>
  );
}
