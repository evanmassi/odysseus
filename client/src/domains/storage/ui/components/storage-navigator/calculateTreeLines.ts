/**
 * Tree Line Calculator
 *
 * Generic DOM-walking algorithm for computing SVG connecting lines
 * in a hierarchical tree. Used by both location and user tree views.
 */

import { LINE_OFFSET, VERTICAL_OFFSET, type TreeLine } from './useTreeLines';

export interface TreeLineCalcConfig {
  containerSelector: string;
  topLevelAttr: string;
  isTopExpanded: (id: string) => boolean;
  isRackExpanded?: (topId: string, rackId: string) => boolean;
  /** Inset of the spine/elbow from each row's left edge. Defaults to LINE_OFFSET. */
  lineOffset?: number;
}

export function calculateTreeLines(config: TreeLineCalcConfig): {
  container: Element | null;
  lines: TreeLine[];
} {
  const container = document.querySelector(config.containerSelector);
  if (!container) return { container: null, lines: [] };

  const containerRect = container.getBoundingClientRect();
  const offset = config.lineOffset ?? LINE_OFFSET;
  const allLines: TreeLine[] = [];

  const topItems = container.querySelectorAll(`[data-level="${config.topLevelAttr}"]`);

  topItems.forEach(topItem => {
    const topId = (topItem as HTMLElement).dataset['id'] ?? 'unassigned';
    if (!config.isTopExpanded(topId)) return;

    const topButton = topItem.querySelector('.storage-nav-button');
    if (!topButton) return;

    const topRect = topButton.getBoundingClientRect();
    const topX = topRect.left - containerRect.left + offset;
    const topBottomY = topRect.bottom - containerRect.top - 2;

    const rackItems = topItem.querySelectorAll('[data-level="rack"]');
    let lastRackY = topBottomY;

    rackItems.forEach(rackItem => {
      const rackId = (rackItem as HTMLElement).dataset['id'];
      if (!rackId) return;

      const rackButton = rackItem.querySelector('.storage-nav-button');
      if (!rackButton) return;

      const rackRect = rackButton.getBoundingClientRect();
      const rackX = rackRect.left - containerRect.left + offset;
      const rackY = rackRect.top - containerRect.top + rackRect.height / 2 + VERTICAL_OFFSET;

      lastRackY = rackY;

      allLines.push({
        id: `rack-branch-${topId}-${rackId}`,
        x1: topX,
        y1: rackY,
        x2: rackX,
        y2: rackY,
        strokeWidth: 1.5,
        type: 'rack-branch',
      });

      const shouldShowBoxes = config.isRackExpanded ? config.isRackExpanded(topId, rackId) : true;

      if (shouldShowBoxes) {
        const boxItems = rackItem.querySelectorAll('[data-level="box"]');
        let lastBoxY = rackRect.bottom - containerRect.top;

        boxItems.forEach(boxItem => {
          const boxButton = boxItem.querySelector(
            '.storage-nav-button, [role="listitem"], [role="treeitem"]'
          );
          if (!boxButton) return;

          const boxRect = boxButton.getBoundingClientRect();
          const boxX = boxRect.left - containerRect.left + offset;
          const boxY = boxRect.top - containerRect.top + boxRect.height / 2 + VERTICAL_OFFSET;

          lastBoxY = boxY;

          allLines.push({
            id: `box-branch-${topId}-${rackId}-${(boxItem as HTMLElement).dataset['id']}`,
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
            id: `rack-vertical-${topId}-${rackId}`,
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
        id: `top-vertical-${topId}`,
        x1: topX,
        y1: topBottomY,
        x2: topX,
        y2: lastRackY,
        strokeWidth: 1.5,
        type: `${config.topLevelAttr}-vertical`,
      });
    }
  });

  return { container, lines: allLines };
}
