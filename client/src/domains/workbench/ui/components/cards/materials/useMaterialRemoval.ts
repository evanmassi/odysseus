import { useEffect, useRef, useState } from 'react';

import { useUpdateCard } from '../../../../hooks/useUpdateCard';

import type { MaterialItem, MaterialsCard } from '@odysseus/shared-schemas';

export interface RemovedMaterial {
  item: MaterialItem;
  isFromSetAside: boolean;
  verb: 'Set aside' | 'Removed';
  placeIndex: number;
  index: number;
}

const UNDO_WINDOW_MS = 8000;

const groupPeers = (items: readonly MaterialItem[], item: MaterialItem) =>
  items.filter(other => other.group === item.group && !other.isDropped);

export function useMaterialRemoval(card: MaterialsCard, onRestored: (id: string) => void) {
  const updateCard = useUpdateCard(card);
  const [removed, setRemoved] = useState<RemovedMaterial>();
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  const leaveUndo = (entry: RemovedMaterial) => {
    clearTimeout(timer.current);
    setRemoved(entry);
    timer.current = setTimeout(() => setRemoved(undefined), UNDO_WINDOW_MS);
  };

  const setAside = (item: MaterialItem) => {
    leaveUndo({
      item,
      isFromSetAside: false,
      verb: 'Set aside',
      placeIndex: groupPeers(card.items, item).indexOf(item),
      index: card.items.indexOf(item),
    });
    updateCard(draft => {
      const target = draft.items.find(candidate => candidate.id === item.id);
      if (target) target.isDropped = true;
    });
  };

  const remove = (item: MaterialItem) => {
    const peers = item.isDropped
      ? card.items.filter(other => other.isDropped)
      : groupPeers(card.items, item);
    leaveUndo({
      item,
      isFromSetAside: item.isDropped,
      verb: 'Removed',
      placeIndex: peers.indexOf(item),
      index: card.items.indexOf(item),
    });
    updateCard(draft => {
      draft.items = draft.items.filter(candidate => candidate.id !== item.id);
    });
  };

  const restoreSetAside = (item: MaterialItem) => {
    updateCard(draft => {
      const target = draft.items.find(candidate => candidate.id === item.id);
      if (target) target.isDropped = false;
    });
    onRestored(item.id);
  };

  const undo = () => {
    if (!removed) return;
    clearTimeout(timer.current);
    setRemoved(undefined);
    updateCard(draft => {
      if (removed.verb === 'Set aside') {
        const target = draft.items.find(candidate => candidate.id === removed.item.id);
        if (target) target.isDropped = false;
      } else {
        draft.items.splice(Math.min(removed.index, draft.items.length), 0, removed.item);
      }
    });
  };

  return { removed, setAside, remove, restoreSetAside, undo };
}
