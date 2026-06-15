/**
 * Tree Lines By Location
 *
 * Draws SVG connecting lines for tank → rack → box hierarchy.
 * Used by StorageNavigator and the By Location tab of StorageManagerModal.
 */

import { useCallback } from 'react';

import {
  calculateTreeLines,
  TreeLinesDisplay,
  useTreeLines,
} from '@shared/ui/components/tree-lines';

interface TreeLinesByLocationProps {
  expandedTanks: Set<string>;
  expandedRacks: Set<string>;
  treeId?: string;
  initialDelay?: number;
  lineOffset?: number;
}

export function TreeLinesByLocation({
  expandedTanks,
  expandedRacks,
  treeId,
  initialDelay,
  lineOffset,
}: TreeLinesByLocationProps) {
  const calculate = useCallback(
    () =>
      calculateTreeLines({
        containerSelector: treeId ? `[role="tree"][data-tree-id="${treeId}"]` : '[role="tree"]',
        topLevelAttr: 'tank',
        isTopExpanded: id => expandedTanks.has(id),
        isRackExpanded: (tankId, rackId) => expandedRacks.has(`${tankId}-${rackId}`),
        lineOffset,
      }),
    [expandedTanks, expandedRacks, treeId, lineOffset]
  );

  const lines = useTreeLines(calculate, initialDelay ? { initialDelay } : undefined);

  return <TreeLinesDisplay lines={lines} />;
}
