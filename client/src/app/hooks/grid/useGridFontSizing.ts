/**
 * useGridFontSizing Hook
 *
 * Dynamic font size calculation based on grid dimensions and configuration.
 * Extracted from TubeGrid for reusability and testability.
 * Includes debounced resize handling for performance.
 */

import { useState, useEffect, type RefObject } from 'react';

import type { GridConfiguration } from '@odysseus/shared-schemas';

/**
 * Grid Font Sizes Interface
 */
export interface GridFontSizes {
  cellFont: number;
  donorFont: number;
  positionFont: number;
}

/**
 * Hook Props Interface
 */
export interface UseGridFontSizingProps {
  gridRef: RefObject<HTMLDivElement>;
  gridConfig: GridConfiguration;
}

/**
 * Hook Return Interface
 */
export interface UseGridFontSizingReturn {
  fontSize: GridFontSizes;
}

/**
 * Custom hook for dynamic grid font sizing
 *
 * Calculates optimal font sizes based on:
 * - Grid container dimensions
 * - Grid configuration (rows/cols)
 * - Responsive viewport changes
 *
 * Features:
 * - Automatic recalculation on resize (debounced)
 * - Scales appropriately for different grid sizes
 * - Maintains readable text at all sizes
 *
 * @param props - Grid ref and configuration
 * @returns Font sizes for different grid elements
 */
export function useGridFontSizing(
  props: UseGridFontSizingProps
): UseGridFontSizingReturn {
  const { gridRef, gridConfig } = props;

  const [fontSize, setFontSize] = useState<GridFontSizes>({
    cellFont: 10,
    donorFont: 8,
    positionFont: 8
  });

  /**
   * Calculate font sizes for all grid positions
   */
  useEffect(() => {
    const calculateFontSizes = () => {
      if (!gridRef.current) return;

      // Get grid container dimensions
      const rect = gridRef.current.getBoundingClientRect();
      const containerWidth = rect.width;
      const containerHeight = rect.height;

      // Calculate approximate cell size
      const cellWidth = containerWidth / gridConfig.cols;
      const cellHeight = containerHeight / gridConfig.rows;
      const containerSize = Math.min(cellWidth, cellHeight);

      // Base scaling factor from grid configuration (larger grids = smaller text)
      const gridScale = Math.max(0.7, Math.min(1.0, 9 / Math.max(gridConfig.rows, gridConfig.cols)));

      // Calculate font sizes based on container size and grid scale
      const baseFontSize = Math.max(9, Math.min(16, containerSize * 0.14 * gridScale));

      setFontSize({
        cellFont: Math.round(baseFontSize),
        donorFont: Math.round(baseFontSize * 0.8),
        positionFont: Math.round(baseFontSize * 0.85)
      });
    };

    calculateFontSizes();

    // Recalculate on window resize (debounced)
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(calculateFontSizes, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [gridRef, gridConfig.rows, gridConfig.cols]);

  return {
    fontSize
  };
}
