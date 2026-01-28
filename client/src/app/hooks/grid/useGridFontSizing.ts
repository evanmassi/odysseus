/**
 * Grid Font Sizing Hook
 *
 * Uses a callback ref to reliably attach a ResizeObserver the moment the grid
 * DOM element mounts — avoids the race condition where useRef + useEffect misses
 * elements that mount after a loading state.
 */

import { useState, useCallback, useRef } from 'react';

import type { GridConfiguration } from '@odysseus/shared-schemas';

export interface GridFontSizes {
  cellFont: number;
  donorFont: number;
  positionFont: number;
}

export interface UseGridFontSizingProps {
  gridConfig: GridConfiguration;
}

export interface UseGridFontSizingReturn {
  fontSize: GridFontSizes;
  /** Callback ref — pass directly to the grid element's ref prop. */
  gridRef: (node: HTMLDivElement | null) => void;
  /** Stable reference to the current grid DOM node for imperative access. */
  gridNode: HTMLDivElement | null;
}

function calculateFontSizes(
  container: HTMLDivElement,
  gridConfig: GridConfiguration
): GridFontSizes {
  const rect = container.getBoundingClientRect();
  const cellWidth = rect.width / gridConfig.cols;
  const cellHeight = rect.height / gridConfig.rows;
  const containerSize = Math.min(cellWidth, cellHeight);

  // Larger grids get proportionally smaller text
  const gridScale = Math.max(0.7, Math.min(1.0, 9 / Math.max(gridConfig.rows, gridConfig.cols)));
  const baseFontSize = Math.max(9, Math.min(16, containerSize * 0.14 * gridScale));

  return {
    cellFont: Math.round(baseFontSize),
    donorFont: Math.round(baseFontSize * 0.8),
    positionFont: Math.round(baseFontSize * 0.85),
  };
}

export function useGridFontSizing(props: UseGridFontSizingProps): UseGridFontSizingReturn {
  const { gridConfig } = props;

  const [fontSize, setFontSize] = useState<GridFontSizes>({
    cellFont: 10,
    donorFont: 8,
    positionFont: 8,
  });

  const observerRef = useRef<ResizeObserver | null>(null);
  const nodeRef = useRef<HTMLDivElement | null>(null);

  // Callback ref — React calls this with the DOM node on mount and null on unmount
  const gridRef = useCallback(
    (node: HTMLDivElement | null) => {
      // Clean up previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      nodeRef.current = node;

      if (!node) return;

      // Recalculate immediately with current dimensions
      setFontSize(calculateFontSizes(node, gridConfig));

      // Observe for any future size changes (window resize, sidebar toggle, etc.)
      observerRef.current = new ResizeObserver(() => {
        setFontSize(calculateFontSizes(node, gridConfig));
      });
      observerRef.current.observe(node);
    },
    [gridConfig]
  );

  return { fontSize, gridRef, gridNode: nodeRef.current };
}
