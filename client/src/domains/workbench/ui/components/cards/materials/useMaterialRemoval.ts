import { useEffect, useRef, useState } from 'react';

import { useWorkbenchStore } from '../../../../stores/workbenchStore';

import type { MaterialItem, ProtocolMaterials } from '@odysseus/shared-schemas';

export interface RemovedMaterial {
  item: MaterialItem;
  isFromSetAside: boolean;
  verb: 'Set aside' | 'Removed';
  placeIndex: number;
  index: number;
}

const UNDO_WINDOW_MS = 8000;

const groupPeers = (items: readonly MaterialItem[], item: MaterialItem) =>
  items.filter(other => other.group === item.group && !other.isSetAside);

export function useMaterialRemoval(onRestored: (id: string) => void) {
  const items = useWorkbenchStore(state => state.protocol.materials.items);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const updateMaterials = (recipe: (materials: ProtocolMaterials) => void) =>
    updateProtocol(draft => recipe(draft.materials));
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
      placeIndex: groupPeers(items, item).indexOf(item),
      index: items.indexOf(item),
    });
    updateMaterials(draft => {
      const target = draft.items.find(candidate => candidate.id === item.id);
      if (target) target.isSetAside = true;
    });
  };

  const remove = (item: MaterialItem) => {
    const peers = item.isSetAside
      ? items.filter(other => other.isSetAside)
      : groupPeers(items, item);
    leaveUndo({
      item,
      isFromSetAside: item.isSetAside,
      verb: 'Removed',
      placeIndex: peers.indexOf(item),
      index: items.indexOf(item),
    });
    updateMaterials(draft => {
      draft.items = draft.items.filter(candidate => candidate.id !== item.id);
    });
  };

  const restoreSetAside = (item: MaterialItem) => {
    updateMaterials(draft => {
      const target = draft.items.find(candidate => candidate.id === item.id);
      if (target) target.isSetAside = false;
    });
    onRestored(item.id);
  };

  const undo = () => {
    if (!removed) return;
    clearTimeout(timer.current);
    setRemoved(undefined);
    updateMaterials(draft => {
      if (removed.verb === 'Set aside') {
        const target = draft.items.find(candidate => candidate.id === removed.item.id);
        if (target) target.isSetAside = false;
      } else {
        draft.items.splice(Math.min(removed.index, draft.items.length), 0, removed.item);
      }
    });
  };

  return { removed, setAside, remove, restoreSetAside, undo };
}
