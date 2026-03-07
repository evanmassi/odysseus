/**
 * Tree Lines By Location
 *
 * Draws SVG connecting lines for tank → rack → box hierarchy.
 * Used by StorageNavigator and the By Location tab of StorageManagerModal.
 */

import { useCallback } from 'react';

import { TreeLinesDisplay } from './TreeLinesDisplay';
import { useTreeLines, LINE_OFFSET, VERTICAL_OFFSET, type TreeLine } from './useTreeLines';

interface TreeLinesByLocationProps {
  expandedTanks: Set<string>;
  expandedRacks: Set<string>;
  treeId?: string;
}

export function TreeLinesByLocation({
  expandedTanks,
  expandedRacks,
  treeId,
}: TreeLinesByLocationProps) {
  const calculateLines = useCallback(() => {
    const selector = treeId ? `[role="tree"][data-tree-id="${treeId}"]` : '[role="tree"]';
    const container = document.querySelector(selector);
    if (!container) return { container: null, lines: [] };

    const containerRect = container.getBoundingClientRect();
    const allLines: TreeLine[] = [];

    const tankItems = container.querySelectorAll('[data-level="tank"]');

    tankItems.forEach(tankItem => {
      const tankId = (tankItem as HTMLElement).dataset['id'];
      if (!tankId || !expandedTanks.has(tankId)) return;

      const tankButton = tankItem.querySelector('button');
      if (!tankButton) return;

      const tankRect = tankButton.getBoundingClientRect();
      const tankX = tankRect.left - containerRect.left + LINE_OFFSET;
      const tankBottomY = tankRect.bottom - containerRect.top - 2;

      const rackItems = tankItem.querySelectorAll('[data-level="rack"]');
      let lastRackY = tankBottomY;

      rackItems.forEach(rackItem => {
        const rackId = (rackItem as HTMLElement).dataset['id'];
        if (!rackId) return;

        const rackButton = rackItem.querySelector('button');
        if (!rackButton) return;

        const rackRect = rackButton.getBoundingClientRect();
        const rackX = rackRect.left - containerRect.left + LINE_OFFSET;
        const rackY = rackRect.top - containerRect.top + rackRect.height / 2 + VERTICAL_OFFSET;

        lastRackY = rackY;

        allLines.push({
          id: `rack-branch-${tankId}-${rackId}`,
          x1: tankX,
          y1: rackY,
          x2: rackX,
          y2: rackY,
          strokeWidth: 1.5,
          type: 'rack-branch',
        });

        const compositeKey = `${tankId}-${rackId}`;
        if (expandedRacks.has(compositeKey)) {
          const boxItems = rackItem.querySelectorAll('[data-level="box"]');
          let lastBoxY = rackRect.bottom - containerRect.top;

          boxItems.forEach(boxItem => {
            const boxButton = boxItem.querySelector('button');
            if (!boxButton) return;

            const boxRect = boxButton.getBoundingClientRect();
            const boxX = boxRect.left - containerRect.left + LINE_OFFSET;
            const boxY = boxRect.top - containerRect.top + boxRect.height / 2 + VERTICAL_OFFSET;

            lastBoxY = boxY;

            allLines.push({
              id: `box-branch-${tankId}-${rackId}-${(boxItem as HTMLElement).dataset['id']}`,
              x1: rackX,
              y1: boxY,
              x2: boxX,
              y2: boxY,
              strokeWidth: 1.5,
              type: 'box-branch',
            });
          });

          if (boxItems.length > 0) {
            allLines.push({
              id: `rack-vertical-${tankId}-${rackId}`,
              x1: rackX,
              y1: rackRect.bottom - containerRect.top - 2,
              x2: rackX,
              y2: lastBoxY,
              strokeWidth: 1.5,
              type: 'rack-vertical',
            });
          }
        }
      });

      if (rackItems.length > 0) {
        allLines.push({
          id: `tank-vertical-${tankId}`,
          x1: tankX,
          y1: tankBottomY,
          x2: tankX,
          y2: lastRackY,
          strokeWidth: 1.5,
          type: 'tank-vertical',
        });
      }
    });

    return { container, lines: allLines };
  }, [expandedTanks, expandedRacks, treeId]);

  const lines = useTreeLines(calculateLines);

  return <TreeLinesDisplay lines={lines} />;
}
