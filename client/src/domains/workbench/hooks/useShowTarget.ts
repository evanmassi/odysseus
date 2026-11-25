import { useCallback } from 'react';

import { useWorkbenchStore } from '../stores/workbenchStore';
import { cardShowing, openCard, type CardTarget } from '../utils/cards/createCard';

import { useShowCard } from './useShowCard';

export function useShowTarget(): (target: CardTarget) => void {
  const showCard = useShowCard();
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  return useCallback(
    (target: CardTarget) => {
      const { protocol, activePageId } = useWorkbenchStore.getState();
      const shown = cardShowing(protocol, target, activePageId);
      if (shown) return showCard(shown.id);
      let openedId = '';
      updateProtocol(draft => {
        openedId = openCard(draft, target, activePageId).id;
      });
      showCard(openedId, { isNew: true });
    },
    [showCard, updateProtocol]
  );
}
