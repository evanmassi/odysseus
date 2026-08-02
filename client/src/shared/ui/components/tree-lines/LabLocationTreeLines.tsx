/**
 * Lab Location Tree Lines
 *
 * Draws the SVG connectors for the lab location tree. Every tier is always expanded, so
 * l1/l2/l3 all draw.
 */

import { useCallback } from 'react';

import { calculateTreeLines } from './calculateTreeLines';
import { TreeLinesDisplay } from './TreeLinesDisplay';
import { useTreeLines } from './useTreeLines';

export function LabLocationTreeLines() {
  const calculate = useCallback(
    () =>
      calculateTreeLines({
        containerSelector: '[data-tree-id="lab-location"]',
        topLevelAttr: 'l1',
        midLevelAttr: 'l2',
        leafLevelAttr: 'l3',
        rowSelector: '.lab-location-row',
        leafRowSelector: '.lab-location-row',
        lineOffset: 2,
        isTopExpanded: () => true,
      }),
    []
  );

  // Wait out the modal entrance animation before measuring, else lines land mid-transform.
  const lines = useTreeLines(calculate, { initialDelay: 450 });

  return <TreeLinesDisplay lines={lines} />;
}
