import { useRef } from 'react';

import { replaceEqualDeep } from '@tanstack/react-query';

export function useStructuralSharing<Value>(next: Value): Value {
  const kept = useRef(next);
  kept.current = replaceEqualDeep(kept.current, next);
  return kept.current;
}
