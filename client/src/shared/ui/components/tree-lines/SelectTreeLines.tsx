/**
 * Select Tree Lines
 *
 * Draws the SVG connectors for a `.nav-tree-select` tree whose tiers are always expanded, so
 * every depth (l1/l2/l3) draws. Callers mark their container `data-tree-id={treeId}` and their
 * rows `.{treeId}-row`.
 */

import { useCallback } from 'react';

import { calculateTreeLines } from './calculateTreeLines';
import { TreeLinesDisplay } from './TreeLinesDisplay';
import { useTreeLines } from './useTreeLines';

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
        rowSelector: `.${treeId}-row`,
        leafRowSelector: `.${treeId}-row`,
        lineOffset: 2,
        isTopExpanded: () => true,
      }),
    [treeId]
  );

  // Wait out the modal entrance animation before measuring, else lines land mid-transform.
  const lines = useTreeLines(calculate, { initialDelay: 450 });

  return <TreeLinesDisplay lines={lines} />;
}
