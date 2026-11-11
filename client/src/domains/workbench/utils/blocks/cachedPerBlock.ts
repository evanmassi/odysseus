import { isDraft } from 'immer';

export function cachedPerBlock<Block extends object, Result>(
  compute: (block: Block) => Result
): (block: Block) => Result {
  const cache = new WeakMap<Block, Result>();
  return block => {
    // PITFALL: an Immer draft keeps its identity while it is edited, so caching one would serve stale results.
    if (isDraft(block)) return compute(block);
    if (!cache.has(block)) cache.set(block, compute(block));
    return cache.get(block) as Result;
  };
}
