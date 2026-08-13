/**
 * Demo Item Lock Hook
 *
 * Predicate for catalog records, mirroring storage's isResourceLocked without a caller-supplied flag.
 */

import { useCallback } from 'react';

import { useIsDemo } from '@domains/authentication';
import { isDemoLocked } from '@shared/utils/isDemoLocked';

export function useDemoItemLock(): (item: { isSeeded?: boolean }) => boolean {
  const isDemo = useIsDemo();

  return useCallback((item: { isSeeded?: boolean }) => isDemoLocked(isDemo, item), [isDemo]);
}
