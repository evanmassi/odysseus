import { useCallback } from 'react';

import { useWorkbenchStore } from '../stores/workbenchStore';

import type { ProtocolBlock } from '@odysseus/shared-schemas';

export function useUpdateBlock<Block extends ProtocolBlock>(block: Block) {
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const { id } = block;
  return useCallback(
    (recipe: (draft: Block) => void) =>
      updateProtocol(draft => {
        const target = draft.blocks.find(candidate => candidate.id === id);
        if (target) recipe(target as Block);
      }),
    [id, updateProtocol]
  );
}
