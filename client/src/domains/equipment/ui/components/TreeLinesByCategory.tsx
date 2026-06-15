/**
 * Equipment Tree Lines
 *
 * Draws SVG connecting lines for the category → subcategory → item tree. Tiers are
 * keyed by depth (l1/l2/l3) so an item draws whether it sits directly under a
 * category or under a subcategory.
 */

import { useCallback } from 'react';

import {
  calculateTreeLines,
  TreeLinesDisplay,
  useTreeLines,
} from '@shared/ui/components/tree-lines';

interface TreeLinesByCategoryProps {
  expandedCategoryIds: Set<string>;
}

export function TreeLinesByCategory({ expandedCategoryIds }: TreeLinesByCategoryProps) {
  const calculate = useCallback(
    () =>
      calculateTreeLines({
        containerSelector: '[data-tree-id="equipment"]',
        topLevelAttr: 'l1',
        midLevelAttr: 'l2',
        leafLevelAttr: 'l3',
        rowSelector: '.equip-nav-row',
        leafRowSelector: '.equip-nav-row',
        lineOffset: 2,
        isTopExpanded: id => expandedCategoryIds.has(id),
      }),
    [expandedCategoryIds]
  );

  const lines = useTreeLines(calculate);

  return <TreeLinesDisplay lines={lines} />;
}
