import { useMemo, useRef, type RefObject } from 'react';

import { useElementWidth } from './useElementWidth';

interface StableColumnsOptions<Item> {
  containerRef: RefObject<HTMLElement>;
  items: readonly Item[];
  keyOf: (item: Item) => string;
  weightOf: (item: Item) => number;
  minColumnWidth: number;
  gap: number;
}

export function useStableColumns<Item>({
  containerRef,
  items,
  keyOf,
  weightOf,
  minColumnWidth,
  gap,
}: StableColumnsOptions<Item>): Item[][] {
  const width = useElementWidth(containerRef);
  const count = Math.max(1, Math.floor((width + gap) / (minColumnWidth + gap)));
  const placed = useRef<{ count: number; columnOf: Map<string, number> }>({
    count,
    columnOf: new Map(),
  });

  return useMemo(() => {
    if (placed.current.count !== count) placed.current = { count, columnOf: new Map() };
    const { columnOf } = placed.current;
    const totals = Array.from({ length: count }, () => 0);
    for (const item of items) {
      const column = columnOf.get(keyOf(item));
      if (column !== undefined) totals[column] += weightOf(item);
    }
    for (const item of items) {
      if (columnOf.has(keyOf(item))) continue;
      const shortest = totals.indexOf(Math.min(...totals));
      columnOf.set(keyOf(item), shortest);
      totals[shortest] += weightOf(item);
    }
    const columns: Item[][] = Array.from({ length: count }, () => []);
    for (const item of items) columns[columnOf.get(keyOf(item)) ?? 0].push(item);
    return columns;
  }, [items, count, keyOf, weightOf]);
}
