import { useCallback } from 'react';

import { useWorkbenchStore } from '../stores/workbenchStore';

export const BLOCK_ID_ATTRIBUTE = 'data-block-id';

export function useShowBlock(): (blockId: string) => void {
  const showPage = useWorkbenchStore(state => state.showPage);
  return useCallback(
    (blockId: string) => {
      const block = useWorkbenchStore
        .getState()
        .protocol.blocks.find(candidate => candidate.id === blockId);
      if (!block) return;
      showPage(block.page);
      requestAnimationFrame(() =>
        document
          .querySelector(`[${BLOCK_ID_ATTRIBUTE}="${blockId}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      );
    },
    [showPage]
  );
}
