import type { TreeLine } from './useTreeLines';

interface TreeLineCalcConfig {
  containerSelector: string;
  topLevelAttr: string;
  isTopExpanded: (id: string) => boolean;
  isRackExpanded?: (topId: string, rackId: string) => boolean;
  midLevelAttr?: string;
  leafLevelAttr?: string;
  rowSelector?: string;
  leafRowSelector?: string;
}

const STROKE_WIDTH = 1.5;
const LINE_OFFSET = 1;

const snapToPixelCenter = (value: number) => Math.floor(value) + 0.5;

export function calculateTreeLines(config: TreeLineCalcConfig): {
  container: Element | null;
  lines: TreeLine[];
} {
  const container = document.querySelector(config.containerSelector);
  if (!container) return { container: null, lines: [] };

  const containerRect = container.getBoundingClientRect();
  const midAttr = config.midLevelAttr ?? 'rack';
  const leafAttr = config.leafLevelAttr ?? 'box';
  const rowSelector = config.rowSelector ?? '.storage-nav-button';
  const leafRowSelector =
    config.leafRowSelector ?? '.storage-nav-button, [role="listitem"], [role="treeitem"]';
  const allLines: TreeLine[] = [];

  const junctionX = (rect: DOMRect) =>
    snapToPixelCenter(rect.left - containerRect.left + LINE_OFFSET);
  const centerY = (rect: DOMRect) =>
    snapToPixelCenter(rect.top - containerRect.top + rect.height / 2);

  const topItems = container.querySelectorAll(`[data-level="${config.topLevelAttr}"]`);

  topItems.forEach(topItem => {
    const topId = (topItem as HTMLElement).dataset['id'] ?? 'unassigned';
    if (!config.isTopExpanded(topId)) return;

    const topButton = topItem.querySelector(rowSelector);
    if (!topButton) return;

    const topRect = topButton.getBoundingClientRect();
    const topX = junctionX(topRect);
    const topY = centerY(topRect);

    const rackItems = topItem.querySelectorAll(`[data-level="${midAttr}"]`);
    let lastRackY = topY;

    rackItems.forEach(rackItem => {
      const rackId = (rackItem as HTMLElement).dataset['id'];
      if (!rackId) return;

      const rackButton = rackItem.querySelector(rowSelector);
      if (!rackButton) return;

      const rackRect = rackButton.getBoundingClientRect();
      const rackX = junctionX(rackRect);
      const rackY = centerY(rackRect);

      lastRackY = rackY;

      allLines.push({
        id: `rack-branch-${topId}-${rackId}`,
        x1: topX,
        y1: rackY,
        x2: rackX,
        y2: rackY,
        strokeWidth: STROKE_WIDTH,
        endNode: 'default',
      });

      const shouldShowBoxes = config.isRackExpanded ? config.isRackExpanded(topId, rackId) : true;

      if (shouldShowBoxes) {
        const boxItems = rackItem.querySelectorAll(`[data-level="${leafAttr}"]`);
        let lastBoxY = rackY;

        boxItems.forEach(boxItem => {
          const boxButton = boxItem.querySelector(leafRowSelector);
          if (!boxButton) return;

          const boxRect = boxButton.getBoundingClientRect();
          const boxX = junctionX(boxRect);
          const boxY = centerY(boxRect);

          lastBoxY = boxY;

          allLines.push({
            id: `box-branch-${topId}-${rackId}-${(boxItem as HTMLElement).dataset['id']}`,
            x1: rackX,
            y1: boxY,
            x2: boxX,
            y2: boxY,
            strokeWidth: STROKE_WIDTH,
            endNode: boxButton.hasAttribute('data-full') ? 'full' : 'default',
          });
        });

        if (boxItems.length > 0) {
          allLines.push({
            id: `rack-vertical-${topId}-${rackId}`,
            x1: rackX,
            y1: rackY,
            x2: rackX,
            y2: lastBoxY,
            strokeWidth: STROKE_WIDTH,
          });
        }
      }
    });

    if (rackItems.length > 0) {
      allLines.push({
        id: `top-vertical-${topId}`,
        x1: topX,
        y1: topY,
        x2: topX,
        y2: lastRackY,
        strokeWidth: STROKE_WIDTH,
        startNode: 'default',
      });
    }
  });

  return { container, lines: allLines };
}
