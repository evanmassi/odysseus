/**
 * Use Delayed Transition
 *
 * Lags the displayed value behind the input so consumers can play an exit animation before swapping.
 */

import { useEffect, useState } from 'react';

export interface DelayedTransition<T> {
  /** The value to render — lags `value` by `delayMs` whenever it changes. */
  displayed: T;
  /** True during the delay window. Apply exit-animation styles while true. */
  isTransitioning: boolean;
}

export function useDelayedTransition<T>(value: T, delayMs: number): DelayedTransition<T> {
  const [displayed, setDisplayed] = useState(value);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (value === displayed) return;
    setIsTransitioning(true);
    const timer = window.setTimeout(() => {
      setDisplayed(value);
      setIsTransitioning(false);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [value, displayed, delayMs]);

  return { displayed, isTransitioning };
}
