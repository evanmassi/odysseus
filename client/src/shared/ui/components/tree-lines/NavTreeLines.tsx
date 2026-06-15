/**
 * Nav Tree Lines
 *
 * Draws the SVG connectors for a `.nav-tree` category → subcategory → item tree.
 * Tiers are keyed by depth (l1/l2/l3) so a leaf draws whether it sits directly
 * under a category or under a subcategory.
 */

import { useCallback } from 'react';

import { calculateTreeLines } from './calculateTreeLines';
import { TreeLinesDisplay } from './TreeLinesDisplay';
import { useTreeLines } from './useTreeLines';

interface NavTreeLinesProps {
  /** `data-tree-id` of the container to walk (e.g. 'equipment', 'supplies'). */
  treeId: string;
  /** Top-level categories the tree currently shows expanded — drives the redraw. */
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
        lineOffset: 2,
        isTopExpanded: id => expandedCategoryIds.has(id),
      }),
    [treeId, expandedCategoryIds]
  );

  const lines = useTreeLines(calculate);

  return <TreeLinesDisplay lines={lines} />;
}
