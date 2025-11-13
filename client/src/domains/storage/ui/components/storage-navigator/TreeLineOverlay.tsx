import { useCallback, useEffect, useState } from 'react';

interface TreeLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeWidth: number;
  color: string;
  type: 'tank-vertical' | 'rack-branch' | 'rack-vertical' | 'box-branch';
}

interface TreeLineOverlayProps {
  expandedTanks: Set<string>;
  expandedRacks: Set<string>;
}

// Visual alignment offset to position lines at the bottom-left corner of button content
// Accounts for border (1px) + left padding (~10px) to align with icon/chevron
const LINE_OFFSET = 12;

export function TreeLineOverlay({ expandedTanks, expandedRacks }: TreeLineOverlayProps) {
  const [lines, setLines] = useState<TreeLine[]>([]);

  const calculateAllLines = useCallback(() => {
    const container = document.querySelector('[role="tree"]');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const allLines: TreeLine[] = [];

    // Find all tank items
    const tankItems = container.querySelectorAll('[data-level="tank"]');

    tankItems.forEach(tankItem => {
      const tankId = (tankItem as HTMLElement).dataset['id'];
      if (!tankId || !expandedTanks.has(tankId)) return;

      const tankButton = tankItem.querySelector('button');
      if (!tankButton) return;

      const tankRect = tankButton.getBoundingClientRect();
      const tankX = tankRect.left - containerRect.left + LINE_OFFSET;
      const tankBottomY = tankRect.bottom - containerRect.top - 2;

      // Find all racks under this tank
      const rackItems = tankItem.querySelectorAll('[data-level="rack"]');
      let deepestY = tankBottomY;
      let lastRackY = tankBottomY;

      rackItems.forEach(rackItem => {
        const rackId = (rackItem as HTMLElement).dataset['id'];
        if (!rackId) return;

        const rackButton = rackItem.querySelector('button');
        if (!rackButton) return;

        const rackRect = rackButton.getBoundingClientRect();
        const rackX = rackRect.left - containerRect.left + LINE_OFFSET;
        const rackY = rackRect.top - containerRect.top + rackRect.height / 2;

        // Track last rack's Y position for vertical line ending
        lastRackY = rackY;

        // Add horizontal branch from tank to rack
        allLines.push({
          id: `rack-branch-${tankId}-${rackId}`,
          x1: tankX,
          y1: rackY,
          x2: rackX,
          y2: rackY,
          strokeWidth: 3,
          color: 'var(--color-storage-tank-bg)',
          type: 'rack-branch',
        });

        deepestY = Math.max(deepestY, rackRect.bottom - containerRect.top);

        // Handle boxes if rack is expanded (using composite key)
        const compositeKey = `${tankId}-${rackId}`;
        if (expandedRacks.has(compositeKey)) {
          const boxItems = rackItem.querySelectorAll('[data-level="box"]');
          let deepestBoxY = rackRect.bottom - containerRect.top;
          let lastBoxY = rackRect.bottom - containerRect.top;

          boxItems.forEach(boxItem => {
            const boxButton = boxItem.querySelector('button');
            if (!boxButton) return;

            const boxRect = boxButton.getBoundingClientRect();
            const boxX = boxRect.left - containerRect.left + LINE_OFFSET;
            const boxY = boxRect.top - containerRect.top + boxRect.height / 2;

            // Track last box's Y position for vertical line ending
            lastBoxY = boxY;

            // Add horizontal branch from rack to box
            allLines.push({
              id: `box-branch-${tankId}-${rackId}-${(boxItem as HTMLElement).dataset['id']}`,
              x1: rackX,
              y1: boxY,
              x2: boxX,
              y2: boxY,
              strokeWidth: 2,
              color: 'var(--color-storage-rack-bg)',
              type: 'box-branch',
            });

            deepestBoxY = Math.max(deepestBoxY, boxRect.bottom - containerRect.top);
          });

          // Add vertical line connecting boxes under this rack
          if (boxItems.length > 0) {
            allLines.push({
              id: `rack-vertical-${tankId}-${rackId}`,
              x1: rackX,
              y1: rackRect.bottom - containerRect.top - 2,
              x2: rackX,
              y2: lastBoxY,
              strokeWidth: 2,
              color: 'var(--color-storage-rack-bg)',
              type: 'rack-vertical',
            });
          }

          deepestY = Math.max(deepestY, deepestBoxY);
        }
      });

      // Add vertical line connecting racks under this tank
      if (rackItems.length > 0) {
        allLines.push({
          id: `tank-vertical-${tankId}`,
          x1: tankX,
          y1: tankBottomY,
          x2: tankX,
          y2: lastRackY,
          strokeWidth: 3,
          color: 'var(--color-storage-tank-bg)',
          type: 'tank-vertical',
        });
      }
    });

    setLines(allLines);
  }, [expandedTanks, expandedRacks]);

  // Recalculate lines when expansion state changes
  useEffect(() => {
    // Wait for Radix Collapsible animation to complete
    const timer = setTimeout(() => {
      calculateAllLines();
    }, 350);

    return () => clearTimeout(timer);
  }, [expandedTanks, expandedRacks, calculateAllLines]);

  if (lines.length === 0) return null;

  return (
    <svg
      className="tree-line-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <style>
        {`
          .tree-line {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
        `}
      </style>

      {lines.map(line => (
        <line
          key={line.id}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={line.color}
          strokeWidth={line.strokeWidth}
          opacity={0.5}
          className="tree-line"
        />
      ))}
    </svg>
  );
}
