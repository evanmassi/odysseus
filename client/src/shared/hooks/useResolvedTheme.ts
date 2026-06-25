/**
 * Resolved Theme
 *
 * Reads the app's active theme straight from the document root (`<html data-theme>`),
 * independent of any local theme scope. Lets popovers/menus that may render inside a
 * forced-theme island (e.g. the dark header) still follow the global light/dark choice.
 */

import { useSyncExternalStore } from 'react';

import type { ResolvedTheme } from '@odysseus/shared-schemas';

function getSnapshot(): ResolvedTheme {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  return () => observer.disconnect();
}

export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'light');
}
