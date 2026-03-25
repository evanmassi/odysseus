/**
 * Tree Lines By Location
 *
 * Draws SVG connecting lines for tank → rack → box hierarchy.
 * Used by StorageNavigator and the By Location tab of StorageManagerModal.
 */

import { useCallback } from 'react';

import { calculateTreeLines } from './calculateTreeLines';
import { TreeLinesDisplay } from './TreeLinesDisplay';
import { useTreeLines } from './useTreeLines';

interface TreeLinesByLocationProps {
  expandedTanks: Set<string>;
  expandedRacks: Set<string>;
  treeId?: string;
  initialDelay?: number;
}

export function TreeLinesByLocation({
  expandedTanks,
  expandedRacks,
  treeId,
  initialDelay,
}: TreeLinesByLocationProps) {
  const calculate = useCallback(
    () =>
      calculateTreeLines({
        containerSelector: treeId ? `[role="tree"][data-tree-id="${treeId}"]` : '[role="tree"]',
        topLevelAttr: 'tank',
        isTopExpanded: id => expandedTanks.has(id),
        isRackExpanded: (tankId, rackId) => expandedRacks.has(`${tankId}-${rackId}`),
      }),
    [expandedTanks, expandedRacks, treeId]
  );

  const lines = useTreeLines(calculate, initialDelay ? { initialDelay } : undefined);

  return <TreeLinesDisplay lines={lines} />;
}
