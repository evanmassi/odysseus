/**
 * Merged Ref Hook
 *
 * Fans one node out to several refs, letting a component expose its node to a
 * forwarded ref while also keeping a local ref for internal reads.
 */

import { useCallback } from 'react';
import type { ForwardedRef, MutableRefObject, RefCallback } from 'react';

type MergeableRef<T> = ForwardedRef<T> | MutableRefObject<T | null> | null | undefined;

export function useMergedRef<T>(...refs: MergeableRef<T>[]): RefCallback<T> {
  return useCallback((node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, refs);
}
