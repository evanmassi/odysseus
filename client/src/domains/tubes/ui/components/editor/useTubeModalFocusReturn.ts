/**
 * Tube Modal Focus Return
 *
 * Restores focus to the previously focused element when tube modals unmount.
 */

import { useState, useEffect } from 'react';

import { useModalStore } from '@app/stores/modalStore';

/** Batch operations set preserveSelection to skip focus return, avoiding clearing grid selection. */
export function useTubeModalFocusReturn() {
  const modalService = useModalStore();

  // Capture preserveSelection on mount to avoid race condition with hideTubeEditorModal
  const [shouldPreserveSelection] = useState(modalService.tubeEditorModal.preserveSelection);

  useEffect(() => {
    return () => {
      if (shouldPreserveSelection) {
        return;
      }

      const previousFocus = modalService.tubeEditorModal.previousFocusElement;
      if (previousFocus && typeof previousFocus.focus === 'function') {
        setTimeout(() => {
          previousFocus.focus();
        }, 0);
      }
    };
  }, [shouldPreserveSelection, modalService.tubeEditorModal.previousFocusElement]);
}
