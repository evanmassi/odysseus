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

export function cachedPerCardWith<Card extends object, With extends object, Result>(
  compute: (card: Card, extra: With) => Result
): (card: Card, extra: With) => Result {
  const cache = new WeakMap<Card, WeakMap<With, Result>>();
  return (card, extra) => {
    if (isDraft(card) || isDraft(extra)) return compute(card, extra);
    const byExtra = cache.get(card) ?? new WeakMap<With, Result>();
    cache.set(card, byExtra);
    if (!byExtra.has(extra)) byExtra.set(extra, compute(card, extra));
    return byExtra.get(extra) as Result;
  };
}
