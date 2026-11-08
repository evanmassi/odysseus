import { useEffect, useRef, useState } from 'react';

import { useUpdateBlock } from '../../../../hooks/useUpdateBlock';

import type { MaterialItem, MaterialsBlock } from '@odysseus/shared-schemas';

export interface RemovedMaterial {
  item: MaterialItem;
  isFromDropped: boolean;
  verb: 'Dropped' | 'Removed';
  placeIndex: number;
  index: number;
}

const UNDO_WINDOW_MS = 8000;

const groupPeers = (items: readonly MaterialItem[], item: MaterialItem) =>
  items.filter(other => other.group === item.group && !other.isDropped);

export function useMaterialRemoval(block: MaterialsBlock, onRestored: (id: string) => void) {
  const updateBlock = useUpdateBlock(block);
  const [removed, setRemoved] = useState<RemovedMaterial>();
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  const leaveUndo = (entry: RemovedMaterial) => {
    clearTimeout(timer.current);
    setRemoved(entry);
    timer.current = setTimeout(() => setRemoved(undefined), UNDO_WINDOW_MS);
  };

  const drop = (item: MaterialItem) => {
    leaveUndo({
      item,
      isFromDropped: false,
      verb: 'Dropped',
      placeIndex: groupPeers(block.items, item).indexOf(item),
      index: block.items.indexOf(item),
    });
    updateBlock(draft => {
      const target = draft.items.find(candidate => candidate.id === item.id);
      if (target) target.isDropped = true;
    });
  };

  const remove = (item: MaterialItem) => {
    const peers = item.isDropped
      ? block.items.filter(other => other.isDropped)
      : groupPeers(block.items, item);
    leaveUndo({
      item,
      isFromDropped: item.isDropped,
      verb: 'Removed',
      placeIndex: peers.indexOf(item),
      index: block.items.indexOf(item),
    });
    updateBlock(draft => {
      draft.items = draft.items.filter(candidate => candidate.id !== item.id);
    });
  };

  const restoreDropped = (item: MaterialItem) => {
    updateBlock(draft => {
      const target = draft.items.find(candidate => candidate.id === item.id);
      if (target) target.isDropped = false;
    });
    onRestored(item.id);
  };

  const undo = () => {
    if (!removed) return;
    clearTimeout(timer.current);
    setRemoved(undefined);
    updateBlock(draft => {
      if (removed.verb === 'Dropped') {
        const target = draft.items.find(candidate => candidate.id === removed.item.id);
        if (target) target.isDropped = false;
      } else {
        draft.items.splice(Math.min(removed.index, draft.items.length), 0, removed.item);
      }
    });
  };

  return { removed, drop, remove, restoreDropped, undo };
}
