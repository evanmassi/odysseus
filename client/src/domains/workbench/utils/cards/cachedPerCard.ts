import { isDraft } from 'immer';

export function cachedPerCard<Card extends object, Result>(
  compute: (card: Card) => Result
): (card: Card) => Result {
  const cache = new WeakMap<Card, Result>();
  return card => {
    // PITFALL: an Immer draft keeps its identity while it is edited, so caching one would serve stale results.
    if (isDraft(card)) return compute(card);
    if (!cache.has(card)) cache.set(card, compute(card));
    return cache.get(card) as Result;
  };
}
