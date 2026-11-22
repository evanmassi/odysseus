import { useCallback } from 'react';

import { useWorkbenchStore } from '../../../../stores/workbenchStore';

import type { ProtocolPage } from '@odysseus/shared-schemas';

export function useUpdateStepPage(pageId: string) {
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  return useCallback(
    (recipe: (page: ProtocolPage) => void) =>
      updateProtocol(draft => {
        const page = draft.pages.find(candidate => candidate.id === pageId);
        if (page) recipe(page);
      }),
    [pageId, updateProtocol]
  );
}
