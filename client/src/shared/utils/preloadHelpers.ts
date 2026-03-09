/**
 * Preload Helpers
 *
 * Utilities for anticipatory loading of lazy-loaded components.
 */

import { useCallback, useState, useMemo } from 'react';

import { logger } from '@infra/logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic default for flexible component types
export function createPreloadHook<T = any>(importFn: () => Promise<T>) {
  return function usePreload() {
    const [isPreloaded, setIsPreloaded] = useState(false);

    const preload = useCallback(async () => {
      if (isPreloaded) return;

      try {
        await importFn();
        setIsPreloaded(true);
      } catch (error) {
        // Failed preloads fall back to normal lazy loading on render
        logger.warn('[PreloadHelpers] Preload failed, will lazy load on render', { error });
      }
    }, [isPreloaded]);

    const triggerProps = useMemo(
      () => ({
        onMouseEnter: preload,
        onFocus: preload,
      }),
      [preload]
    );

    return { preload, triggerProps, isPreloaded };
  };
}
