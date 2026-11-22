import { useCallback } from 'react';

import { useWorkbenchStore } from '../stores/workbenchStore';

import type { ProtocolCard } from '@odysseus/shared-schemas';

export function useUpdateCard<Card extends ProtocolCard>(card: Card) {
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const { id } = card;
  return useCallback(
    (recipe: (draft: Card) => void) =>
      updateProtocol(draft => {
        const target = draft.cards.find(candidate => candidate.id === id);
        if (target) recipe(target as Card);
      }),
    [id, updateProtocol]
  );
}
