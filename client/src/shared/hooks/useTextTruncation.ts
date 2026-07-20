/**
 * Shared Text Truncation Hook
 *
 * Provides truncation detection with a single shared ResizeObserver instance
 * instead of creating individual observers per component.
 */

import { useRef, useState, useEffect } from 'react';

type TruncationCallback = (isTruncated: boolean) => void;

// Singleton ResizeObserver shared across all hook instances
let sharedObserver: ResizeObserver | null = null;
const observedElements = new Map<Element, TruncationCallback>();

function getSharedObserver(): ResizeObserver {
  if (!sharedObserver) {
    sharedObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const callback = observedElements.get(entry.target);
        if (callback) {
          const element = entry.target as HTMLElement;
          const isTruncated = element.scrollWidth > element.clientWidth;
          callback(isTruncated);
        }
      }
    });
  }
  return sharedObserver;
}

function observeElement(element: Element, callback: TruncationCallback): void {
  observedElements.set(element, callback);
  getSharedObserver().observe(element);
}

function unobserveElement(element: Element): void {
  observedElements.delete(element);
  sharedObserver?.unobserve(element);

  if (observedElements.size === 0 && sharedObserver) {
    sharedObserver.disconnect();
    sharedObserver = null;
  }
}

/** Detects text truncation using a shared ResizeObserver. Pass dependencies that should trigger re-check. */
export function useTextTruncation<T extends HTMLElement = HTMLElement>(
  deps: React.DependencyList = []
): { ref: React.RefObject<T>; isTruncated: boolean } {
  const ref = useRef<T>(null) as React.RefObject<T>;
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const initialTruncated = element.scrollWidth > element.clientWidth;
    setIsTruncated(initialTruncated);

    observeElement(element, setIsTruncated);

    return () => {
      unobserveElement(element);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps is the caller-supplied dependency list
  }, [...deps]);

  return { ref, isTruncated };
}
