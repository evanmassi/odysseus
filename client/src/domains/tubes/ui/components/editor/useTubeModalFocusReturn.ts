/**
 * Tube Modal Focus Return
 *
 * Restores focus to the previously focused element when tube modals unmount.
 */

import { useState, useEffect } from 'react';

import { useModalStore } from '@app/stores/modalStore';

/** Bulk operations set preserveSelection to skip focus return, avoiding clearing grid selection. */
export function useTubeModalFocusReturn() {
  const modalService = useModalStore();

  // Capture both on mount: a later store update to previousFocusElement must not retrigger this
  // cleanup and steal focus out from behind the still-open modal.
  const [shouldPreserveSelection] = useState(modalService.tubeEditorModal.preserveSelection);
  const [previousFocus] = useState(modalService.tubeEditorModal.previousFocusElement);

  useEffect(() => {
    return () => {
      if (shouldPreserveSelection) {
        return;
      }

      if (previousFocus && typeof previousFocus.focus === 'function') {
        setTimeout(() => {
          previousFocus.focus();
        }, 0);
      }
    };
  }, [shouldPreserveSelection, previousFocus]);
}
