import { useState, useEffect } from 'react';

import { useModalStore } from '@app/stores/modalStore';

/**
 * Manages focus restoration when tube modals unmount.
 * Returns focus to the previously focused element, unless preserveSelection
 * is enabled (batch operations should not restore focus to avoid clearing selection).
 */
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
