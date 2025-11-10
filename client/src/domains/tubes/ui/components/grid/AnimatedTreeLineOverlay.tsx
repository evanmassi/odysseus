import { useEffect, useState } from 'react';

import { useStorageStore } from '@domains/storage';

interface AnimatedTreeLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  strokeWidth: number;
  type: 'tank-vertical' | 'rack-branch' | 'rack-vertical' | 'box-branch';
  retracted?: boolean; // For coordinate-based retraction
}

interface AnimatedTreeLineOverlayProps {
  expandedTanks: Set<string>;
  expandedRacks: Set<string>;
}

const LINE_OFFSET = 8; // Distance into button for connection point

export function AnimatedTreeLineOverlay({
  expandedTanks,
  expandedRacks
}: AnimatedTreeLineOverlayProps) {
  const [lines, setLines] = useState<AnimatedTreeLine[]>([]);

  // Get configuration methods
  const getCurrentTanks = useStorageStore(state => state.getCurrentTanks);
  const getCurrentRacks = useStorageStore(state => state.getCurrentRacks);
  const getCurrentBoxes = useStorageStore(state => state.getCurrentBoxes);

  const tanks = getCurrentTanks();

  // Calculate all lines at once - CSS transitions handle the animation
  const calculateAllLines = () => {
    const container = document.querySelector('.storage-navigator');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const allLines: AnimatedTreeLine[] = [];

    tanks.forEach(tank => {
      const tankId = tank.id;
      if (!expandedTanks.has(tankId)) return;

      const tankButton = container.querySelector(`[data-tank-id="${tankId}"] .tank-button`) as HTMLElement;
      if (!tankButton) return;

      const tankRect = tankButton.getBoundingClientRect();
      const tankX = tankRect.left - containerRect.left + LINE_OFFSET;
      const tankBottomY = tankRect.bottom - containerRect.top;

      const rackElements = container.querySelectorAll(`[data-tank-id="${tankId}"] [data-rack-id]`);
      let deepestY = tankBottomY;

      rackElements.forEach(rackElement => {
        const rackId = (rackElement as HTMLElement).dataset['rackId'];
        if (!rackId) return;

        const rackButton = rackElement.querySelector('.rack-button') as HTMLElement;
        if (!rackButton) return;

        const rackRect = rackButton.getBoundingClientRect();
        const rackX = rackRect.left - containerRect.left + LINE_OFFSET;
        const rackY = rackRect.top - containerRect.top + rackRect.height / 2;

        // Add rack horizontal branch
        allLines.push({
          id: `rack-branch-${tankId}-${rackId}`,
          x1: tankX,
          y1: rackY,
          x2: rackX,
          y2: rackY,
          color: '#5987b6', // Tank color - matches tank button
          strokeWidth: 3,
          type: 'rack-branch'
        });

        deepestY = Math.max(deepestY, rackRect.bottom - containerRect.top);

        // Handle boxes if rack is expanded
        const rackKey = `${tankId}-${rackId}`;
        if (expandedRacks.has(rackKey)) {
          const boxElements = rackElement.querySelectorAll('.box-button');
          let deepestBoxY = rackRect.bottom - containerRect.top;

          boxElements.forEach((boxElement, boxIndex) => {
            const boxRect = boxElement.getBoundingClientRect();
            const boxX = boxRect.left - containerRect.left + LINE_OFFSET;
            const boxY = boxRect.top - containerRect.top + boxRect.height / 2;

            allLines.push({
              id: `box-branch-${tankId}-${rackId}-${boxIndex}`,
              x1: rackX,
              y1: boxY,
              x2: boxX,
              y2: boxY,
              color: '#7a9fc5', // Rack color - matches rack button
              strokeWidth: 1,
              type: 'box-branch'
            });

            deepestBoxY = Math.max(deepestBoxY, boxRect.bottom - containerRect.top);
          });

          if (boxElements.length > 0) {
            allLines.push({
              id: `rack-vertical-${tankId}-${rackId}`,
              x1: rackX,
              y1: rackRect.bottom - containerRect.top,
              x2: rackX,
              y2: deepestBoxY,
              color: '#7a9fc5', // Rack color - matches rack button
              strokeWidth: 1,
              type: 'rack-vertical'
            });
          }

          deepestY = Math.max(deepestY, deepestBoxY);
        }
      });

      // Add tank vertical line
      allLines.push({
        id: `tank-vertical-${tankId}`,
        x1: tankX,
        y1: tankBottomY,
        x2: tankX,
        y2: deepestY,
        color: '#5987b6', // Tank color - matches tank button
        strokeWidth: 3,
        type: 'tank-vertical'
      });
    });

    setLines(allLines);
  };

  // Update lines when expansion state changes
  useEffect(() => {
    // Wait for animations to complete (350ms animation + 25ms buffer)
    const timer = setTimeout(() => {
      calculateAllLines();
    }, 375);

    return () => clearTimeout(timer);
  }, [expandedTanks, expandedRacks, tanks]);

  if (lines.length === 0) return null;

  return (
    <svg
      className="animated-tree-line-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0
      }}
    >
      <style>
        {`
          .animated-tree-line {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
        `}
      </style>
      
      {lines.map((line) => (
        <line
          key={line.id}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={line.color}
          strokeWidth={line.strokeWidth}
          opacity={0.75}
          className="animated-tree-line"
        />
      ))}
    </svg>
  );
}
