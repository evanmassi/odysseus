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
