import { useCallback, useState } from 'react';

import { nameKey } from '../utils/formulas/boardCalculation';

export function useFollowedNames() {
  const [followed, setFollowed] = useState<ReadonlySet<string>>(() => new Set());
  const toggleFollowed = useCallback(
    (name: string) =>
      setFollowed(names => {
        const next = new Set(names);
        const key = nameKey(name);
        if (!next.delete(key)) next.add(key);
        return next;
      }),
    []
  );
  const clearFollowed = useCallback(() => setFollowed(new Set()), []);
  return { followed, toggleFollowed, clearFollowed };
}
