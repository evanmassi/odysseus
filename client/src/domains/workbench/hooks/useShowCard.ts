import { useCallback } from 'react';

import { useWorkbenchStore } from '../stores/workbenchStore';

export const CARD_ID_ATTRIBUTE = 'data-card-id';

export function useShowCard(): (cardId: string) => void {
  const showPage = useWorkbenchStore(state => state.showPage);
  return useCallback(
    (cardId: string) => {
      const card = useWorkbenchStore
        .getState()
        .protocol.cards.find(candidate => candidate.id === cardId);
      if (!card) return;
      showPage(card.page);
      requestAnimationFrame(() =>
        document
          .querySelector(`[${CARD_ID_ATTRIBUTE}="${cardId}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      );
    },
    [showPage]
  );
}
