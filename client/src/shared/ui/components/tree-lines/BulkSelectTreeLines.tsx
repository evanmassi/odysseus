/**
 * Bulk Select Tree Lines
 *
 * Draws the SVG connectors for a `.nav-tree-select` bulk-update selector. All
 * containers are always expanded, so every depth tier (l1/l2/l3) draws.
 */

import { useCallback } from 'react';

import { calculateTreeLines } from './calculateTreeLines';
import { TreeLinesDisplay } from './TreeLinesDisplay';
import { useTreeLines } from './useTreeLines';

export function BulkSelectTreeLines() {
  const calculate = useCallback(
    () =>
      calculateTreeLines({
        containerSelector: '[data-tree-id="bulk-select"]',
        topLevelAttr: 'l1',
        midLevelAttr: 'l2',
        leafLevelAttr: 'l3',
        rowSelector: '.bulk-select-row',
        leafRowSelector: '.bulk-select-row',
        lineOffset: 2,
        isTopExpanded: () => true,
      }),
    []
  );

  const lines = useTreeLines(calculate);

  return <TreeLinesDisplay lines={lines} />;
}
