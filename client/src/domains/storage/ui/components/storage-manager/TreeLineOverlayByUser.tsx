import { useCallback, useEffect, useRef, useState } from 'react';

interface TreeLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeWidth: number;
  type: 'user-vertical' | 'rack-branch' | 'rack-vertical' | 'box-branch';
}

interface TreeLineOverlayByUserProps {
  expandedUsers: Set<string | null>;
}

// Visual alignment offset to position lines at the left edge of button content
const LINE_OFFSET = 11;
const VERTICAL_OFFSET = 0;

// Throttle/debounce timing constants for performance
const RESIZE_THROTTLE_MS = 100;
const MUTATION_DEBOUNCE_MS = 150;

/**
 * Tree Line Overlay for By User View
 *
 * Draws connecting lines for user -> rack -> box hierarchy in the
 * Assignments By User tab of the Storage Manager modal.
 */
export function TreeLineOverlayByUser({ expandedUsers }: TreeLineOverlayByUserProps) {
  const [lines, setLines] = useState<TreeLine[]>([]);
  const containerRef = useRef<Element | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastResizeRef = useRef<number>(0);

  const calculateAllLines = useCallback(() => {
    const container = document.querySelector('[role="tree"][data-view="by-user"]');
    if (!container) return;

    containerRef.current = container;
    const containerRect = container.getBoundingClientRect();
    const allLines: TreeLine[] = [];

    // Find all user items
    const userItems = container.querySelectorAll('[data-level="user"]');

    userItems.forEach(userItem => {
      const userId = (userItem as HTMLElement).dataset['id'] ?? 'unassigned';
      // Convert to the same format used in expandedUsers (null for unassigned, string for others)
      const expandKey = userId === 'unassigned' ? null : userId;
      if (!expandedUsers.has(expandKey)) return;

      const userButton = userItem.querySelector('button');
      if (!userButton) return;

      const userRect = userButton.getBoundingClientRect();
      const userX = userRect.left - containerRect.left + LINE_OFFSET;
      const userBottomY = userRect.bottom - containerRect.top - 2;

      // Find all racks under this user
      const rackItems = userItem.querySelectorAll('[data-level="rack"]');
      let lastRackY = userBottomY;

      rackItems.forEach(rackItem => {
        const rackButton = rackItem.querySelector('button');
        if (!rackButton) return;

        const rackRect = rackButton.getBoundingClientRect();
        const rackX = rackRect.left - containerRect.left + LINE_OFFSET;
        const rackY = rackRect.top - containerRect.top + rackRect.height / 2 + VERTICAL_OFFSET;

        // Track last rack's Y position for vertical line ending
        lastRackY = rackY;

        // Add horizontal branch from user to rack
        allLines.push({
          id: `rack-branch-${userId}-${(rackItem as HTMLElement).dataset['id']}`,
          x1: userX,
          y1: rackY,
          x2: rackX,
          y2: rackY,
          strokeWidth: 1.5,
          type: 'rack-branch',
        });

        // Find all boxes under this rack
        const boxItems = rackItem.querySelectorAll('[data-level="box"]');
        let lastBoxY = rackRect.bottom - containerRect.top;

        boxItems.forEach(boxItem => {
          const boxButton = boxItem.querySelector('button, [role="listitem"]');
          if (!boxButton) return;

          const boxRect = boxButton.getBoundingClientRect();
          const boxX = boxRect.left - containerRect.left + LINE_OFFSET;
          const boxY = boxRect.top - containerRect.top + boxRect.height / 2 + VERTICAL_OFFSET;

          // Track last box's Y position for vertical line ending
          lastBoxY = boxY;

          // Add horizontal branch from rack to box
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

        // Add vertical line connecting boxes under this rack
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

      // Add vertical line connecting racks under this user
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

    setLines(allLines);
  }, [expandedUsers]);

  // Debounced calculation using requestAnimationFrame for smooth updates
  const debouncedCalculate = useCallback(
    (delayMs: number) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        rafRef.current = requestAnimationFrame(() => {
          calculateAllLines();
        });
      }, delayMs);
    },
    [calculateAllLines]
  );

  // Throttled calculation for resize events
  const throttledCalculate = useCallback(() => {
    const now = Date.now();
    if (now - lastResizeRef.current >= RESIZE_THROTTLE_MS) {
      lastResizeRef.current = now;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        calculateAllLines();
      });
    }
  }, [calculateAllLines]);

  // Setup observers and initial calculation
  useEffect(() => {
    // Initial calculation with delay for DOM to settle
    const initialTimer = setTimeout(() => {
      calculateAllLines();
    }, 50);

    // Setup resize observer with throttling
    resizeObserverRef.current = new ResizeObserver(() => {
      throttledCalculate();
    });

    // Setup mutation observer with debouncing
    mutationObserverRef.current = new MutationObserver(() => {
      debouncedCalculate(MUTATION_DEBOUNCE_MS);
    });

    // Observe container after it's found
    const observeTimer = setTimeout(() => {
      if (containerRef.current) {
        resizeObserverRef.current?.observe(containerRef.current);
        mutationObserverRef.current?.observe(containerRef.current, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['data-state', 'class'],
        });
      }
    }, 100);

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(observeTimer);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      resizeObserverRef.current?.disconnect();
      mutationObserverRef.current?.disconnect();
    };
  }, [calculateAllLines, debouncedCalculate, throttledCalculate]);

  // Recalculate lines when expansion state changes
  useEffect(() => {
    // Wait for Radix Collapsible animation to complete, then use debounced calculate
    debouncedCalculate(300);
  }, [expandedUsers, debouncedCalculate]);

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
            stroke: var(--storage-nav-text-muted, #cbd5e1);
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
          strokeWidth={line.strokeWidth}
          opacity={0.6}
          className="tree-line"
        />
      ))}
    </svg>
  );
}
