/**
 * Tree Line Overlay (By User)
 *
 * Draws SVG connecting lines for user → rack → box hierarchy
 * in the By User tab of the Storage Manager modal.
 */

import { useCallback } from 'react';

import { TreeLineSvg } from '../storage-navigator/TreeLineSvg';
import {
  useTreeLines,
  LINE_OFFSET,
  VERTICAL_OFFSET,
  type TreeLine,
} from '../storage-navigator/useTreeLines';

interface TreeLineOverlayByUserProps {
  expandedUsers: Set<string | null>;
}

export function TreeLineOverlayByUser({ expandedUsers }: TreeLineOverlayByUserProps) {
  const calculateLines = useCallback(() => {
    const container = document.querySelector('[role="tree"][data-view="by-user"]');
    if (!container) return { container: null, lines: [] };

    const containerRect = container.getBoundingClientRect();
    const allLines: TreeLine[] = [];

    const userItems = container.querySelectorAll('[data-level="user"]');

    userItems.forEach(userItem => {
      const userId = (userItem as HTMLElement).dataset['id'] ?? 'unassigned';
      // null for unassigned, string for others — matches expandedUsers format
      const expandKey = userId === 'unassigned' ? null : userId;
      if (!expandedUsers.has(expandKey)) return;

      const userButton = userItem.querySelector('button');
      if (!userButton) return;

      const userRect = userButton.getBoundingClientRect();
      const userX = userRect.left - containerRect.left + LINE_OFFSET;
      const userBottomY = userRect.bottom - containerRect.top - 2;

      const rackItems = userItem.querySelectorAll('[data-level="rack"]');
      let lastRackY = userBottomY;

      rackItems.forEach(rackItem => {
        const rackButton = rackItem.querySelector('button');
        if (!rackButton) return;

        const rackRect = rackButton.getBoundingClientRect();
        const rackX = rackRect.left - containerRect.left + LINE_OFFSET;
        const rackY = rackRect.top - containerRect.top + rackRect.height / 2 + VERTICAL_OFFSET;

        lastRackY = rackY;

        allLines.push({
          id: `rack-branch-${userId}-${(rackItem as HTMLElement).dataset['id']}`,
          x1: userX,
          y1: rackY,
          x2: rackX,
          y2: rackY,
          strokeWidth: 1.5,
          type: 'rack-branch',
        });

        const boxItems = rackItem.querySelectorAll('[data-level="box"]');
        let lastBoxY = rackRect.bottom - containerRect.top;

        boxItems.forEach(boxItem => {
          const boxButton = boxItem.querySelector('button, [role="listitem"]');
          if (!boxButton) return;

          const boxRect = boxButton.getBoundingClientRect();
          const boxX = boxRect.left - containerRect.left + LINE_OFFSET;
          const boxY = boxRect.top - containerRect.top + boxRect.height / 2 + VERTICAL_OFFSET;

          lastBoxY = boxY;

          allLines.push({
            id: `box-branch-${userId}-${(rackItem as HTMLElement).dataset['id']}-${(boxItem as HTMLElement).dataset['id']}`,
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
            id: `rack-vertical-${userId}-${(rackItem as HTMLElement).dataset['id']}`,
            x1: rackX,
            y1: rackRect.bottom - containerRect.top - 2,
            x2: rackX,
            y2: lastBoxY,
            strokeWidth: 1.5,
            type: 'rack-vertical',
          });
        }
      });

      if (rackItems.length > 0) {
        allLines.push({
          id: `user-vertical-${userId}`,
          x1: userX,
          y1: userBottomY,
          x2: userX,
          y2: lastRackY,
          strokeWidth: 1.5,
          type: 'user-vertical',
        });
      }
    });

    return { container, lines: allLines };
  }, [expandedUsers]);

  const lines = useTreeLines(calculateLines);

  return <TreeLineSvg lines={lines} />;
}
