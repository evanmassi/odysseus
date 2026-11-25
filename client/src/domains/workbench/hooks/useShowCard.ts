import { useCallback } from 'react';

import { useWorkbenchStore } from '../stores/workbenchStore';
import { flashFresh } from '../utils/dom/freshFlash';

export const CARD_ID_ATTRIBUTE = 'data-card-id';
export const CARD_SURFACE_ATTRIBUTE = 'data-card-surface';

interface ShowCardOptions {
  isNew?: boolean;
  addedFrom?: Element;
}

const MOST_FRAMES_TO_APPEAR = 60;

const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));

// PITFALL: the grid draws a new card only once its own copy of the layout has caught up, a frame or more after the change, then eases it into place.
async function placedCard(cardId: string): Promise<Element | undefined> {
  for (let frame = 0; frame < MOST_FRAMES_TO_APPEAR; frame++) {
    await nextFrame();
    const element = document.querySelector(`[${CARD_ID_ATTRIBUTE}="${cardId}"]`);
    if (!element) continue;
    await nextFrame();
    await Promise.all(
      element.getAnimations().map(animation => animation.finished.catch(() => undefined))
    );
    return element;
  }
  return undefined;
}

export function useShowCard(): (cardId: string, options?: ShowCardOptions) => void {
  const showPage = useWorkbenchStore(state => state.showPage);
  return useCallback(
    (cardId: string, { isNew = false, addedFrom }: ShowCardOptions = {}) => {
      const card = useWorkbenchStore
        .getState()
        .protocol.cards.find(candidate => candidate.id === cardId);
      if (!card) return;
      showPage(card.page);
      void placedCard(cardId).then(element => {
        if (!element) return;
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        if (!isNew) return;
        flashFresh(element.querySelector(`[${CARD_SURFACE_ATTRIBUTE}]`));
        flashFresh(addedFrom);
      });
    },
    [showPage]
  );
}
