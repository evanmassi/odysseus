import { useCallback, useEffect, useRef, useState } from 'react';

export type TreeNodeTone = 'default' | 'full';

export interface TreeLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeWidth: number;
  startNode?: TreeNodeTone;
  endNode?: TreeNodeTone;
}

const RESIZE_THROTTLE_MS = 16;

interface UseTreeLinesOptions {
  initialDelay?: number;
}

export function useTreeLines(
  calculateLines: () => { container: Element | null; lines: TreeLine[] },
  options?: UseTreeLinesOptions
) {
  const { initialDelay = 0 } = options ?? {};

  const [lines, setLines] = useState<TreeLine[]>([]);
  const containerRef = useRef<Element | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastResizeRef = useRef<number>(0);
  const hasInitializedRef = useRef(false);
  const calculateRef = useRef(calculateLines);
  calculateRef.current = calculateLines;

  const calculate = useCallback(() => {
    const result = calculateLines();
    containerRef.current = result.container;
    setLines(result.lines);
  }, [calculateLines]);

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
    if (initialDelay > 0) {
      const timer = setTimeout(() => {
        requestAnimationFrame(() => {
          hasInitializedRef.current = true;
          const result = calculateRef.current();
          containerRef.current = result.container;
          setLines(result.lines);
        });
      }, initialDelay);
      return () => clearTimeout(timer);
    }

    hasInitializedRef.current = true;
    const raf = requestAnimationFrame(() => calculate());
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Runs once on mount; subsequent recalcs are handled by the effect below
  }, []);

  useEffect(() => {
    if (!hasInitializedRef.current) return;

    rafRef.current = requestAnimationFrame(() => {
      calculate();
    });
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [calculate]);

  useEffect(() => {
    resizeObserverRef.current = new ResizeObserver(() => {
      throttledCalculate();
    });

    mutationObserverRef.current = new MutationObserver(() => {
      throttledCalculate();
    });

    const observeTimer = requestAnimationFrame(() => {
      if (containerRef.current) {
        resizeObserverRef.current?.observe(containerRef.current);
        mutationObserverRef.current?.observe(containerRef.current, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['data-state', 'class'],
        });
      }
    });

    return () => {
      cancelAnimationFrame(observeTimer);
      resizeObserverRef.current?.disconnect();
      mutationObserverRef.current?.disconnect();
    };
  }, [throttledCalculate]);

  return lines;
}
