/**
 * Select Tree Lines
 *
 * Draws the SVG connectors for a `.nav-tree-select` tree.
 */

import { useCallback } from 'react';

import { calculateTreeLines } from './calculateTreeLines';
import { TreeLinesDisplay } from './TreeLinesDisplay';
import { useTreeLines } from './useTreeLines';

const ROW_SELECTOR = '.select-tree-row';

interface SelectTreeLinesProps {
  treeId: string;
}

export function SelectTreeLines({ treeId }: SelectTreeLinesProps) {
  const calculate = useCallback(
    () =>
      calculateTreeLines({
        containerSelector: `[data-tree-id="${treeId}"]`,
        topLevelAttr: 'l1',
        midLevelAttr: 'l2',
        leafLevelAttr: 'l3',
        rowSelector: ROW_SELECTOR,
        leafRowSelector: ROW_SELECTOR,
        lineOffset: 2,
        isTopExpanded: () => true,
      }),
    [treeId]
  );

  // Wait out the modal entrance animation before measuring, else lines land mid-transform.
  const lines = useTreeLines(calculate, { initialDelay: 450 });

  return <TreeLinesDisplay lines={lines} />;
}
