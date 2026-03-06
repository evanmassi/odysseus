/**
 * Tree Line Calculation Hook
 *
 * Shared infrastructure for SVG tree-line overlays. Handles observer setup,
 * debounced/throttled recalculation, and cleanup. Consumers provide a
 * calculateLines callback with their specific DOM-walking logic.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface TreeLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeWidth: number;
  type: string;
}

export const LINE_OFFSET = 11;
export const VERTICAL_OFFSET = 0;

const RESIZE_THROTTLE_MS = 100;
const MUTATION_DEBOUNCE_MS = 150;

export function useTreeLines(
  calculateLines: () => { container: Element | null; lines: TreeLine[] }
) {
  const [lines, setLines] = useState<TreeLine[]>([]);
  const containerRef = useRef<Element | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastResizeRef = useRef<number>(0);

  const calculate = useCallback(() => {
    const result = calculateLines();
    containerRef.current = result.container;
    setLines(result.lines);
  }, [calculateLines]);

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
          calculate();
        });
      }, delayMs);
    },
    [calculate]
  );

  const throttledCalculate = useCallback(() => {
    const now = Date.now();
    if (now - lastResizeRef.current >= RESIZE_THROTTLE_MS) {
      lastResizeRef.current = now;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        calculate();
      });
    }
  }, [calculate]);

  useEffect(() => {
    const initialTimer = setTimeout(() => {
      calculate();
    }, 50);

    resizeObserverRef.current = new ResizeObserver(() => {
      throttledCalculate();
    });

    mutationObserverRef.current = new MutationObserver(() => {
      debouncedCalculate(MUTATION_DEBOUNCE_MS);
    });

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
  }, [calculate, debouncedCalculate, throttledCalculate]);

  // Recalculate after Radix Collapsible animation completes
  useEffect(() => {
    debouncedCalculate(300);
  }, [debouncedCalculate]);

  return lines;
}
