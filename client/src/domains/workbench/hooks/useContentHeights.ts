import { useLayoutEffect, useState, type RefObject } from 'react';

const MEASURED = '[data-measure-id]';

function readHeights(container: HTMLElement): Map<string, number> {
  const heights = new Map<string, number>();
  container.querySelectorAll<HTMLElement>(MEASURED).forEach(element => {
    heights.set(element.dataset['measureId'] ?? '', element.offsetHeight);
  });
  return heights;
}

const isSame = (a: ReadonlyMap<string, number>, b: ReadonlyMap<string, number>) =>
  a.size === b.size && [...a].every(([id, height]) => b.get(id) === height);

export function useContentHeights(
  containerRef: RefObject<HTMLElement>,
  contentKey: unknown
): ReadonlyMap<string, number> {
  const [heights, setHeights] = useState<ReadonlyMap<string, number>>(() => new Map());

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () =>
      setHeights(previous => {
        const next = readHeights(container);
        return isSame(previous, next) ? previous : next;
      });
    const observer = new ResizeObserver(update);
    container.querySelectorAll(MEASURED).forEach(element => observer.observe(element));
    update();
    return () => observer.disconnect();
  }, [containerRef, contentKey]);

  return heights;
}
