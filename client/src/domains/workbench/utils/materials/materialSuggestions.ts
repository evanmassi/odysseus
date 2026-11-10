import { CONJUGATE_NAMES, VENDOR_NAMES } from './materialGuesser';

import type { Protocol } from '@odysseus/shared-schemas';

const SUGGESTION_LIMIT = 8;
const BUILT_IN_SUGGESTIONS: Readonly<Record<string, readonly string[]>> = {
  vendor: VENDOR_NAMES,
  manufacturer: VENDOR_NAMES,
  conjugate: CONJUGATE_NAMES,
};

export function fieldSuggestions(
  protocol: Pick<Protocol, 'blocks'>,
  key: string,
  typed: string,
  exceptItemId: string
): string[] {
  const counts = new Map<string, number>();
  for (const block of protocol.blocks) {
    if (block.type !== 'materials') continue;
    for (const item of block.items) {
      const value = (item.values[key] ?? '').trim();
      if (value && item.id !== exceptItemId) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  const query = typed.trim().toLowerCase();
  const used = [...counts].sort((x, y) => y[1] - x[1]).map(([value]) => value);
  const pool = [...new Set([...used, ...(BUILT_IN_SUGGESTIONS[key] ?? [])])].filter(
    value => value.toLowerCase() !== query
  );
  const starting = pool.filter(value => value.toLowerCase().startsWith(query));
  const containing = pool.filter(
    value => !starting.includes(value) && value.toLowerCase().includes(query)
  );
  return [...starting, ...containing].slice(0, SUGGESTION_LIMIT);
}
