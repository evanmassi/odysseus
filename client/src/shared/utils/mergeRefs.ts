/**
 * Merge Refs
 *
 * Combines multiple React refs into a single callback ref.
 */

import type { Ref, RefCallback, MutableRefObject } from 'react';

export function mergeRefs<T>(...refs: Ref<T>[]): RefCallback<T> {
  return (value: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref != null) {
        (ref as MutableRefObject<T | null>).current = value;
      }
    }
  };
}
