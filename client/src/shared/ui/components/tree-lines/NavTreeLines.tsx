import { useCallback } from 'react';

import { calculateTreeLines } from './calculateTreeLines';
import { TreeLinesDisplay } from './TreeLinesDisplay';
import { useTreeLines } from './useTreeLines';

interface NavTreeLinesProps {
  treeId: string;
  expandedCategoryIds: Set<string>;
}

export function NavTreeLines({ treeId, expandedCategoryIds }: NavTreeLinesProps) {
  const calculate = useCallback(
    () =>
      calculateTreeLines({
        containerSelector: `[data-tree-id="${treeId}"]`,
        topLevelAttr: 'l1',
        midLevelAttr: 'l2',
        leafLevelAttr: 'l3',
        rowSelector: '.nav-tree-row',
        leafRowSelector: '.nav-tree-row',
        isTopExpanded: id => expandedCategoryIds.has(id),
      }),
    [treeId, expandedCategoryIds]
  );

  const lines = useTreeLines(calculate);

  return <TreeLinesDisplay lines={lines} />;
}
